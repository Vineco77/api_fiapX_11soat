jest.mock('@prisma/client', () => ({
  VideoStatus: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
  },
}));

jest.mock('@/infrastructure/monitoring', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { VideoCallbackUseCase } from '@/application/use-cases/video-callback.use-case';
import type { IVideoRepository } from '@/domain/repositories/video.repository.interface';
import type { IProcessamentoRepository } from '@/domain/repositories/processamento.repository.interface';
import { Video } from '@/domain/entities/video.entity';
import { Processamento } from '@/domain/entities/processamento.entity';
import type { VideoCallbackDTO } from '@/domain/dtos/video-callback.dto';

const { VideoStatus } = jest.requireMock('@prisma/client');

function createMockVideo(overrides: Partial<ConstructorParameters<typeof Video>[0]> = {}): Video {
  return new Video({
    id: 'video-1',
    fileName: 'test.mp4',
    fileFormat: 'mp4',
    processamentoId: 'proc-1',
    status: VideoStatus.PENDING,
    inputUrlStorage: 's3://input/',
    outputUrlStorage: 's3://output/',
    size: BigInt(1024),
    error: null,
    uploadedAt: new Date(),
    processedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

function createMockProcessamento(
  overrides: Partial<ConstructorParameters<typeof Processamento>[0]> = {}
): Processamento {
  return new Processamento({
    id: 'proc-1',
    jobId: 'job-1',
    clientId: 'client-1',
    email: 'test@test.com',
    framesPerSecond: 30,
    format: 'jpg',
    size: BigInt(0),
    uploadedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    videos: [],
    ...overrides,
  });
}

describe('VideoCallbackUseCase', () => {
  let useCase: VideoCallbackUseCase;
  let mockVideoRepo: jest.Mocked<IVideoRepository>;
  let mockProcessamentoRepo: jest.Mocked<IProcessamentoRepository>;

  beforeEach(() => {
    mockVideoRepo = {
      create: jest.fn(),
      createMany: jest.fn(),
      findById: jest.fn(),
      findByProcessamentoId: jest.fn(),
      updateStatus: jest.fn().mockResolvedValue(createMockVideo({ status: VideoStatus.COMPLETED })),
      delete: jest.fn(),
      deleteByProcessamentoId: jest.fn(),
    };

    mockProcessamentoRepo = {
      create: jest.fn(),
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

    useCase = new VideoCallbackUseCase(mockVideoRepo, mockProcessamentoRepo);
  });

  it('should update video status to COMPLETED successfully', async () => {
    mockVideoRepo.findById.mockResolvedValue(createMockVideo());
    mockProcessamentoRepo.findByJobId.mockResolvedValue(createMockProcessamento());

    const input: VideoCallbackDTO = {
      id: 'video-1',
      id_processamento: 'job-1',
      status: 'COMPLETED',
    };

    await useCase.execute(input);

    expect(mockVideoRepo.updateStatus).toHaveBeenCalledWith(
      'video-1',
      VideoStatus.COMPLETED,
      undefined,
      expect.any(Date)
    );
  });

  it('should update video status to FAILED with error message', async () => {
    mockVideoRepo.findById.mockResolvedValue(createMockVideo());
    mockProcessamentoRepo.findByJobId.mockResolvedValue(createMockProcessamento());

    const input: VideoCallbackDTO = {
      id: 'video-1',
      id_processamento: 'job-1',
      status: 'FAILED',
      error: 'Processing failed due to codec issue',
    };

    await useCase.execute(input);

    expect(mockVideoRepo.updateStatus).toHaveBeenCalledWith(
      'video-1',
      VideoStatus.FAILED,
      'Processing failed due to codec issue',
      undefined
    );
  });

  it('should throw error when video not found', async () => {
    mockVideoRepo.findById.mockResolvedValue(null);

    const input: VideoCallbackDTO = {
      id: 'nonexistent',
      id_processamento: 'job-1',
      status: 'COMPLETED',
    };

    await expect(useCase.execute(input)).rejects.toThrow('Video not found');
  });

  it('should throw error when processamento not found', async () => {
    mockVideoRepo.findById.mockResolvedValue(createMockVideo());
    mockProcessamentoRepo.findByJobId.mockResolvedValue(null);

    const input: VideoCallbackDTO = {
      id: 'video-1',
      id_processamento: 'nonexistent',
      status: 'COMPLETED',
    };

    await expect(useCase.execute(input)).rejects.toThrow('Processamento not found');
  });

  it('should throw error when video does not belong to processamento', async () => {
    mockVideoRepo.findById.mockResolvedValue(
      createMockVideo({ processamentoId: 'other-proc' })
    );
    mockProcessamentoRepo.findByJobId.mockResolvedValue(createMockProcessamento());

    const input: VideoCallbackDTO = {
      id: 'video-1',
      id_processamento: 'job-1',
      status: 'COMPLETED',
    };

    await expect(useCase.execute(input)).rejects.toThrow('does not belong to');
  });

  it('should throw error for invalid status', async () => {
    mockVideoRepo.findById.mockResolvedValue(createMockVideo());
    mockProcessamentoRepo.findByJobId.mockResolvedValue(createMockProcessamento());

    const input = {
      id: 'video-1',
      id_processamento: 'job-1',
      status: 'INVALID' as any,
    };

    await expect(useCase.execute(input)).rejects.toThrow('Invalid status');
  });

  it('should throw error when FAILED status has no error message', async () => {
    mockVideoRepo.findById.mockResolvedValue(createMockVideo());
    mockProcessamentoRepo.findByJobId.mockResolvedValue(createMockProcessamento());

    const input: VideoCallbackDTO = {
      id: 'video-1',
      id_processamento: 'job-1',
      status: 'FAILED',
    };

    await expect(useCase.execute(input)).rejects.toThrow(
      'Error message is required when status is FAILED'
    );
  });
});
