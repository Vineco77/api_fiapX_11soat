import { inject, injectable } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';
import { VideoStatus } from '@prisma/client';
import type { IVideoRepository } from '@/domain/repositories/video.repository.interface';
import type { IProcessamentoRepository } from '@/domain/repositories/processamento.repository.interface';
import type { IQueueRepository } from '@/domain/repositories/queue.interface';
import type {
  IS3StorageService,
  UploadedFile,
} from '@/domain/repositories/s3-storage.interface';
import { ProcessVideoResponseDTO } from '@/domain/dtos/process-video-response.dto';
import {
  VideoProcessingMessageDTO,
  VideoProcessingItemDTO,
  PersonDTO,
} from '@/domain/dtos';
import {
  buildVideoInputPath,
  buildVideoOutputPath,
  buildVideoFilePath,
  sanitizeFilename,
  isVideoFile,
  getFileExtension,
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
  name?: string;
}

@injectable()
export class ProcessVideoUseCase {
  constructor(
    @inject('ProcessamentoRepository')
    private readonly processamentoRepository: IProcessamentoRepository,
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
      email: input.email,
      filesCount: input.files.length,
      msg: 'Starting video processing'
    });

    try {
      const totalSize = this.calculateTotalSize(input.files);
      logger.info({
        traceId,
        tag: 'process-video.use-case',
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        msg: 'Calculated total size'
      });

      const processamento = await this.processamentoRepository.create({
        jobId,
        clientId: input.clientId,
        email: input.email,
        framesPerSecond: input.framesPerSecond,
        format: input.format,
        size: BigInt(totalSize),
      });

      logger.info({
        traceId,
        tag: 'process-video.use-case',
        processamentoId: processamento.id,
        msg: 'Processamento created'
      });

      const videos: VideoProcessingItemDTO[] = [];

      for (const file of input.files) {
        const videoId = uuidv4();
        const sanitizedFilename = sanitizeFilename(file.originalname);
        const fileExtension = getFileExtension(file.originalname);

        const s3Key = buildVideoFilePath(
          input.email,
          jobId,
          videoId,
          sanitizedFilename
        );

        logger.info({
          traceId,
          tag: 'process-video.use-case',
          videoId,
          filename: sanitizedFilename,
          s3Key,
          msg: 'Uploading video to S3'
        });

        await this.s3Storage.uploadFile(file.buffer, s3Key, file.mimetype);

        const expirationSeconds =
          appConfig.limits.signedUrlExpirationDays * 24 * 60 * 60;

        const inputPath = buildVideoInputPath(input.email, jobId, videoId);
        const outputPath = buildVideoOutputPath(input.email, jobId, videoId);

        const [inputUrlStorage, outputUrlStorage] = await Promise.all([
          this.s3Storage.getSignedUrl(inputPath, expirationSeconds),
          this.s3Storage.getSignedUrl(outputPath, expirationSeconds),
        ]);

        const createdVideo = await this.videoRepository.create({
          id: videoId,
          fileName: sanitizedFilename,
          fileFormat: fileExtension,
          processamentoId: processamento.id,
          inputUrlStorage,
          outputUrlStorage,
          size: BigInt(file.size),
          status: VideoStatus.PENDING,
        });

        logger.info({
          traceId,
          tag: 'process-video.use-case',
          videoId: createdVideo.id,
          msg: 'Video created in database'
        });

        videos.push({
          id: createdVideo.id,
          id_processamento: jobId,
          framesPerSecond: input.framesPerSecond,
          format: input.format,
          input_url: inputUrlStorage,
          output_url: outputUrlStorage,
        });
      }

      try {
        const person: PersonDTO = {
          clientId: input.clientId,
          name: input.name ?? input.email.split('@')[0] ?? 'User',
          email: input.email,
        };

        const message: VideoProcessingMessageDTO = {
          person,
          videos,
        };

        await this.queueRepository.publishVideoProcessing(message);

        logger.info({
          traceId,
          tag: 'process-video.use-case',
          totalVideos: videos.length,
          msg: 'Message published to RabbitMQ'
        });
      } catch (queueError) {
        logger.error({
          traceId,
          tag: 'process-video.use-case',
          errorMessage:
            queueError instanceof Error ? queueError.message : 'Unknown error',
          msg: 'Failed to publish to RabbitMQ'
        });

        const errorMessage =
          queueError instanceof Error ? queueError.message : 'Unknown error';
        await this.processamentoRepository.updateError(
          jobId,
          `RabbitMQ unavailable: ${errorMessage}`
        );

        throw new QueueUnavailableError(
          'Failed to enqueue video processing. Please try again later.'
        );
      }

      logger.info({
        traceId,
        tag: 'process-video.use-case',
        jobId,
        totalVideos: input.files.length,
        msg: 'Video processing completed successfully'
      });

      return new ProcessVideoResponseDTO(jobId, input.files.length);
    } catch (error) {
      logger.error({
        traceId,
        tag: 'process-video.use-case',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        msg: 'Error processing videos'
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
          file.buffer = Buffer.alloc(0);
        }
      });

      if (globalThis.gc) {
        globalThis.gc();
        logger.info({
          traceId,
          tag: 'process-video.use-case',
          totalSizeMB: totalSizeMB.toFixed(2),
          gcForced: true,
          msg: 'Memory cleanup completed (GC forced)'
        });
      } else {
        logger.info({
          traceId,
          tag: 'process-video.use-case',
          totalSizeMB: totalSizeMB.toFixed(2),
          gcForced: false,
          msg: 'Memory cleanup completed (GC not available)'
        });
      }
    } catch (cleanupError) {
      logger.warn({
        traceId,
        tag: 'process-video.use-case',
        errorMessage:
          cleanupError instanceof Error
            ? cleanupError.message
            : String(cleanupError),
        msg: 'Error during memory cleanup'
      });
    }
  }
}
