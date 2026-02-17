import { injectable, inject } from 'tsyringe';
import { VideoStatus } from '@prisma/client';
import { getPrismaClient } from '@/infrastructure/database/prisma-client';
import type {
  IVideoRepository,
  CreateVideoData,
} from '@/domain/repositories/video.repository.interface';
import type { ICacheService } from '@/domain/repositories/cache.interface';
import { Video } from '@/domain/entities/video.entity';

@injectable()
export class PrismaVideoRepository implements IVideoRepository {
  private readonly prisma = getPrismaClient();

  constructor(
    @inject('CacheService') private readonly cacheService: ICacheService
  ) {}

  async create(data: CreateVideoData): Promise<Video> {
    try {
      const video = await this.prisma.video.create({
        data: {
          id: data.id,
          fileName: data.fileName,
          fileFormat: data.fileFormat,
          processamentoId: data.processamentoId,
          inputUrlStorage: data.inputUrlStorage,
          outputUrlStorage: data.outputUrlStorage,
          size: data.size,
          status: data.status ?? VideoStatus.PENDING,
        },
      });

      console.log(`Video created in DB: ${video.id} (${video.fileName})`);

      await this.invalidateCacheByProcessamentoId(data.processamentoId);

      return this.mapToDomain(video);
    } catch (error) {
      console.error('Error creating video in DB:', error);
      throw new Error(
        `Failed to create video: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async createMany(videos: CreateVideoData[]): Promise<Video[]> {
    try {
      if (videos.length === 0) {
        return [];
      }

      const result = await this.prisma.video.createMany({
        data: videos.map((v) => ({
          id: v.id,
          fileName: v.fileName,
          fileFormat: v.fileFormat,
          processamentoId: v.processamentoId,
          inputUrlStorage: v.inputUrlStorage,
          outputUrlStorage: v.outputUrlStorage,
          size: v.size,
          status: v.status ?? VideoStatus.PENDING,
        })),
      });

      console.log(`${result.count} videos created in DB`);

      const firstVideo = videos[0];
      if (!firstVideo) {
        throw new Error('First video is undefined after createMany');
      }

      await this.invalidateCacheByProcessamentoId(firstVideo.processamentoId);

      const createdVideos = await this.prisma.video.findMany({
        where: {
          processamentoId: firstVideo.processamentoId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: result.count,
      });

      return createdVideos.map((v) => this.mapToDomain(v));
    } catch (error) {
      console.error('Error creating multiple videos in DB:', error);
      throw new Error(
        `Failed to create videos: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async findById(id: string): Promise<Video | null> {
    try {
      const video = await this.prisma.video.findUnique({
        where: { id },
      });

      if (!video) {
        return null;
      }

      return this.mapToDomain(video);
    } catch (error) {
      console.error(`Error finding video by id: ${id}`, error);
      throw new Error(
        `Failed to find video: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async findByProcessamentoId(processamentoId: string): Promise<Video[]> {
    try {
      const videos = await this.prisma.video.findMany({
        where: { processamentoId },
        orderBy: { createdAt: 'asc' },
      });

      console.log(
        `Found ${videos.length} videos for processamento: ${processamentoId}`
      );

      return videos.map((v) => this.mapToDomain(v));
    } catch (error) {
      console.error(
        `Error finding videos for processamento: ${processamentoId}`,
        error
      );
      throw new Error(
        `Failed to find videos: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async updateStatus(
    videoId: string,
    status: VideoStatus,
    error?: string,
    processedAt?: Date
  ): Promise<Video> {
    try {
      const video = await this.prisma.video.update({
        where: { id: videoId },
        data: {
          status,
          error: error ?? null,
          processedAt: processedAt ?? null,
          updatedAt: new Date(),
        },
      });

      console.log(`Video status updated: ${videoId} -> ${status}`);

      await this.invalidateCacheByProcessamentoId(video.processamentoId);

      return this.mapToDomain(video);
    } catch (error) {
      console.error(`Error updating video status: ${videoId}`, error);
      throw new Error(
        `Failed to update video status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async delete(videoId: string): Promise<void> {
    try {
      const video = await this.prisma.video.findUnique({
        where: { id: videoId },
      });

      if (!video) {
        throw new Error(`Video not found: ${videoId}`);
      }

      await this.prisma.video.delete({
        where: { id: videoId },
      });

      console.log(`Video deleted from DB: ${videoId}`);

      await this.invalidateCacheByProcessamentoId(video.processamentoId);
    } catch (error) {
      console.error(`Error deleting video: ${videoId}`, error);
      throw new Error(
        `Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async deleteByProcessamentoId(processamentoId: string): Promise<void> {
    try {
      await this.prisma.video.deleteMany({
        where: { processamentoId },
      });

      console.log(
        `All videos deleted for processamento: ${processamentoId}`
      );

      await this.invalidateCacheByProcessamentoId(processamentoId);
    } catch (error) {
      console.error(
        `Error deleting videos for processamento: ${processamentoId}`,
        error
      );
      throw new Error(
        `Failed to delete videos: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async invalidateCacheByProcessamentoId(
    processamentoId: string
  ): Promise<void> {
    try {
      const processamento = await this.prisma.processamento.findFirst({
        where: { id: processamentoId },
        select: { clientId: true },
      });

      if (processamento?.clientId) {
        const pattern = `processamentos:${processamento.clientId}:*`;
        await this.cacheService.deletePattern(pattern);
        console.log(`Cache invalidated for pattern: ${pattern}`);
      }
    } catch (error) {
      console.error(
        `Failed to invalidate cache for processamento ${processamentoId}:`,
        error
      );
    }
  }

  private mapToDomain(data: any): Video {
    return new Video({
      id: data.id,
      fileName: data.fileName,
      fileFormat: data.fileFormat,
      processamentoId: data.processamentoId,
      status: data.status,
      inputUrlStorage: data.inputUrlStorage,
      outputUrlStorage: data.outputUrlStorage,
      size: data.size,
      error: data.error,
      uploadedAt: data.uploadedAt,
      processedAt: data.processedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}

