import { injectable } from 'tsyringe';
import { RedisClientSingleton } from './redis-client';
import { logCacheOperation } from '@/infrastructure/monitoring';
import type { ICacheService } from '@/domain/repositories/cache.interface';

@injectable()
export class RedisCacheService implements ICacheService {
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    const startTime = Date.now();
    try {
      const client = await RedisClientSingleton.getInstance();
      const serialized = JSON.stringify(value);
      await client.setEx(key, ttlSeconds, serialized);
      
      const duration = Date.now() - startTime;
      logCacheOperation({
        operation: 'set',
        key,
        duration,
        success: true,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logCacheOperation({
        operation: 'set',
        key,
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    try {
      const client = await RedisClientSingleton.getInstance();
      const value = await client.get(key);

      const hit = value !== null;
      const duration = Date.now() - startTime;
      
      logCacheOperation({
        operation: 'get',
        key,
        hit,
        duration,
        success: true,
      });

      if (!value) {
        return null;
      }

      try {
        return JSON.parse(value) as T;
      } catch (error) {
        console.error(`❌ Error parsing cache key "${key}":`, error);
        return null;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logCacheOperation({
        operation: 'get',
        key,
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const startTime = Date.now();
    try {
      const client = await RedisClientSingleton.getInstance();
      await client.del(key);
      
      const duration = Date.now() - startTime;
      logCacheOperation({
        operation: 'delete',
        key,
        duration,
        success: true,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logCacheOperation({
        operation: 'delete',
        key,
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    const startTime = Date.now();
    try {
      const client = await RedisClientSingleton.getInstance();
      
      const keys = await client.keys(pattern);

      if (keys && keys.length > 0) {
        await Promise.all(keys.map((key) => client.del(key)));
      }
      
      const duration = Date.now() - startTime;
      logCacheOperation({
        operation: 'invalidate',
        key: pattern,
        duration,
        success: true,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logCacheOperation({
        operation: 'invalidate',
        key: pattern,
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    const client = await RedisClientSingleton.getInstance();
    const result = await client.exists(key);
    return result === 1;
  }
}
