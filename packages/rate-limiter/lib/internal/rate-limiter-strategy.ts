import { RedisClientInstance } from '@forts/resilience4ts-core';
import { assertUnreachable } from '@forts/resilience4ts-core';
import crypto from 'crypto';
import { RateLimiterConfigImpl, RateLimiterScope } from '../types';
import { KeyBuilder } from './key-builder';
import { RateLimiterMetrics } from './rate-limiter-metrics';

export class RateLimiterStrategyFactory {
  static resolve(cache: RedisClientInstance, config: RateLimiterConfigImpl) {
    switch (config.scope) {
      case RateLimiterScope.Instance:
        return new InstanceScopedRateLimiterStrategy(cache, config);
      case RateLimiterScope.Distributed:
        return new DistributedRateLimiterStrategy(cache, config);
      default:
        assertUnreachable(config.scope);
    }
  }
}

export abstract class BaseRateLimiterStrategy {
  protected metrics!: RateLimiterMetrics;
  constructor(
    protected readonly cache: RedisClientInstance,
    protected readonly config: RateLimiterConfigImpl,
  ) {}

  abstract guard(key: string, requestIdentifier?: string): Promise<boolean>;

  async getAvailablePermits(name: string): Promise<number> {
    const key = KeyBuilder.rateLimiterRegistryKey(name);
    return await this.cache.zCount(key, Date.now() - this.config.window, Date.now());
  }

  async getWaitingCount(name: string): Promise<number> {
    const key = KeyBuilder.rateLimiterRegistryKey(name);
    const czSet = `${key}::owner`;
    const diff = await this.cache.zDiff([czSet, key]);

    return diff.length;
  }

  protected async getRateWindow(key: string): Promise<boolean> {
    const czSet = `${key}::owner`;
    const ctr = `${key}::counter`;
    const uniqId = crypto.randomUUID();
    try {
      const now = Date.now();
      const pipeline = this.cache.multi();
      pipeline
        .zRemRangeByScore(key, '-inf', now - this.config.window)
        .zInterStore(czSet, [czSet, key], { WEIGHTS: [1, 0] })
        .incr(ctr);
      const result = await pipeline.execAsPipeline();
      const count = result[result.length - 1]?.toString();
      if (!count) {
        throw new Error('Unable to get current count');
      }

      pipeline.zAdd(key, { value: uniqId, score: now });
      pipeline.zAdd(czSet, { value: uniqId, score: parseInt(count) });
      pipeline.zRank(czSet, uniqId);
      const pipelineRes = await pipeline.execAsPipeline();
      const rank = pipelineRes[pipelineRes.length - 1]?.toString();
      const rankInt = rank ? parseInt(rank) : undefined;

      if (rankInt) {
        this.metrics.onCounterValueResolved(rankInt, this.config.permitLimit);
      }

      if (rankInt === undefined || rankInt >= this.config.permitLimit) {
        pipeline.zRem(key, uniqId);
        pipeline.zRem(czSet, uniqId);
        await pipeline.execAsPipeline();
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  withMetrics(metrics: RateLimiterMetrics) {
    this.metrics = metrics;
    return this;
  }
}

export class InstanceScopedRateLimiterStrategy extends BaseRateLimiterStrategy {
  constructor(
    readonly cache: RedisClientInstance,
    readonly config: RateLimiterConfigImpl,
  ) {
    super(cache, config);
  }

  async guard(key: string, requestIdentifier = '') {
    return await this.getRateWindow(KeyBuilder.rateLimiterRegistryKey(key, requestIdentifier));
  }
}

export class DistributedRateLimiterStrategy extends BaseRateLimiterStrategy {
  constructor(
    readonly cache: RedisClientInstance,
    readonly config: RateLimiterConfigImpl,
  ) {
    super(cache, config);
  }

  async guard(key: string) {
    return await this.getRateWindow(KeyBuilder.rateLimiterRegistryKey(key));
  }
}
