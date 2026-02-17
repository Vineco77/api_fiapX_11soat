import { injectable } from 'tsyringe';
import { IQueueRepository } from '@/domain/repositories';
import { VideoProcessingMessageDTO } from '@/domain/dtos';
import { logRabbitMQOperation } from '@/infrastructure/monitoring';
import { rabbitmqClient } from './rabbitmq-client';
import { appConfig } from '../config/env';

@injectable()
export class RabbitMQQueueService implements IQueueRepository {
  async publishVideoProcessing(message: VideoProcessingMessageDTO): Promise<void> {
    const startTime = Date.now();
    try {
      const channel = await rabbitmqClient.getChannel();
      const queue = appConfig.rabbitmq.queues.videoProcessing;

      const messageBuffer = Buffer.from(JSON.stringify(message));

      const sent = channel.sendToQueue(queue, messageBuffer, {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now(),
      });

      if (!sent) {
        throw new Error('Failed to send message to queue (buffer full)');
      }

      const duration = Date.now() - startTime;
      logRabbitMQOperation({
        operation: 'publish',
        queue,
        messageId: message.person.email,
        jobId: message.videos[0]?.id_processamento ?? 'unknown',
        duration,
        success: true,
      });

      console.log(`[RabbitMQ] Message published to ${queue}:`, {
        person: {
          clientId: message.person.clientId,
          email: message.person.email,
        },
        totalVideos: message.videos.length,
        jobId: message.videos[0]?.id_processamento,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const duration = Date.now() - startTime;
      logRabbitMQOperation({
        operation: 'publish',
        queue: appConfig.rabbitmq.queues.videoProcessing,
        jobId: message.videos[0]?.id_processamento ?? 'unknown',
        duration,
        success: false,
        error: errorMessage,
      });
      
      console.error('[RabbitMQ] Failed to publish message:', errorMessage);

      throw new Error(`RabbitMQ unavailable: ${errorMessage}`);
    }
  }

  async close(): Promise<void> {
    await rabbitmqClient.close();
  }
}
