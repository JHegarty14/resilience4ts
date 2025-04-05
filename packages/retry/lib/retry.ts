import {
  defaultRetryBucket,
  RetryBackoff,
  type RetryConfig,
  RetryConfigImpl,
  RetryStrategy,
} from './types';
import { Decoratable, ResilienceProviderService } from '@forts/resilience4ts-core';
import { MaxRetriesExceeded, RetryBudgetExhausted, RetryValidationException } from './exceptions';
import { Backoff } from './backoff';
import type { ResilienceDecorator } from '@forts/resilience4ts-core';
import { KeyBuilder } from './internal';

/**
 * Retry Decorator
 * ---------------
 *
 * This decorator retries the decorated function until it succeeds or the maximum number of
 * attempts has been reached. It can be used to retry a function that is expected to fail
 * intermittently, such as a network request. It can also be used to schedule a retry for
 * a later time. This is useful for retrying a function that is expected to fail due to
 * temporary conditions, such as a database connection failure. In this case, the retry
 * will be scheduled for a later time when the connection is expected to be restored.
 */
export class Retry implements ResilienceDecorator {
  private static core: ResilienceProviderService;
  private initialized: Promise<void>;

  private constructor(
    private readonly name: string,
    private readonly config: RetryConfigImpl,
    private readonly tags: Map<string, string>, // TODO: will be used for metrics
  ) {
    Retry.core = ResilienceProviderService.forRoot();
    this.initialized = this.init();
  }

  static of(name: string, config: RetryConfig): Retry;
  static of(name: string, config: RetryConfig, tags?: Map<string, string>): Retry {
    return new Retry(name, new RetryConfigImpl(config), tags || new Map<string, string>());
  }

  private async init(): Promise<void> {
    await Retry.core.start();
    const registered = await Retry.core.cache.exists(KeyBuilder.retryRegistryKey(this.name));

    if (!registered && this.config.retryStrategy === RetryStrategy.Budgeted) {
      await this.registerRetry();
    }

    Retry.core.emitter.emit('r4t-retry-ready');

    return;
  }

  private async registerRetry() {
    const retryUid = crypto.randomUUID();
    await Retry.core.cache
      .multi()
      .set(KeyBuilder.retryRegistryKey(this.name), retryUid)
      .zAdd(KeyBuilder.timeseriesKey(this.name), { score: Date.now(), value: retryUid })
      .hSet(retryUid, defaultRetryBucket())
      .exec();
  }

  private async getActiveBucket(): Promise<string> {
    const currentWindow = Math.floor(Date.now() / (this.config.windowSize || 1));
    const bucketKey = `retry:${this.name}:${currentWindow}`;
    const exists = await Retry.core.cache.exists(bucketKey);
    if (!exists) {
      await Retry.core.cache.hSet(bucketKey, 'attempts', 0);
      await Retry.core.cache.expire(bucketKey, this.config.windowSize || 0);
    }
    return bucketKey;
  }

  private async incrementRetryCount(): Promise<number> {
    const bucketKey = await this.getActiveBucket();
    const currentCount = await Retry.core.cache.hIncrBy(bucketKey, 'attempts', 1);
    return currentCount;
  }

  /**
   * Decorates the given function with retry.
   */
  on<Args, Return>(fn: Decoratable<Args, Return>): Decoratable<Args, Return> {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;

      let attempts = 0;
      while (attempts < this.config.maxAttempts) {
        if (this.config.retryStrategy === RetryStrategy.Budgeted) {
          const currentCount = await this.incrementRetryCount();
          if (currentCount > this.config.windowBudget) {
            throw new RetryBudgetExhausted(this.name);
          }
        }
        try {
          const result = await fn(...args);
          const ok = this.config.until?.(result) || true;
          if (!ok) {
            throw new RetryValidationException(`Result failed validation condition`);
          }
          return result;
        } catch (err: unknown) {
          const error = <Error>err;
          this.config.onRuntimeError(error);
          attempts++;
          if (attempts >= this.config.maxAttempts) {
            throw new MaxRetriesExceeded(this.name, error);
          }
          await Backoff.wait(
            this.config.retryMode ?? RetryBackoff.Linear,
            attempts,
            this.config.maxAttempts,
            this.config.wait,
          );
        }
      }
      throw new MaxRetriesExceeded(this.name);
    };
  }

  /**
   * Decorates the given function with retry. This varient of the decorator is
   * useful when the decorated function is a method on a class.
   */
  onBound<Args, Return>(fn: Decoratable<Args, Return>, self: unknown): Decoratable<Args, Return> {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;

      let attempts = 0;
      while (attempts < this.config.maxAttempts) {
        if (this.config.retryStrategy === RetryStrategy.Budgeted) {
          const currentCount = await this.incrementRetryCount();
          if (currentCount > this.config.windowBudget) {
            throw new RetryBudgetExhausted(this.name);
          }
        }
        try {
          const result = await fn.call(self, ...args);
          const ok = this.config.until?.(result) || true;
          if (!ok) {
            throw new RetryValidationException(`Result failed validation condition`);
          }
          return result;
        } catch (err: unknown) {
          const error = <Error>err;
          this.config.onRuntimeError(error);
          attempts++;
          if (attempts >= this.config.maxAttempts) {
            throw new MaxRetriesExceeded(this.name, error);
          }
          await Backoff.wait(
            this.config.retryMode ?? RetryBackoff.Linear,
            attempts,
            this.config.maxAttempts,
            this.config.wait,
          );
        }
      }
      throw new MaxRetriesExceeded(this.name);
    };
  }

  getName() {
    return this.name;
  }
}
