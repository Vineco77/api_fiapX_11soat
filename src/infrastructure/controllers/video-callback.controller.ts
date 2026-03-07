import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { VideoCallbackUseCase } from '@/application/use-cases';
import { VideoCallbackDTO } from '@/domain/dtos';
import { logger } from '@/infrastructure/monitoring';

export class VideoCallbackController {
  async callback(req: Request, res: Response): Promise<void> {
    const callbackData = req.body as VideoCallbackDTO;

    logger.info({
      tag: 'video-callback.controller',
      videoId: callbackData.id,
      jobId: callbackData.id_processamento,
      status: callbackData.status,
      msg: 'Received callback request from Worker',
    });

    if (!callbackData.id || !callbackData.id_processamento || !callbackData.status) {
      logger.warn({
        tag: 'video-callback.controller',
        body: callbackData,
        msg: 'Missing required fields in callback',
      });
      
      res.status(400).json({
        success: false,
        error: 'Missing required fields: id, id_processamento, status',
      });
      return;
    }

    const validStatuses = ['COMPLETED', 'FAILED'];
    if (!validStatuses.includes(callbackData.status)) {
      logger.warn({
        tag: 'video-callback.controller',
        status: callbackData.status,
        msg: 'Invalid status value',
      });
      
      res.status(400).json({
        success: false,
        error: 'Invalid status. Must be COMPLETED or FAILED',
      });
      return;
    }

    if (callbackData.status === 'FAILED' && !callbackData.error) {
      logger.warn({
        tag: 'video-callback.controller',
        videoId: callbackData.id,
        msg: 'Error message missing for FAILED status',
      });
      
      res.status(400).json({
        success: false,
        error: 'Error message is required when status is FAILED',
      });
      return;
    }

    try {
      const useCase = container.resolve(VideoCallbackUseCase);
      await useCase.execute(callbackData);

      logger.info({
        tag: 'video-callback.controller',
        videoId: callbackData.id,
        jobId: callbackData.id_processamento,
        msg: 'Callback processed successfully',
      });

      res.status(200).json({
        success: true,
        message: 'Status updated successfully',
      });
    } catch (error) {
      logger.error({
        tag: 'video-callback.controller',
        videoId: callbackData.id,
        jobId: callbackData.id_processamento,
        error: error instanceof Error ? error.message : 'Unknown error',
        msg: 'Failed to process callback',
      });

      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update video status',
      });
    }
  }
}
