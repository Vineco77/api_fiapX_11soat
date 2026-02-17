import { container } from 'tsyringe';
import { S3StorageService } from '@/infrastructure/storage/s3-storage.service';
import { RedisCacheService } from '@/infrastructure/cache/redis-cache.service';
import { RabbitMQQueueService } from '@/infrastructure/queue/rabbitmq-queue.service';
import { PrismaProcessamentoRepository } from '@/infrastructure/database/repositories/prisma-processamento.repository';
import { PrismaVideoRepository } from '@/infrastructure/database/repositories/prisma-video.repository';
import { ProcessVideoUseCase } from '@/application/use-cases/process-video.use-case';
import { GetVideosUseCase } from '@/application/use-cases/get-videos.use-case';

// Storage
container.registerSingleton<S3StorageService>('S3StorageService', S3StorageService);

// Cache
container.registerSingleton<RedisCacheService>('CacheService', RedisCacheService);

// Queue
container.registerSingleton<RabbitMQQueueService>('QueueRepository', RabbitMQQueueService);

// Repositories
container.registerSingleton<PrismaProcessamentoRepository>(
  'ProcessamentoRepository',
  PrismaProcessamentoRepository
);

container.registerSingleton<PrismaVideoRepository>(
  'VideoRepository',
  PrismaVideoRepository
);

// Use Cases
container.registerSingleton<ProcessVideoUseCase>(
  'ProcessVideoUseCase',
  ProcessVideoUseCase
);

container.registerSingleton<GetVideosUseCase>(
  'GetVideosUseCase',
  GetVideosUseCase
);

export { container } from 'tsyringe';
