import { injectable, inject } from 'tsyringe';
import { getPrismaClient } from '@/infrastructure/database/prisma-client';
import type {
  IProcessamentoRepository,
  CreateProcessamentoData,
} from '@/domain/repositories/processamento.repository.interface';
import type { ICacheService } from '@/domain/repositories/cache.interface';
import { Processamento } from '@/domain/entities/processamento.entity';
import { Video } from '@/domain/entities/video.entity';
import { VideoStatus } from '@prisma/client';

@injectable()
export class PrismaProcessamentoRepository
  implements IProcessamentoRepository
{
  private readonly prisma = getPrismaClient();

  constructor(
    @inject('CacheService') private readonly cacheService: ICacheService
  ) {}

  async create(data: CreateProcessamentoData): Promise<Processamento> {
    try {
      const processamento = await this.prisma.processamento.create({
        data: {
          jobId: data.jobId,
          clientId: data.clientId,
          email: data.email,
          framesPerSecond: data.framesPerSecond,
          format: data.format,
          size: data.size ?? BigInt(0),
          error: data.error ?? null,
        },
        include: {
          videos: true,
        },
      });

      console.log(`Processamento created in DB: ${processamento.jobId}`);

      await this.invalidateClientCache(data.clientId);

      return this.mapToDomain(processamento);
    } catch (error) {
      console.error('Error creating processamento in DB:', error);
      throw new Error(
        `Failed to create processamento: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async findByJobId(jobId: string): Promise<Processamento | null> {
    try {
      const processamento = await this.prisma.processamento.findUnique({
        where: { jobId },
        include: {
          videos: true,
        },
      });

      if (!processamento) {
        return null;
      }

      return this.mapToDomain(processamento);
    } catch (error) {
      console.error(
        `Error finding processamento by jobId: ${jobId}`,
        error
      );
      throw new Error(
        `Failed to find processamento: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async findById(id: string): Promise<Processamento | null> {
    try {
      const processamento = await this.prisma.processamento.findUnique({
        where: { id },
        include: {
          videos: true,
        },
      });

      if (!processamento) {
        return null;
      }

      return this.mapToDomain(processamento);
    } catch (error) {
      console.error(`Error finding processamento by id: ${id}`, error);
      throw new Error(
        `Failed to find processamento: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async findByClientId(
    clientId: string,
    skip: number,
    take: number,
    status?: string
  ): Promise<{ processamentos: Processamento[]; total: number }> {
    try {
      const where: any = { clientId };

      if (status) {
        where.videos = {
          some: {
            status: status.toUpperCase() as VideoStatus,
          },
        };
      }

      const [processamentos, total] = await Promise.all([
        this.prisma.processamento.findMany({
          where,
          include: {
            videos: true,
          },
          orderBy: { uploadedAt: 'desc' },
          skip,
          take,
        }),
        this.prisma.processamento.count({
          where,
        }),
      ]);

      console.log(
        `Found ${processamentos.length} processamentos for clientId: ${clientId} (skip: ${skip}, take: ${take})`
      );

      return {
        processamentos: processamentos.map((p) => this.mapToDomain(p)),
        total,
      };
    } catch (error) {
      console.error(
        `Error finding processamentos for clientId: ${clientId}`,
        error
      );
      throw new Error(
        `Failed to find processamentos: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async updateTotalSize(jobId: string, totalSize: bigint): Promise<void> {
    try {
      await this.prisma.processamento.update({
        where: { jobId },
        data: {
          size: totalSize,
          updatedAt: new Date(),
        },
      });

      console.log(`Processamento total size updated: ${jobId}`);

      const clientId = await this.getClientIdByJobId(jobId);
      if (clientId) {
        await this.invalidateClientCache(clientId);
      }
    } catch (error) {
      console.error(
        `Error updating processamento total size: ${jobId}`,
        error
      );
      throw new Error(
        `Failed to update total size: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async updateError(jobId: string, error: string): Promise<void> {
    try {
      await this.prisma.processamento.update({
        where: { jobId },
        data: {
          error,
          updatedAt: new Date(),
        },
      });

      console.log(`Processamento error updated: ${jobId}`);

      const clientId = await this.getClientIdByJobId(jobId);
      if (clientId) {
        await this.invalidateClientCache(clientId);
      }
    } catch (error) {
      console.error(`Error updating processamento error: ${jobId}`, error);
      throw new Error(
        `Failed to update error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async markAsProcessed(jobId: string): Promise<void> {
    try {
      await this.prisma.processamento.update({
        where: { jobId },
        data: {
          processedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      console.log(`Processamento marked as processed: ${jobId}`);

      const clientId = await this.getClientIdByJobId(jobId);
      if (clientId) {
        await this.invalidateClientCache(clientId);
      }
    } catch (error) {
      console.error(
        `Error marking processamento as processed: ${jobId}`,
        error
      );
      throw new Error(
        `Failed to mark as processed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async delete(jobId: string): Promise<void> {
    try {
      const clientId = await this.getClientIdByJobId(jobId);

      await this.prisma.processamento.delete({
        where: { jobId },
      });

      console.log(
        `Processamento deleted from DB (cascade): ${jobId}`
      );

      if (clientId) {
        await this.invalidateClientCache(clientId);
      }
    } catch (error) {
      console.error(`Error deleting processamento: ${jobId}`, error);
      throw new Error(
        `Failed to delete processamento: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getEmailByJobId(jobId: string): Promise<string | null> {
    try {
      const processamento = await this.prisma.processamento.findUnique({
        where: { jobId },
        select: { email: true },
      });

      return processamento?.email ?? null;
    } catch (error) {
      console.error(`Error fetching email for jobId: ${jobId}`, error);
      return null;
    }
  }

  async getClientIdByJobId(jobId: string): Promise<string | null> {
    try {
      const processamento = await this.prisma.processamento.findUnique({
        where: { jobId },
        select: { clientId: true },
      });

      return processamento?.clientId ?? null;
    } catch (error) {
      console.error(`Error fetching clientId for jobId: ${jobId}`, error);
      return null;
    }
  }

  private async invalidateClientCache(clientId: string): Promise<void> {
    try {
      const pattern = `processamentos:${clientId}:*`;
      await this.cacheService.deletePattern(pattern);
      console.log(`Cache invalidated for pattern: ${pattern}`);
    } catch (error) {
      console.error(`Failed to invalidate cache for clientId ${clientId}:`, error);
    }
  }

  private mapToDomain(data: any): Processamento {
    return new Processamento({
      id: data.id,
      jobId: data.jobId,
      clientId: data.clientId,
      email: data.email,
      framesPerSecond: data.framesPerSecond,
      format: data.format,
      size: data.size,
      error: data.error,
      uploadedAt: data.uploadedAt,
      processedAt: data.processedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      videos: data.videos
        ? data.videos.map(
            (v: any) =>
              new Video({
                id: v.id,
                fileName: v.fileName,
                fileFormat: v.fileFormat,
                processamentoId: v.processamentoId,
                status: v.status,
                inputUrlStorage: v.inputUrlStorage,
                outputUrlStorage: v.outputUrlStorage,
                size: v.size,
                error: v.error,
                uploadedAt: v.uploadedAt,
                processedAt: v.processedAt,
                createdAt: v.createdAt,
                updatedAt: v.updatedAt,
              })
          )
        : [],
    });
  }
}
