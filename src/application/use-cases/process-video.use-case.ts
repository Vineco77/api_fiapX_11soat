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

export interface ProcessVideoInput {
  files: UploadedFile[];
  framesPerSecond: number;
  format: string;
  clientId: string;
  email: string;
}

/**
 * Use Case: Processar upload de vídeos
 * 
 * Responsabilidades:
 * 1. Validar arquivos recebidos
 * 2. Gerar jobId único
 * 3. Upload paralelo para S3
 * 4. Gerar URLs assinadas das pastas
 * 5. Criar registro no BD
 * 6. Retornar resposta ao cliente
 * 
 * Performance:
 * - Upload paralelo de múltiplos vídeos
 * - Validações antes de operações custosas
 * - Cleanup de memória após upload
 */
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
    console.log(`[${jobId}] Starting video processing`);

    try {
      const totalSize = this.calculateTotalSize(input.files);
      console.log(`[${jobId}] Total size: ${totalSize} bytes`);

      const uploadTasks = input.files.map((file) => {
        const sanitizedFilename = sanitizeFilename(file.originalname);
        const s3Key = buildVideoFilePath(input.email, jobId, sanitizedFilename);

        return {
          buffer: file.buffer,
          key: s3Key,
          contentType: file.mimetype,
        };
      });

      console.log(`[${jobId}] Uploading ${input.files.length} videos to S3...`);
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

      console.log(`[${jobId}] URLs generated - Input: ${inputUrlStorage}`);

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
        console.log(`[${jobId}] Message published to RabbitMQ`);
      } catch (queueError) {
        console.error(`[${jobId}] ❌ Failed to publish to RabbitMQ:`, queueError);
        
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

      console.log(`[${jobId}] ✅ Video processing completed successfully`);

      return new ProcessVideoResponseDTO(jobId, input.files.length);
    } catch (error) {
      console.error(`[${jobId}] ❌ Error processing videos:`, error);
      throw new Error(
        `Failed to process videos: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      this.cleanupBuffers(input.files, jobId);
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

  private cleanupBuffers(files: UploadedFile[], jobId: string): void {
    try {
      const totalSizeMB = this.calculateTotalSize(files) / (1024 * 1024);
      
      files.forEach((file) => {
        if (file.buffer) {
          file.buffer = Buffer.alloc(0); // Substitui por buffer vazio
        }
      });

      if (globalThis.gc) {
        globalThis.gc();
        console.log(`[${jobId}] 🧹 Memory cleanup: ${totalSizeMB.toFixed(2)}MB freed (GC forced)`);
      } else {
        console.log(`[${jobId}] 🧹 Memory cleanup: ${totalSizeMB.toFixed(2)}MB marked for GC`);
      }
    } catch (cleanupError) {
      console.warn(`[${jobId}] ⚠️  Cleanup warning:`, cleanupError);
    }
  }
}
