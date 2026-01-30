import { S3Client } from '@aws-sdk/client-s3';
import { appConfig } from './env';

class S3ClientSingleton {
  private static instance: S3Client | null = null;

  private constructor() {}

  public static getInstance(): S3Client {
    if (!S3ClientSingleton.instance) {
      S3ClientSingleton.instance = new S3Client({
        region: appConfig.aws.region,
        credentials: {
          accessKeyId: appConfig.aws.accessKeyId,
          secretAccessKey: appConfig.aws.secretAccessKey,
        },
        // Performance: Configurações otimizadas
        maxAttempts: 3,
        requestHandler: {
          connectionTimeout: 30010, // 30s
          requestTimeout: 300100, // 5min (vídeos grandes)
        },
      });

      console.log('✅ S3 Client initialized');
    }

    return S3ClientSingleton.instance;
  }

  public static destroy(): void {
    if (S3ClientSingleton.instance) {
      S3ClientSingleton.instance.destroy();
      S3ClientSingleton.instance = null;
      console.log('🔌 S3 Client destroyed');
    }
  }
}

export const getS3Client = (): S3Client => S3ClientSingleton.getInstance();
export const destroyS3Client = (): void => S3ClientSingleton.destroy();
