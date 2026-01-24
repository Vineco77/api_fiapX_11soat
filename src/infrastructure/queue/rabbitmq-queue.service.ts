import { injectable } from 'tsyringe';
import { IQueueRepository } from '@/domain/repositories';
import { VideoProcessingMessageDTO } from '@/domain/dtos';
import { rabbitmqClient } from './rabbitmq-client';
import { appConfig } from '../config/env';

@injectable()
export class RabbitMQQueueService implements IQueueRepository {
  async publishVideoProcessing(message: VideoProcessingMessageDTO): Promise<void> {
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

      console.log(`[RabbitMQ] Message published to ${queue}:`, {
        jobId: message.jobId,
        clientId: message.clientId,
        framesPerSecond: message.framesPerSecond,
        format: message.format,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[RabbitMQ] Failed to publish message:', errorMessage);

      throw new Error(`RabbitMQ unavailable: ${errorMessage}`);
    }
  }

  async close(): Promise<void> {
    await rabbitmqClient.close();
  }
}
