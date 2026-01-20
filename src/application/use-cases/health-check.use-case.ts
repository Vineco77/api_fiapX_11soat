import { injectable } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import amqp from 'amqplib';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    postgres: ServiceStatus;
    redis: ServiceStatus;
    rabbitmq: ServiceStatus;
  };
  uptime: number;
}

interface ServiceStatus {
  status: 'ok' | 'error';
  responseTime?: number;
  error?: string;
}

@injectable()
export class HealthCheckUseCase {
  private prisma: PrismaClient;
  private redis: Redis;

  constructor() {
    this.prisma = new PrismaClient();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });
  }

  async execute(): Promise<HealthCheckResult> {
    const [postgresStatus, redisStatus, rabbitmqStatus] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkRabbitMQ(),
    ]);

    const services = {
      postgres: postgresStatus,
      redis: redisStatus,
      rabbitmq: rabbitmqStatus,
    };

    const status = this.determineOverallStatus(services);

    return {
      status,
      timestamp: new Date().toISOString(),
      services,
      uptime: process.uptime(),
    };
  }

  private async checkPostgres(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;
      return { status: 'ok', responseTime };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkRedis(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      await this.redis.ping();
      const responseTime = Date.now() - start;
      return { status: 'ok', responseTime };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkRabbitMQ(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      const connection = await amqp.connect({
        protocol: 'amqp',
        hostname: process.env.RABBITMQ_HOST || 'localhost',
        port: Number(process.env.RABBITMQ_PORT) || 5672,
        username: process.env.RABBITMQ_USER || 'guest',
        password: process.env.RABBITMQ_PASSWORD || 'guest',
        heartbeat: 2,
      });
      
      await connection.close();
      const responseTime = Date.now() - start;
      return { status: 'ok', responseTime };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private determineOverallStatus(services: HealthCheckResult['services']): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(services).map((s) => s.status);

    if (statuses.every((s) => s === 'ok')) {
      return 'healthy';
    }

    if (services.postgres.status === 'error') {
      return 'unhealthy';
    }

    return 'degraded';
  }

  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
    this.redis.disconnect();
  }
}
