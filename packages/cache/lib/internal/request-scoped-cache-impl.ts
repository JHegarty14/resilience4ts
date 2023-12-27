import { assertUnreachable, valueHasher, RedisClientInstance } from '@forts/resilience4ts-core';
import { RequestScopedCacheType } from '../types';
import { RequestScopedCacheLocal } from './in-mem-request-scoped-cache';

export class RequestScopedCacheFactory {
  static resolve(type: RequestScopedCacheType, cache: RedisClientInstance) {
    switch (type) {
      case RequestScopedCacheType.Local:
        return RequestScopedCacheLocal.instance;
      case RequestScopedCacheType.Distributed:
        return new DistributedRequestScopedCache(cache);
      default:
        assertUnreachable(type);
    }
  }
}

export class DistributedRequestScopedCache {
  constructor(private readonly cache: RedisClientInstance) {}

  async get<Return>(scope: Record<string, any>, key: string): Promise<Return | null> {
    const hash = valueHasher(scope);
    const value = await this.cache.hGet(hash, key);
    if (!value) return null;
    return JSON.parse(value) as Return;
  }

  async set<Return>(scope: Record<string, any>, key: string, value: Return): Promise<void> {
    const hash = valueHasher(scope);
    await this.cache.hSet(hash, key, JSON.stringify(value));
  }

  async del(scope: Record<string, any>): Promise<number> {
    const hash = valueHasher(scope);
    return await this.cache.del(hash);
  }
}
