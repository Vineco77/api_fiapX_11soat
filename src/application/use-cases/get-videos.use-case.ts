import { injectable, inject } from 'tsyringe';
import type { IVideoRepository } from '@/domain/repositories/video.repository.interface';
import type { IS3StorageService } from '@/domain/repositories/s3-storage.interface';
import type { ICacheService } from '@/domain/repositories/cache.interface';
import type { GetVideosResponseDTO, VideoItemDTO } from '@/domain/dtos/get-videos-response.dto';
import { buildInputPath, buildOutputPath } from '@/infrastructure/storage/s3-path.helper';

interface GetVideosInput {
  email: string;
  page: number;
  limit: number;
  status?: string;
}

@injectable()
export class GetVideosUseCase {
  constructor(
    @inject('VideoRepository') private videoRepository: IVideoRepository,
    @inject('S3StorageService') private s3StorageService: IS3StorageService,
    @inject('CacheService') private cacheService: ICacheService
  ) {}

  async execute(input: GetVideosInput): Promise<GetVideosResponseDTO> {
    const { email, page, limit, status } = input;

    const cacheKey = this.buildCacheKey(email, page, limit, status);
    const cached = await this.cacheService.get<GetVideosResponseDTO>(cacheKey);

    if (cached) {
      console.log(`✅ Cache HIT for key: ${cacheKey}`);
      return cached;
    }

    console.log(`⚠️ Cache MISS for key: ${cacheKey}`);

    const skip = (page - 1) * limit;

    const { videos, total } = await this.videoRepository.findByClientEmail(
      email,
      skip,
      limit,
      status
    );

    const videosWithUrls = await Promise.all(
      videos.map(async (video: any) => {
        const inputFolderPath = buildInputPath(video.email, video.jobId);
        const outputFolderPath = buildOutputPath(video.email, video.jobId);

        const [inputFolderUrl, outputFolderUrl] = await Promise.all([
          this.s3StorageService.getPresignedFolderUrl(inputFolderPath),
          video.status === 'completed'
            ? this.s3StorageService.getPresignedFolderUrl(outputFolderPath)
            : Promise.resolve(undefined),
        ]);

        return {
          jobId: video.jobId,
          clientId: video.clientId,
          status: video.status,
          inputFolderUrl,
          outputFolderUrl,
          uploadedAt: video.uploadedAt.toISOString(),
          processedAt: video.processedAt?.toISOString(),
          framesPerSecond: video.framesPerSecond,
          format: video.format,
          error: video.error,
        } as VideoItemDTO;
      })
    );

    const totalPages = Math.ceil(total / limit);
    const response: GetVideosResponseDTO = {
      videos: videosWithUrls,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    const cacheTTL = 300;
    await this.cacheService.set(cacheKey, response, cacheTTL);
    console.log(`✅ Cached result for key: ${cacheKey} (TTL: ${cacheTTL}s)`);

    return response;
  }

  private buildCacheKey(email: string, page: number, limit: number, status?: string): string {
    const statusPart = status ? `:status:${status}` : '';
    return `videos:${email}:page:${page}:limit:${limit}${statusPart}`;
  }
}
