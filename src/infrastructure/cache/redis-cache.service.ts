import { injectable } from 'tsyringe';
import { RedisClientSingleton } from './redis-client';
import type { ICacheService } from '@/domain/repositories/cache.interface';

@injectable()
export class RedisCacheService implements ICacheService {
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    const client = await RedisClientSingleton.getInstance();
    const serialized = JSON.stringify(value);
    await client.setEx(key, ttlSeconds, serialized);
  }

  async get<T>(key: string): Promise<T | null> {
    const client = await RedisClientSingleton.getInstance();
    const value = await client.get(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`❌ Error parsing cache key "${key}":`, error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const client = await RedisClientSingleton.getInstance();
    await client.del(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const client = await RedisClientSingleton.getInstance();
    
    const keys = await client.keys(pattern);

    if (keys && keys.length > 0) {
      await Promise.all(keys.map((key) => client.del(key)));
    }
  }

  async exists(key: string): Promise<boolean> {
    const client = await RedisClientSingleton.getInstance();
    const result = await client.exists(key);
    return result === 1;
  }
}
