import { createClient, RedisClientType } from 'redis';
import { appConfig } from '@/infrastructure/config/env';

class RedisClientSingleton {
  private static instance: RedisClientType | null = null;
  private static connecting: Promise<RedisClientType> | null = null;

  static async getInstance(): Promise<RedisClientType> {
    if (this.instance?.isOpen) {
      return this.instance;
    }

    if (this.connecting) {
      return this.connecting;
    }

    this.connecting = this.connect();
    this.instance = await this.connecting;
    this.connecting = null;

    return this.instance;
  }

  private static async connect(): Promise<RedisClientType> {
    const client = createClient({
      url: appConfig.redis.url,
      socket: {
        connectTimeout: 10000,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('❌ Redis: Max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          const delay = Math.min(retries * 100, 3000);
          console.log(`🔄 Redis: Reconnecting... (attempt ${retries}, delay ${delay}ms)`);
          return delay;
        },
      },
    });

    client.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
    });

    client.on('connect', () => {
      console.log('🔗 Redis: Connected');
    });

    client.on('ready', () => {
      console.log('✅ Redis: Ready');
    });

    client.on('reconnecting', () => {
      console.log('🔄 Redis: Reconnecting...');
    });

    await client.connect();
    return client as RedisClientType;
  }

  static async disconnect(): Promise<void> {
    if (this.instance?.isOpen) {
      await this.instance.quit();
      this.instance = null;
    }
  }
}

export { RedisClientSingleton };
