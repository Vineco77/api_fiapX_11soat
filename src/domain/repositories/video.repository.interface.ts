import { Video, VideoStatus } from '@prisma/client';

export interface IVideoRepository {
  create(data: CreateVideoData): Promise<Video>;

  findByJobId(jobId: string): Promise<Video | null>;

  findByClientId(
    clientId: string,
    page: number,
    limit: number
  ): Promise<{ videos: Video[]; total: number }>;

  /**
   * Lista vídeos de um cliente por email com paginação e filtros
   * @param email - Email do cliente (vem do JWT)
   * @param skip - Número de registros a pular (para paginação)
   * @param take - Número de registros a retornar
   * @param status - Filtro opcional por status
   */
  findByClientEmail(
    email: string,
    skip: number,
    take: number,
    status?: string
  ): Promise<{ videos: Video[]; total: number }>;

  getEmailByJobId(jobId: string): Promise<string | null>;

  updateStatus(
    jobId: string,
    status: VideoStatus,
    error?: string
  ): Promise<Video>;

  delete(jobId: string): Promise<void>;
}

export interface CreateVideoData {
  jobId: string;
  clientId: string;
  email: string;
  framesPerSecond: number;
  inputUrlStorage: string;
  outputUrlStorage: string;
  size: bigint;
  format: string;
}
