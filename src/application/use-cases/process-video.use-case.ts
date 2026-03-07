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
  /** jobId already embedded in S3 paths during streaming upload */
  streamingJobId?: string;
  /** Per-file metadata recorded by the streaming upload middleware */
  uploadMetadata?: Array<{ originalName: string; videoId: string; s3Key: string }>;
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

    const jobId = input.streamingJobId ?? uuidv4();
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

      logger.info({
        traceId,
        tag: 'process-video.use-case',
        filesCount: input.files.length,
        useS3Streaming: appConfig.upload.useS3Streaming,
        msg: 'Starting parallel upload and database operations'
      });

      const startProcessing = Date.now();

      const uploadPromises = input.files.map(async (file) => {
        // In streaming mode the middleware already uploaded the file and assigned
        // a videoId that is embedded in the S3 key – reuse it so the path in the
        // queue message matches the actual S3 location.
        const streamingMeta = input.uploadMetadata?.find(
          (m) => m.originalName === file.originalname
        );
        const videoId = streamingMeta?.videoId ?? uuidv4();
        const sanitizedFilename = sanitizeFilename(file.originalname);
        const fileExtension = getFileExtension(file.originalname);

        const s3Key = buildVideoFilePath(
          input.email,
          jobId,
          videoId,
          sanitizedFilename
        );

        const startTime = Date.now();
        const isAlreadyUploaded = !!file.key;

        if (isAlreadyUploaded) {
          logger.info({
            traceId,
            tag: 'process-video.use-case',
            videoId,
            filename: sanitizedFilename,
            mode: 'streaming',
            msg: 'File already uploaded via streaming'
          });
        } else {
          logger.info({
            traceId,
            tag: 'process-video.use-case',
            videoId,
            filename: sanitizedFilename,
            mode: 'memory-buffer',
            msg: 'Starting upload to S3'
          });

          await this.s3Storage.uploadFile(file.buffer, s3Key, file.mimetype);

          logger.info({
            traceId,
            tag: 'process-video.use-case',
            videoId,
            uploadDurationMs: Date.now() - startTime,
            msg: 'S3 upload completed'
          });
        }

        return {
          videoId,
          sanitizedFilename,
          fileExtension,
          fileSize: file.size,
          uploadDuration: Date.now() - startTime,
        };
      });

      const uploadResults = await Promise.all(uploadPromises);
      const uploadPhaseTime = Date.now() - startProcessing;

      logger.info({
        traceId,
        tag: 'process-video.use-case',
        uploadPhaseMs: uploadPhaseTime,
        msg: 'All uploads completed'
      });

      const videosToCreate = uploadResults.map((result) => {
        const inputPath = buildVideoInputPath(input.email, jobId, result.videoId);
        const outputPath = buildVideoOutputPath(input.email, jobId, result.videoId);

        return {
          id: result.videoId,
          fileName: result.sanitizedFilename,
          fileFormat: result.fileExtension,
          processamentoId: processamento.id,
          inputUrlStorage: `s3://${appConfig.aws.s3Bucket}/${inputPath}`,
          outputUrlStorage: `s3://${appConfig.aws.s3Bucket}/${outputPath}`,
          size: BigInt(result.fileSize),
          status: VideoStatus.PENDING,
        };
      });

      logger.info({
        traceId,
        tag: 'process-video.use-case',
        videosCount: videosToCreate.length,
        msg: 'Video metadata prepared'
      });

      const dbStartTime = Date.now();

      const videos = videosToCreate.map((video) => ({
        id: video.id,
        id_processamento: jobId,
        framesPerSecond: input.framesPerSecond,
        format: input.format,
        input_url: video.inputUrlStorage,
        output_url: video.outputUrlStorage,
      }));

      const person: PersonDTO = {
        clientId: input.clientId,
        name: input.name ?? input.email.split('@')[0] ?? 'User',
        email: input.email,
      };

      const message: VideoProcessingMessageDTO = {
        person,
        videos,
      };

      try {
        const [createdVideos] = await Promise.all([
          this.videoRepository.createMany(videosToCreate),
          this.queueRepository.publishVideoProcessing(message),
        ]);

        const dbTime = Date.now() - dbStartTime;

        logger.info({
          traceId,
          tag: 'process-video.use-case',
          dbInsertMs: dbTime,
          totalProcessingMs: Date.now() - startProcessing,
          msg: `Batch insert + RabbitMQ publish completed in parallel (${createdVideos.length} videos)`
        });
      } catch (queueError) {
        logger.error({
          traceId,
          tag: 'process-video.use-case',
          errorMessage:
            queueError instanceof Error ? queueError.message : 'Unknown error',
          msg: 'Failed to publish to RabbitMQ or create videos in DB'
        });

        const errorMessage =
          queueError instanceof Error ? queueError.message : 'Unknown error';
        await this.processamentoRepository.updateError(
          jobId,
          `Processing failed: ${errorMessage}`
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
      
      const filesWithBuffer = files.filter(f => f.buffer && f.buffer.length > 0);
      const isStreamingMode = filesWithBuffer.length === 0;

      if (isStreamingMode) {
        logger.info({
          traceId,
          tag: 'process-video.use-case',
          totalSizeMB: totalSizeMB.toFixed(2),
          mode: 'streaming',
          msg: 'No buffer cleanup needed (S3 streaming mode)'
        });
        return;
      }

      filesWithBuffer.forEach((file) => {
        file.buffer = Buffer.alloc(0);
      });

      if (globalThis.gc) {
        globalThis.gc();
        logger.info({
          traceId,
          tag: 'process-video.use-case',
          totalSizeMB: totalSizeMB.toFixed(2),
          filesWithBuffer: filesWithBuffer.length,
          gcForced: true,
          msg: 'Memory cleanup completed (GC forced)'
        });
      } else {
        logger.info({
          traceId,
          tag: 'process-video.use-case',
          totalSizeMB: totalSizeMB.toFixed(2),
          filesWithBuffer: filesWithBuffer.length,
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
