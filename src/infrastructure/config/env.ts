import { config } from 'dotenv';

// Carrega variáveis de ambiente
config();

export const appConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3001,
  apiVersion: process.env.API_VERSION || 'v1',

  databaseUrl: process.env.DATABASE_URL || '',

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
  },

  rabbitmq: {
    host: process.env.RABBITMQ_HOST || 'localhost',
    port: Number(process.env.RABBITMQ_PORT) || 5672,
    user: process.env.RABBITMQ_USER || 'guest',
    password: process.env.RABBITMQ_PASSWORD || 'guest',
    url: process.env.RABBITMQ_URL || `amqp://${process.env.RABBITMQ_USER || 'guest'}:${process.env.RABBITMQ_PASSWORD || 'guest'}@${process.env.RABBITMQ_HOST || 'localhost'}:${process.env.RABBITMQ_PORT || 5672}`,
    queues: {
      videoProcessing: process.env.RABBITMQ_QUEUE_PROCESSING || 'video.processing',
      videoCompleted: process.env.RABBITMQ_QUEUE_COMPLETED || 'video.completed',
    },
  },

  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3Bucket: process.env.AWS_S3_BUCKET || '',
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || '',
    authGate: process.env.AUTH_GATE || 'http://localhost:4000',
    mockAuth: process.env.MOCK_AUTH === 'false',
  },

  elasticsearch: {
    host: process.env.ELASTICSEARCH_HOST || 'localhost',
    port: Number(process.env.ELASTICSEARCH_PORT) || 9200,
    url: process.env.ELASTICSEARCH_URL || `http://${process.env.ELASTICSEARCH_HOST || 'localhost'}:${process.env.ELASTICSEARCH_PORT || 9200}`,
    index: process.env.ELASTICSEARCH_INDEX || 'api-fiapx-logs',
  },

  limits: {
    maxFps: Number(process.env.MAX_FPS) || 60,
    maxVideoDurationMinutes: Number(process.env.MAX_VIDEO_DURATION_MINUTES) || 10,
    signedUrlExpirationDays: Number(process.env.SIGNED_URL_EXPIRATION_DAYS) || 7,
    maxVideosPerRequest: Number(process.env.MAX_VIDEOS_PER_REQUEST) || 10,
    maxFileSizeMB: Number(process.env.MAX_FILE_SIZE_MB) || 500,
    cacheTTLSeconds: Number(process.env.CACHE_TTL_SECONDS) || 300,
  },
};


export function validateEnvVars(): void {
  const requiredVars = [
    'DATABASE_URL',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_BUCKET',
    'JWT_SECRET',
    'AUTH_GATE',
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('Missing required environment variables:');
    missingVars.forEach((varName) => console.error(`   - ${varName}`));
    process.exit(1);
  }
}

export const env = {
  ...appConfig,
  JWT_SECRET: appConfig.auth.jwtSecret,
  AUTH_GATE: appConfig.auth.authGate,
  MOCK_AUTH: appConfig.auth.mockAuth,
};
