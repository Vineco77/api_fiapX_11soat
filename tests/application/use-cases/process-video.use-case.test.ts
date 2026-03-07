jest.mock('@prisma/client', () => ({
  VideoStatus: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
  },
}));

jest.mock('@/infrastructure/monitoring/logger.service', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/infrastructure/monitoring', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  logRabbitMQOperation: jest.fn(),
  logS3Operation: jest.fn(),
  logDatabaseOperation: jest.fn(),
  logCacheOperation: jest.fn(),
}));

jest.mock('@/infrastructure/config/env', () => ({
  appConfig: {
    aws: { s3Bucket: 'test-bucket' },
    upload: { useS3Streaming: false },
    limits: {
      maxFps: 60,
      maxVideosPerRequest: 10,
      maxFileSizeMB: 500,
    },
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid'),
}));

import { ProcessVideoUseCase, ProcessVideoInput } from '@/application/use-cases/process-video.use-case';
import type { IProcessamentoRepository } from '@/domain/repositories/processamento.repository.interface';
import type { IVideoRepository } from '@/domain/repositories/video.repository.interface';
import type { IS3StorageService, UploadedFile } from '@/domain/repositories/s3-storage.interface';
import type { IQueueRepository } from '@/domain/repositories/queue.interface';
import { Processamento } from '@/domain/entities/processamento.entity';

function createMockFile(overrides: Partial<UploadedFile> = {}): UploadedFile {
  return {
    fieldname: 'files',
    originalname: 'test-video.mp4',
    encoding: '7bit',
    mimetype: 'video/mp4',
    buffer: Buffer.from('fake-video-data'),
    size: 1024,
    ...overrides,
  };
}

describe('ProcessVideoUseCase', () => {
  let useCase: ProcessVideoUseCase;
  let mockProcessamentoRepo: jest.Mocked<IProcessamentoRepository>;
  let mockVideoRepo: jest.Mocked<IVideoRepository>;
  let mockS3Storage: jest.Mocked<IS3StorageService>;
  let mockQueueRepo: jest.Mocked<IQueueRepository>;

  beforeEach(() => {
    mockProcessamentoRepo = {
      create: jest.fn().mockResolvedValue(
        new Processamento({
          id: 'proc-1',
          jobId: 'mock-uuid',
          clientId: 'client-1',
          email: 'test@test.com',
          framesPerSecond: 30,
          format: 'jpg',
          size: BigInt(0),
          uploadedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          videos: [],
        })
      ),
      findByJobId: jest.fn(),
      findById: jest.fn(),
      findByClientId: jest.fn(),
      updateTotalSize: jest.fn(),
      updateError: jest.fn(),
      markAsProcessed: jest.fn(),
      delete: jest.fn(),
      getEmailByJobId: jest.fn(),
      getClientIdByJobId: jest.fn(),
    };

    mockVideoRepo = {
      create: jest.fn(),
      createMany: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      findByProcessamentoId: jest.fn(),
      updateStatus: jest.fn(),
      delete: jest.fn(),
      deleteByProcessamentoId: jest.fn(),
    };

    mockS3Storage = {
      uploadFile: jest.fn().mockResolvedValue(undefined),
      uploadMultipleFiles: jest.fn(),
      getSignedUrl: jest.fn(),
      getSignedUrlForFile: jest.fn(),
      getPresignedFolderUrl: jest.fn(),
      deleteFolder: jest.fn(),
    };

    mockQueueRepo = {
      publishVideoProcessing: jest.fn().mockResolvedValue(undefined),
      close: jest.fn(),
    };

    useCase = new ProcessVideoUseCase(
      mockProcessamentoRepo,
      mockVideoRepo,
      mockS3Storage,
      mockQueueRepo
    );
  });

  it('should process videos successfully', async () => {
    const input: ProcessVideoInput = {
      files: [createMockFile()],
      framesPerSecond: 30,
      format: 'jpg',
      clientId: 'client-1',
      email: 'test@test.com',
    };

    const result = await useCase.execute(input);

    expect(result.jobId).toBe('mock-uuid');
    expect(result.status).toBe('PROCESSING');
    expect(result.videosCount).toBe(1);
    expect(mockProcessamentoRepo.create).toHaveBeenCalledTimes(1);
    expect(mockVideoRepo.createMany).toHaveBeenCalledTimes(1);
    expect(mockQueueRepo.publishVideoProcessing).toHaveBeenCalledTimes(1);
    expect(mockS3Storage.getSignedUrlForFile).not.toHaveBeenCalled();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const publishedMessage = mockQueueRepo.publishVideoProcessing.mock.calls[0]![0]!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(publishedMessage.videos[0]!.input_url).toMatch(/^s3:\/\//);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(publishedMessage.videos[0]!.output_url).toMatch(/^s3:\/\//);
  });

  it('should throw ValidationError when no files provided', async () => {
    const input: ProcessVideoInput = {
      files: [],
      framesPerSecond: 30,
      format: 'jpg',
      clientId: 'client-1',
      email: 'test@test.com',
    };

    await expect(useCase.execute(input)).rejects.toThrow(
      'At least one video file is required'
    );
  });

  it('should throw error for invalid file types', async () => {
    const input: ProcessVideoInput = {
      files: [createMockFile({ mimetype: 'image/png', originalname: 'test.png' })],
      framesPerSecond: 30,
      format: 'jpg',
      clientId: 'client-1',
      email: 'test@test.com',
    };

    await expect(useCase.execute(input)).rejects.toThrow('Only video files are allowed');
  });

  it('should throw error for invalid format', async () => {
    const input: ProcessVideoInput = {
      files: [createMockFile()],
      framesPerSecond: 30,
      format: 'gif',
      clientId: 'client-1',
      email: 'test@test.com',
    };

    await expect(useCase.execute(input)).rejects.toThrow('Invalid format');
  });

  it('should throw error when framesPerSecond is out of range', async () => {
    const input: ProcessVideoInput = {
      files: [createMockFile()],
      framesPerSecond: 0,
      format: 'jpg',
      clientId: 'client-1',
      email: 'test@test.com',
    };

    await expect(useCase.execute(input)).rejects.toThrow('framesPerSecond must be between');
  });

  it('should throw error when framesPerSecond exceeds max', async () => {
    const input: ProcessVideoInput = {
      files: [createMockFile()],
      framesPerSecond: 61,
      format: 'jpg',
      clientId: 'client-1',
      email: 'test@test.com',
    };

    await expect(useCase.execute(input)).rejects.toThrow('framesPerSecond must be between');
  });

  it('should throw error when too many files', async () => {
    const files = Array.from({ length: 11 }, (_, i) =>
      createMockFile({ originalname: `video-${i}.mp4` })
    );

    const input: ProcessVideoInput = {
      files,
      framesPerSecond: 30,
      format: 'jpg',
      clientId: 'client-1',
      email: 'test@test.com',
    };

    await expect(useCase.execute(input)).rejects.toThrow('limit exceeded');
  });

  it('should skip S3 upload when file is already uploaded (streaming mode)', async () => {
    const input: ProcessVideoInput = {
      files: [createMockFile({ key: 's3://already-uploaded', buffer: Buffer.alloc(0) })],
      framesPerSecond: 30,
      format: 'jpg',
      clientId: 'client-1',
      email: 'test@test.com',
    };

    const result = await useCase.execute(input);

    expect(result.status).toBe('PROCESSING');
    expect(mockS3Storage.uploadFile).not.toHaveBeenCalled();
  });

  it('should handle queue publish failure', async () => {
    mockQueueRepo.publishVideoProcessing.mockRejectedValue(new Error('Queue down'));

    const input: ProcessVideoInput = {
      files: [createMockFile()],
      framesPerSecond: 30,
      format: 'jpg',
      clientId: 'client-1',
      email: 'test@test.com',
    };

    await expect(useCase.execute(input)).rejects.toThrow('Failed to process videos');
    expect(mockProcessamentoRepo.updateError).toHaveBeenCalled();
  });
});
