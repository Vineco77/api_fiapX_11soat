import { injectable } from 'tsyringe';
import { Video, VideoStatus } from '@prisma/client';
import { getPrismaClient } from '@/infrastructure/database/prisma-client';
import type {
  IVideoRepository,
  CreateVideoData,
} from '@/domain/repositories/video.repository.interface';

/**
 * Implementação do repositório de vídeos usando Prisma
 * Performance: Queries otimizadas com índices e paginação eficiente
 */
@injectable()
export class PrismaVideoRepository implements IVideoRepository {
  private readonly prisma = getPrismaClient();

  /**
   * Cria um novo registro de vídeo
   * Performance: Usa transação implícita do Prisma
   */
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
          status: VideoStatus.PENDING, // Status inicial sempre PENDING
        },
      });

      console.log(`✅ Video created in DB: ${video.jobId}`);
      return video;
    } catch (error) {
      console.error('❌ Error creating video in DB:', error);
      throw new Error(
        `Failed to create video: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Busca um vídeo por jobId
   * Performance: Usa índice único no jobId
   */
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

  /**
   * Lista vídeos de um cliente com paginação
   * Performance: Usa índice no clientId e paginação eficiente (skip + take)
   */
  async findByClientId(
    clientId: string,
    page: number,
    limit: number
  ): Promise<{ videos: Video[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      // Performance: Executa queries em paralelo
      const [videos, total] = await Promise.all([
        this.prisma.video.findMany({
          where: { clientId },
          orderBy: { createdAt: 'desc' }, // Mais recentes primeiro
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

  /**
   * Lista vídeos por email com paginação e filtros
   * Performance: Usa índice no email e filtro por status (opcional)
   */
  async findByClientEmail(
    email: string,
    skip: number,
    take: number,
    status?: string
  ): Promise<{ videos: Video[]; total: number }> {
    try {
      // Construir where clause dinamicamente
      const where: any = { email };
      
      if (status) {
        where.status = status.toUpperCase() as VideoStatus;
      }

      // Performance: Executa queries em paralelo
      const [videos, total] = await Promise.all([
        this.prisma.video.findMany({
          where,
          orderBy: { uploadedAt: 'desc' }, // Mais recentes primeiro
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

  /**
   * Atualiza o status de um vídeo
   * Performance: Update direto com where único
   */
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
          updatedAt: new Date(), // Força atualização do timestamp
        },
      });

      console.log(`✅ Video status updated: ${jobId} -> ${status}`);
      return video;
    } catch (error) {
      console.error(`❌ Error updating video status: ${jobId}`, error);
      throw new Error(
        `Failed to update video status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Deleta um vídeo por jobId
   * Performance: Delete direto com where único
   */
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
