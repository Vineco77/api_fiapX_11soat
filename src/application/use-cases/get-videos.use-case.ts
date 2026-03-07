import { injectable, inject } from 'tsyringe';
import type { IProcessamentoRepository } from '@/domain/repositories/processamento.repository.interface';
import type { ICacheService } from '@/domain/repositories/cache.interface';
import type {
  GetProcessamentosResponseDTO,
  ProcessamentoResponseDTO,
  VideoItemResponseDTO,
} from '@/domain/dtos/processamento-response.dto';
import { Processamento } from '@/domain/entities/processamento.entity';

interface GetVideosInput {
  clientId: string;
  page: number;
  limit: number;
  status?: string;
}

@injectable()
export class GetVideosUseCase {
  constructor(
    @inject('ProcessamentoRepository')
    private readonly processamentoRepository: IProcessamentoRepository,
    @inject('CacheService') private readonly cacheService: ICacheService
  ) {}

  async execute(input: GetVideosInput): Promise<GetProcessamentosResponseDTO> {
    const { clientId, page, limit, status } = input;

    const cacheKey = this.buildCacheKey(clientId, page, limit, status);
    const cached =
      await this.cacheService.get<GetProcessamentosResponseDTO>(cacheKey);

    if (cached) {
      console.log(`Cache HIT for key: ${cacheKey}`);
      return cached;
    }

    console.log(`Cache MISS for key: ${cacheKey}`);

    const skip = (page - 1) * limit;

    const { processamentos, total } =
      await this.processamentoRepository.findByClientId(
        clientId,
        skip,
        limit,
        status
      );

    const processamentosDTO = processamentos.map((p) =>
      this.mapToDTO(p)
    );

    const totalPages = Math.ceil(total / limit);
    const response: GetProcessamentosResponseDTO = {
      processamentos: processamentosDTO,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    const cacheTTL = 300; // 5 minutos
    await this.cacheService.set(cacheKey, response, cacheTTL);
    console.log(`Cached result for key: ${cacheKey} (TTL: ${cacheTTL}s)`);

    return response;
  }

  private buildCacheKey(
    clientId: string,
    page: number,
    limit: number,
    status?: string
  ): string {
    const statusPart = status ? `:status:${status}` : '';
    return `processamentos:${clientId}:page:${page}:limit:${limit}${statusPart}`;
  }

  private mapToDTO(processamento: Processamento): ProcessamentoResponseDTO {
    const videos: VideoItemResponseDTO[] = processamento.videos.map((video) => ({
      id: video.id,
      fileName: video.fileName,
      fileFormat: video.fileFormat,
      status: video.status as 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
      inputUrlStorage: video.inputUrlStorage,
      outputUrlStorage: video.outputUrlStorage,
      size: video.size.toString(),
      error: video.error,
      uploadedAt: video.uploadedAt.toISOString(),
      processedAt: video.processedAt?.toISOString() ?? null,
    }));

    const stats = {
      totalVideos: processamento.getTotalVideos(),
      completed: processamento.getCompletedVideosCount(),
      processing: processamento.getProcessingVideosCount(),
      failed: processamento.getFailedVideosCount(),
      pending: processamento.videos.filter((v) => v.isPending()).length,
    };

    return {
      id: processamento.id,
      jobId: processamento.jobId,
      clientId: processamento.clientId,
      email: processamento.email,
      framesPerSecond: processamento.framesPerSecond,
      format: processamento.format,
      size: processamento.size.toString(),
      error: processamento.error,
      uploadedAt: processamento.uploadedAt.toISOString(),
      processedAt: processamento.processedAt?.toISOString() ?? null,
      videos,
      stats,
    };
  }
}
