import { RedisClientInstance, type UniqueId } from '@forts/resilience4ts-core';
import { BulkheadConfigImpl, BulkheadStrategy } from '../types';
import { KeyBuilder } from './key-builder';

export class BulkheadStrategyFactory {
  static resolve(cache: RedisClientInstance, config: BulkheadConfigImpl) {
    switch (config.kind) {
      case BulkheadStrategy.Threadpool:
        return new ThreadPoolBulkheadStrategy(cache, config);
      case BulkheadStrategy.Semaphore:
        return new SemaphoreBulkheadStrategy(cache, config);
      default:
        throw new Error(`Unknown bulkhead strategy: ${config.kind}`);
    }
  }
}

export abstract class BaseBulkheadStrategy {
  protected stopping = false;
  constructor(
    protected readonly cache: RedisClientInstance,
    protected readonly config: BulkheadConfigImpl,
  ) {}
  abstract tryEnterBulkhead(uniqId: UniqueId): Promise<boolean>;
  abstract releaseBulkhead(uniqId: UniqueId): Promise<void>;
  abstract getAvailablePermits(): Promise<number>;

  protected async acquireSemaphore(key: string, uniqId: string) {
    const czSet = `${key}::owner`;
    const ctr = `${key}::counter`;
    try {
      const now = Date.now();
      const pipeline = this.cache.multi();
      pipeline
        .zRemRangeByScore(key, '-inf', now - (this.config.maxWait + this.config.executionTimeout))
        .zInterStore(czSet, [czSet, key], { WEIGHTS: [1, 0] })
        .incr(ctr);

      const result = await pipeline.exec();
      const counter = result[result.length - 1]?.toString();

      if (!counter) {
        throw new Error('Unable to get current count');
      }

      const counterInt = parseInt(counter);

      pipeline.zAdd(key, { value: uniqId, score: now });
      pipeline.zAdd(czSet, { value: uniqId, score: counterInt });
      pipeline.zCard(czSet);
      pipeline.zRank(czSet, uniqId);
      const pipelineRes = await pipeline.execAsPipeline();
      const rank = pipelineRes[pipelineRes.length - 1]?.toString();
      const rankInt = rank ? parseInt(rank) : undefined;

      if (rankInt === undefined || rankInt >= this.config.maxConcurrent) {
        pipeline.zRem(key, uniqId);
        pipeline.zRem(czSet, uniqId);
        await pipeline.execAsPipeline();
        return false;
      }

      return true;
    } catch (err: unknown) {
      return false;
    }
  }

  protected async releaseSemaphore(key: string, uniqId: string) {
    const pipeline = this.cache.multi();
    pipeline.zRem(key, [uniqId]);
    pipeline.zRem(`${key}::owner`, [uniqId]);
    await pipeline.execAsPipeline();
  }

  async getClaimedCapacity(key: string) {
    const now = Date.now();
    return await this.cache.zCount(
      key,
      now - (this.config.maxWait + this.config.executionTimeout),
      now,
    );
  }
}

export class ThreadPoolBulkheadStrategy extends BaseBulkheadStrategy {
  private readonly threadPoolUid = crypto.randomUUID();

  constructor(cache: RedisClientInstance, config: BulkheadConfigImpl) {
    super(cache, config);
  }

  async tryEnterBulkhead(uniqId: UniqueId) {
    const { maxWait } = this.config;

    const end = Date.now() + maxWait;
    while (Date.now() < end) {
      const acquired = await super.acquireSemaphore(
        KeyBuilder.bulkheadThreadPoolKey(this.threadPoolUid),
        uniqId.toString(),
      );

      if (acquired) {
        return acquired;
      }
    }

    return false;
  }

  async releaseBulkhead(uniqId: UniqueId) {
    return await super.releaseSemaphore(
      KeyBuilder.bulkheadThreadPoolKey(this.threadPoolUid),
      uniqId.toString(),
    );
  }

  async getAvailablePermits() {
    const claimed = await super.getClaimedCapacity(
      KeyBuilder.bulkheadThreadPoolKey(this.threadPoolUid),
    );
    return this.config.maxConcurrent - claimed;
  }
}

export class SemaphoreBulkheadStrategy extends BaseBulkheadStrategy {
  constructor(cache: RedisClientInstance, config: BulkheadConfigImpl) {
    super(cache, config);
  }

  async tryEnterBulkhead(uniqId: UniqueId) {
    const { maxWait } = this.config;

    const end = Date.now() + maxWait;

    while (Date.now() < end) {
      const acquired = await super.acquireSemaphore(
        KeyBuilder.bulkheadSemaphoreKey(this.config.name),
        uniqId.toString(),
      );

      if (acquired) {
        return acquired;
      }
    }

    return false;
  }

  async releaseBulkhead(uniqId: UniqueId) {
    return await super.releaseSemaphore(
      KeyBuilder.bulkheadSemaphoreKey(this.config.name),
      uniqId.toString(),
    );
  }

  async getAvailablePermits() {
    const claimed = await super.getClaimedCapacity(
      KeyBuilder.bulkheadSemaphoreKey(this.config.name),
    );
    return this.config.maxConcurrent - claimed;
  }
}
