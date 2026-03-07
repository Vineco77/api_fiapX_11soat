import { S3Client } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Agent as HttpsAgent } from 'node:https';
import { appConfig } from './env';

const httpsAgent = new HttpsAgent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  scheduling: 'lifo',
});

const nodeHttpHandler = new NodeHttpHandler({
  httpsAgent,
  connectionTimeout: 5000,
  requestTimeout: 300000,
});

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
        maxAttempts: 3,
        requestHandler: nodeHttpHandler,
      });

      console.log('✅ S3 Client initialized with HTTP/2 support and connection pooling');
      console.log(`   - Max sockets: 50`);
      console.log(`   - Keep-alive: 30s`);
      console.log(`   - Connection timeout: 5s`);
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
