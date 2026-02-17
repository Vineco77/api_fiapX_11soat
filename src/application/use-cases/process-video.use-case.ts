import { inject, injectable } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';
import type { IVideoRepository } from '@/domain/repositories/video.repository.interface';
import type { IQueueRepository } from '@/domain/repositories/queue.interface';
import type {
  IS3StorageService,
  UploadedFile,
} from '@/domain/repositories/s3-storage.interface';
import { ProcessVideoResponseDTO } from '@/domain/dtos/process-video-response.dto';
import { VideoProcessingMessageDTO } from '@/domain/dtos';
import {
  buildInputPath,
  buildOutputPath,
  buildVideoFilePath,
  sanitizeFilename,
  isVideoFile,
} from '@/infrastructure/storage/s3-path.helper';
import { appConfig } from '@/infrastructure/config/env';
import {
  ValidationError,
  InvalidFileError,
  LimitExceededError,
  QueueUnavailableError,
} from '@/infrastructure/middlewares/errors';
import { logger } from '@/infrastructure/monitoring/logger.service';

export interface ProcessVideoInput {
  files: UploadedFile[];
  framesPerSecond: number;
  format: string;
  clientId: string;
  email: string;
}

@injectable()
export class ProcessVideoUseCase {
  constructor(
    @inject('VideoRepository')
    private readonly videoRepository: IVideoRepository,
    @inject('S3StorageService')
    private readonly s3Storage: IS3StorageService,
    @inject('QueueRepository')
    private readonly queueRepository: IQueueRepository
  ) {}

  async execute(input: ProcessVideoInput): Promise<ProcessVideoResponseDTO> {
    this.validateInput(input);

    const jobId = uuidv4();
    const traceId = jobId;
    
    logger.info({
      traceId,
      tag: 'process-video.use-case',
      jobId,
      msg: 'processVideoUseCase_001'
    });

    try {
      const totalSize = this.calculateTotalSize(input.files);
      logger.info({
        traceId,
        tag: 'process-video.use-case',
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        msg: 'processVideoUseCase_002'
      });

      const uploadTasks = input.files.map((file) => {
        const sanitizedFilename = sanitizeFilename(file.originalname);
        const s3Key = buildVideoFilePath(input.email, jobId, sanitizedFilename);

        return {
          buffer: file.buffer,
          key: s3Key,
          contentType: file.mimetype,
        };
      });

      logger.info({
        traceId,
        tag: 'process-video.use-case',
        filesCount: input.files.length,
        msg: 'processVideoUseCase_003'
      });
      await this.s3Storage.uploadMultipleFiles(uploadTasks);

      const expirationSeconds =
        appConfig.limits.signedUrlExpirationDays * 24 * 60 * 60;

      const [inputUrlStorage, outputUrlStorage] = await Promise.all([
        this.s3Storage.getSignedUrl(
          buildInputPath(input.email, jobId),
          expirationSeconds
        ),
        this.s3Storage.getSignedUrl(
          buildOutputPath(input.email, jobId),
          expirationSeconds
        ),
      ]);

      logger.info({
        traceId,
        tag: 'process-video.use-case',
        inputUrlStorage,
        outputUrlStorage,
        msg: 'processVideoUseCase_004'
      });

      await this.videoRepository.create({
        jobId,
        clientId: input.clientId,
        email: input.email,
        framesPerSecond: input.framesPerSecond,
        inputUrlStorage,
        outputUrlStorage,
        size: BigInt(totalSize),
        format: input.format,
      });

      try {
        const message: VideoProcessingMessageDTO = {
          jobId,
          clientId: input.clientId,
          inputUrlStorage,
          outputUrlStorage,
          framesPerSecond: input.framesPerSecond,
          format: input.format,
        };

        await this.queueRepository.publishVideoProcessing(message);
        logger.info({
          traceId,
          tag: 'process-video.use-case',
          msg: 'processVideoUseCase_005'
        });
      } catch (queueError) {
        logger.error({
          traceId,
          tag: 'process-video.use-case',
          errorMessage: queueError instanceof Error ? queueError.message : 'Unknown error',
          msg: 'processVideoUseCase_006'
        });
        
        const errorMessage = queueError instanceof Error ? queueError.message : 'Unknown error';
        await this.videoRepository.updateStatus(
          jobId,
          'FAILED',
          `RabbitMQ unavailable: ${errorMessage}`
        );

        throw new QueueUnavailableError(
          'Failed to enqueue video processing. Please try again later.'
        );
      }

      logger.info({
        traceId,
        tag: 'process-video.use-case',
        msg: 'processVideoUseCase_007'
      });

      return new ProcessVideoResponseDTO(jobId, input.files.length);
    } catch (error) {
      logger.error({
        traceId,
        tag: 'process-video.use-case',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        msg: 'processVideoUseCase_008'
      });
      throw new Error(
        `Failed to process videos: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      this.cleanupBuffers(input.files, traceId);
    }
  }

  private validateInput(input: ProcessVideoInput): void {
    if (!input.files || input.files.length === 0) {
      throw new ValidationError('At least one video file is required');
    }

    if (input.files.length > appConfig.limits.maxVideosPerRequest) {
      throw new LimitExceededError(
        'Videos per request',
        appConfig.limits.maxVideosPerRequest
      );
    }

    const invalidFiles = input.files.filter(
      (file) => !isVideoFile(file.mimetype)
    );

    if (invalidFiles.length > 0) {
      throw new InvalidFileError(
        `Only video files are allowed. Invalid: ${invalidFiles.map((f) => f.originalname).join(', ')}`
      );
    }

    const maxSizeBytes = appConfig.limits.maxFileSizeMB * 1024 * 1024;
    const oversizedFiles = input.files.filter(
      (file) => file.size > maxSizeBytes
    );

    if (oversizedFiles.length > 0) {
      throw new LimitExceededError(
        `File size (${appConfig.limits.maxFileSizeMB}MB)`,
        oversizedFiles.length
      );
    }

    if (
      input.framesPerSecond < 1 ||
      input.framesPerSecond > appConfig.limits.maxFps
    ) {
      throw new ValidationError(
        `framesPerSecond must be between 1 and ${appConfig.limits.maxFps}`
      );
    }

    const validFormats = ['jpg', 'png'];
    if (!validFormats.includes(input.format.toLowerCase())) {
      throw new ValidationError(
        `Invalid format. Allowed formats: ${validFormats.join(', ')}`
      );
    }
  }

  private calculateTotalSize(files: UploadedFile[]): number {
    return files.reduce((total, file) => total + file.size, 0);
  }

  private cleanupBuffers(files: UploadedFile[], traceId: string): void {
    try {
      const totalSizeMB = this.calculateTotalSize(files) / (1024 * 1024);
      
      files.forEach((file) => {
        if (file.buffer) {
          file.buffer = Buffer.alloc(0); // Substitui por buffer vazio
        }
      });

      if (globalThis.gc) {
        globalThis.gc();
        logger.info({
          traceId,
          tag: 'process-video.use-case',
          totalSizeMB: totalSizeMB.toFixed(2),
          gcForced: true,
          msg: 'processVideoUseCase_009'
        });
      } else {
        logger.info({
          traceId,
          tag: 'process-video.use-case',
          totalSizeMB: totalSizeMB.toFixed(2),
          gcForced: false,
          msg: 'processVideoUseCase_010'
        });
      }
    } catch (cleanupError) {
      logger.warn({
        traceId,
        tag: 'process-video.use-case',
        errorMessage: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        msg: 'processVideoUseCase_011'
      });
    }
  }
}
