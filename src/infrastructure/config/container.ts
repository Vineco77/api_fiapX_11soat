import { container } from 'tsyringe';
import { S3StorageService } from '@/infrastructure/storage/s3-storage.service';
import { RedisCacheService } from '@/infrastructure/cache/redis-cache.service';
import { RabbitMQQueueService } from '@/infrastructure/queue/rabbitmq-queue.service';
import { PrismaVideoRepository } from '@/infrastructure/database/repositories/prisma-video.repository';
import { ProcessVideoUseCase } from '@/application/use-cases/process-video.use-case';
import { GetVideosUseCase } from '@/application/use-cases/get-videos.use-case';

container.registerSingleton<S3StorageService>('S3StorageService', S3StorageService);

container.registerSingleton<RedisCacheService>('CacheService', RedisCacheService);

container.registerSingleton<RabbitMQQueueService>('QueueRepository', RabbitMQQueueService);

container.registerSingleton<PrismaVideoRepository>(
  'VideoRepository',
  PrismaVideoRepository
);

container.registerSingleton<ProcessVideoUseCase>(
  'ProcessVideoUseCase',
  ProcessVideoUseCase
);

container.registerSingleton<GetVideosUseCase>(
  'GetVideosUseCase',
  GetVideosUseCase
);

export { container } from 'tsyringe';
