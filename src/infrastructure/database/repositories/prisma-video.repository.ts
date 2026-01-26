import { injectable, inject } from 'tsyringe';
import { Video, VideoStatus } from '@prisma/client';
import { getPrismaClient } from '@/infrastructure/database/prisma-client';
import type {
  IVideoRepository,
  CreateVideoData,
} from '@/domain/repositories/video.repository.interface';
import type { ICacheService } from '@/domain/repositories/cache.interface';


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
          jobId: data.jobId,
          clientId: data.clientId,
          email: data.email,
          framesPerSecond: data.framesPerSecond,
          inputUrlStorage: data.inputUrlStorage,
          outputUrlStorage: data.outputUrlStorage,
          size: data.size,
          format: data.format,
          status: VideoStatus.PENDING,
        },
      });

      console.log(`✅ Video created in DB: ${video.jobId}`);

      await this.invalidateClientCache(data.email);

      return video;
    } catch (error) {
      console.error('❌ Error creating video in DB:', error);
      throw new Error(
        `Failed to create video: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async findByJobId(jobId: string): Promise<Video | null> {
    try {
      const video = await this.prisma.video.findUnique({
        where: { jobId },
      });

      return video;
    } catch (error) {
      console.error(`❌ Error finding video by jobId: ${jobId}`, error);
      throw new Error(
        `Failed to find video: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async findByClientId(
    clientId: string,
    page: number,
    limit: number
  ): Promise<{ videos: Video[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const [videos, total] = await Promise.all([
        this.prisma.video.findMany({
          where: { clientId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.video.count({
          where: { clientId },
        }),
      ]);

      console.log(
        `✅ Found ${videos.length} videos for client: ${clientId} (page ${page})`
      );

      return { videos, total };
    } catch (error) {
      console.error(`❌ Error finding videos for client: ${clientId}`, error);
      throw new Error(
        `Failed to find videos: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async findByClientEmail(
    email: string,
    skip: number,
    take: number,
    status?: string
  ): Promise<{ videos: Video[]; total: number }> {
    try {
      const where: any = { email };
      
      if (status) {
        where.status = status.toUpperCase() as VideoStatus;
      }

      const [videos, total] = await Promise.all([
        this.prisma.video.findMany({
          where,
          orderBy: { uploadedAt: 'desc' },
          skip,
          take,
        }),
        this.prisma.video.count({
          where,
        }),
      ]);

      console.log(
        `✅ Found ${videos.length} videos for email: ${email} (skip: ${skip}, take: ${take})`
      );

      return { videos, total };
    } catch (error) {
      console.error(`❌ Error finding videos for email: ${email}`, error);
      throw new Error(
        `Failed to find videos: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getEmailByJobId(jobId: string): Promise<string | null> {
    try {
      const video = await this.prisma.video.findUnique({
        where: { jobId },
        select: { email: true },
      });

      return video?.email ?? null;
    } catch (error) {
      console.error(`❌ Error fetching email for jobId: ${jobId}`, error);
      return null;
    }
  }

  private async invalidateClientCache(email: string): Promise<void> {
    try {
      const pattern = `videos:${email}:*`;
      await this.cacheService.deletePattern(pattern);
      console.log(`🗑️  Cache invalidated for pattern: ${pattern}`);
    } catch (error) {
      console.error(`⚠️  Failed to invalidate cache for ${email}:`, error);
    }
  }

  async updateStatus(
    jobId: string,
    status: VideoStatus,
    error?: string
  ): Promise<Video> {
    try {
      const video = await this.prisma.video.update({
        where: { jobId },
        data: {
          status,
          error: error ?? null,
          updatedAt: new Date(),
        },
      });

      console.log(`✅ Video status updated: ${jobId} -> ${status}`);

      const email = await this.getEmailByJobId(jobId);
      if (email) {
        await this.invalidateClientCache(email);
      }

      return video;
    } catch (error) {
      console.error(`❌ Error updating video status: ${jobId}`, error);
      throw new Error(
        `Failed to update video status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async delete(jobId: string): Promise<void> {
    try {
      await this.prisma.video.delete({
        where: { jobId },
      });

      console.log(`✅ Video deleted from DB: ${jobId}`);
    } catch (error) {
      console.error(`❌ Error deleting video: ${jobId}`, error);
      throw new Error(
        `Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
