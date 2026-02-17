import { injectable } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import amqp from 'amqplib';
import axios from 'axios';
import { HeadBucketCommand } from '@aws-sdk/client-s3';
import { getS3Client } from '@/infrastructure/config/s3-client';
import { appConfig } from '@/infrastructure/config/env';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    postgres: ServiceStatus;
    redis: ServiceStatus;
    rabbitmq: ServiceStatus;
    s3: ServiceStatus;
    auth: ServiceStatus;
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
  private readonly prisma: PrismaClient;
  private readonly redis: Redis;
  private readonly s3Client = getS3Client();
  private readonly bucket = appConfig.aws.s3Bucket;

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
    const [postgresStatus, redisStatus, rabbitmqStatus, s3Status, authStatus] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkRabbitMQ(),
      this.checkS3(),
      this.checkAuthService(),
    ]);

    const services = {
      postgres: postgresStatus,
      redis: redisStatus,
      rabbitmq: rabbitmqStatus,
      s3: s3Status,
      auth: authStatus,
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

  private async checkS3(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      const command = new HeadBucketCommand({
        Bucket: this.bucket,
      });
      
      await this.s3Client.send(command);
      const responseTime = Date.now() - start;
      return { status: 'ok', responseTime };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error S3',
      };
    }
  }

  private async checkAuthService(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      const authGateUrl = appConfig.auth.authGate;
      const healthUrl = `${authGateUrl}/healthAPI`;
      
      // Verifica apenas se o Auth Service está respondendo (conectividade)
      const response = await axios.get(healthUrl, {
        timeout: 5000,
      });

      const responseTime = Date.now() - start;
      
      if (response.status === 200) {
        return { status: 'ok', responseTime };
      }
      
      return {
        status: 'error',
        error: `Unexpected status code: ${response.status}`,
      };
    } catch (error: any) {
      let errorMessage = 'Unknown error';
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        errorMessage = 'Auth Service unavailable';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      return {
        status: 'error',
        error: errorMessage,
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
