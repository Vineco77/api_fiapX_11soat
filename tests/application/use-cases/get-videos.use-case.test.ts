jest.mock('@prisma/client', () => ({
  VideoStatus: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
  },
}));

import { GetVideosUseCase } from '@/application/use-cases/get-videos.use-case';
import type { IProcessamentoRepository } from '@/domain/repositories/processamento.repository.interface';
import type { ICacheService } from '@/domain/repositories/cache.interface';
import { Processamento } from '@/domain/entities/processamento.entity';
import { Video } from '@/domain/entities/video.entity';
import type { GetProcessamentosResponseDTO } from '@/domain/dtos/processamento-response.dto';

const { VideoStatus } = jest.requireMock('@prisma/client');

function createMockProcessamento(
  overrides: Partial<ConstructorParameters<typeof Processamento>[0]> = {}
): Processamento {
  return new Processamento({
    id: 'proc-1',
    jobId: 'job-1',
    clientId: 'client-1',
    email: 'user@test.com',
    framesPerSecond: 30,
    format: 'jpg',
    size: BigInt(2048),
    error: null,
    uploadedAt: new Date('2026-01-15'),
    processedAt: null,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
    videos: [
      new Video({
        id: 'video-1',
        fileName: 'test.mp4',
        fileFormat: 'mp4',
        processamentoId: 'proc-1',
        status: VideoStatus.COMPLETED,
        inputUrlStorage: 's3://bucket/input/',
        outputUrlStorage: 's3://bucket/output/',
        size: BigInt(1024),
        error: null,
        uploadedAt: new Date('2026-01-15'),
        processedAt: new Date('2026-01-15'),
        createdAt: new Date('2026-01-15'),
        updatedAt: new Date('2026-01-15'),
      }),
    ],
    ...overrides,
  });
}

describe('GetVideosUseCase', () => {
  let useCase: GetVideosUseCase;
  let mockProcessamentoRepo: jest.Mocked<IProcessamentoRepository>;
  let mockCacheService: jest.Mocked<ICacheService>;

  beforeEach(() => {
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

    mockCacheService = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      delete: jest.fn(),
      deletePattern: jest.fn(),
      exists: jest.fn(),
    };

    useCase = new GetVideosUseCase(mockProcessamentoRepo, mockCacheService);
  });

  it('should return cached result when available', async () => {
    const cachedResponse: GetProcessamentosResponseDTO = {
      processamentos: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };

    mockCacheService.get.mockResolvedValue(cachedResponse);

    const result = await useCase.execute({
      clientId: 'client-1',
      page: 1,
      limit: 10,
    });

    expect(result).toEqual(cachedResponse);
    expect(mockProcessamentoRepo.findByClientId).not.toHaveBeenCalled();
  });

  it('should fetch from repository and cache when no cache', async () => {
    const mockProc = createMockProcessamento();

    mockCacheService.get.mockResolvedValue(null);
    mockProcessamentoRepo.findByClientId.mockResolvedValue({
      processamentos: [mockProc],
      total: 1,
    });

    const result = await useCase.execute({
      clientId: 'client-1',
      page: 1,
      limit: 10,
    });

    expect(result.processamentos).toHaveLength(1);
    expect(result.processamentos[0]!.jobId).toBe('job-1');
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.totalPages).toBe(1);
    expect(result.pagination.hasNext).toBe(false);
    expect(result.pagination.hasPrev).toBe(false);
    expect(mockCacheService.set).toHaveBeenCalledTimes(1);
  });

  it('should handle pagination correctly', async () => {
    const processamentos = Array.from({ length: 5 }, (_, i) =>
      createMockProcessamento({ id: `proc-${i}`, jobId: `job-${i}` })
    );

    mockCacheService.get.mockResolvedValue(null);
    mockProcessamentoRepo.findByClientId.mockResolvedValue({
      processamentos,
      total: 15,
    });

    const result = await useCase.execute({
      clientId: 'client-1',
      page: 2,
      limit: 5,
    });

    expect(result.pagination.page).toBe(2);
    expect(result.pagination.limit).toBe(5);
    expect(result.pagination.total).toBe(15);
    expect(result.pagination.totalPages).toBe(3);
    expect(result.pagination.hasNext).toBe(true);
    expect(result.pagination.hasPrev).toBe(true);
    expect(mockProcessamentoRepo.findByClientId).toHaveBeenCalledWith(
      'client-1',
      5, // skip = (2-1)*5
      5,
      undefined
    );
  });

  it('should pass status filter to repository', async () => {
    mockCacheService.get.mockResolvedValue(null);
    mockProcessamentoRepo.findByClientId.mockResolvedValue({
      processamentos: [],
      total: 0,
    });

    await useCase.execute({
      clientId: 'client-1',
      page: 1,
      limit: 10,
      status: 'completed',
    });

    expect(mockProcessamentoRepo.findByClientId).toHaveBeenCalledWith(
      'client-1',
      0,
      10,
      'completed'
    );
  });

  it('should include video stats in response', async () => {
    const proc = createMockProcessamento({
      videos: [
        new Video({
          id: 'v1',
          fileName: 'a.mp4',
          fileFormat: 'mp4',
          processamentoId: 'proc-1',
          status: VideoStatus.COMPLETED,
          inputUrlStorage: 's3://in',
          outputUrlStorage: 's3://out',
          size: BigInt(100),
          uploadedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        new Video({
          id: 'v2',
          fileName: 'b.mp4',
          fileFormat: 'mp4',
          processamentoId: 'proc-1',
          status: VideoStatus.FAILED,
          inputUrlStorage: 's3://in',
          outputUrlStorage: 's3://out',
          size: BigInt(200),
          error: 'Codec error',
          uploadedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        new Video({
          id: 'v3',
          fileName: 'c.mp4',
          fileFormat: 'mp4',
          processamentoId: 'proc-1',
          status: VideoStatus.PENDING,
          inputUrlStorage: 's3://in',
          outputUrlStorage: 's3://out',
          size: BigInt(300),
          uploadedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ],
    });

    mockCacheService.get.mockResolvedValue(null);
    mockProcessamentoRepo.findByClientId.mockResolvedValue({
      processamentos: [proc],
      total: 1,
    });

    const result = await useCase.execute({
      clientId: 'client-1',
      page: 1,
      limit: 10,
    });

    const stats = result.processamentos[0]!.stats;
    expect(stats.totalVideos).toBe(3);
    expect(stats.completed).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.pending).toBe(1);
    expect(stats.processing).toBe(0);
  });
});
