import { Video } from '../entities/video.entity';
import { VideoStatus } from '@prisma/client';

export interface IVideoRepository {
  /**
   * Cria um novo Vídeo no banco de dados
   */
  create(data: CreateVideoData): Promise<Video>;

  /**
   * Cria múltiplos vídeos de uma vez
   */
  createMany(videos: CreateVideoData[]): Promise<Video[]>;

  /**
   * Busca um Vídeo pelo ID
   */
  findById(id: string): Promise<Video | null>;

  /**
   * Busca todos os vídeos de um Processamento
   */
  findByProcessamentoId(processamentoId: string): Promise<Video[]>;

  /**
   * Atualiza o status de um vídeo específico
   */
  updateStatus(
    videoId: string,
    status: VideoStatus,
    error?: string,
    processedAt?: Date
  ): Promise<Video>;

  /**
   * Deleta um vídeo específico
   */
  delete(videoId: string): Promise<void>;

  /**
   * Deleta todos os vídeos de um Processamento
   */
  deleteByProcessamentoId(processamentoId: string): Promise<void>;
}

export interface CreateVideoData {
  id?: string; // ID opcional - se não fornecido, Prisma gera automaticamente
  fileName: string;
  fileFormat: string;
  processamentoId: string;
  inputUrlStorage: string;
  outputUrlStorage: string;
  size: bigint;
  status?: VideoStatus;
}
