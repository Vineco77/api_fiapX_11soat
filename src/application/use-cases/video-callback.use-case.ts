import { inject, injectable } from 'tsyringe';
import { VideoStatus } from '@prisma/client';
import type { IVideoRepository } from '@/domain/repositories/video.repository.interface';
import type { IProcessamentoRepository } from '@/domain/repositories/processamento.repository.interface';
import { VideoCallbackDTO } from '@/domain/dtos';
import { logger } from '@/infrastructure/monitoring';

@injectable()
export class VideoCallbackUseCase {
  constructor(
    @inject('VideoRepository')
    private readonly videoRepository: IVideoRepository,
    @inject('ProcessamentoRepository')
    private readonly processamentoRepository: IProcessamentoRepository
  ) {}

  async execute(input: VideoCallbackDTO): Promise<void> {
    const { id: videoId, id_processamento, status, error } = input;

    logger.info({
      tag: 'video-callback.use-case',
      videoId,
      jobId: id_processamento,
      status,
      error,
      msg: 'Received video callback from Worker',
    });

    const video = await this.videoRepository.findById(videoId);
    if (!video) {
      logger.warn({
        tag: 'video-callback.use-case',
        videoId,
        msg: 'Video not found',
      });
      throw new Error(`Video not found: ${videoId}`);
    }

    const processamento = await this.processamentoRepository.findByJobId(id_processamento);
    if (!processamento) {
      logger.warn({
        tag: 'video-callback.use-case',
        jobId: id_processamento,
        msg: 'Processamento not found',
      });
      throw new Error(`Processamento not found: ${id_processamento}`);
    }

    if (!video.belongsToProcessamento(processamento.id)) {
      logger.warn({
        tag: 'video-callback.use-case',
        videoId,
        videoProcessamentoId: video.processamentoId,
        processamentoId: processamento.id,
        jobId: id_processamento,
        msg: 'Video does not belong to the specified processamento',
      });
      throw new Error(
        `Video ${videoId} does not belong to processamento ${id_processamento}`
      );
    }

    const validStatus: VideoStatus[] = [VideoStatus.COMPLETED, VideoStatus.FAILED];
    const videoStatus = status as VideoStatus;
    
    if (!validStatus.includes(videoStatus)) {
      logger.error({
        tag: 'video-callback.use-case',
        videoId,
        status,
        msg: 'Invalid status received',
      });
      throw new Error(`Invalid status: ${status}. Must be COMPLETED or FAILED`);
    }

    if (videoStatus === VideoStatus.FAILED && !error) {
      logger.error({
        tag: 'video-callback.use-case',
        videoId,
        status,
        msg: 'Error message is required for FAILED status',
      });
      throw new Error('Error message is required when status is FAILED');
    }

    const processedAt = videoStatus === VideoStatus.COMPLETED ? new Date() : undefined;
    
    await this.videoRepository.updateStatus(
      videoId,
      videoStatus,
      error,
      processedAt
    );

    logger.info({
      tag: 'video-callback.use-case',
      videoId,
      jobId: id_processamento,
      status: videoStatus,
      msg: 'Video status updated successfully',
    });
  }
}
