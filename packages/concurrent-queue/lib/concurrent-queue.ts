import { ResilienceProviderService } from '@forts/resilience4ts-core';
import type { ResilienceDecorator } from '@forts/resilience4ts-core';
import crypto from 'node:crypto';
import { setTimeout } from 'timers/promises';
import { CreateQueueLockException, QueueWaitExceeded } from './exceptions';
import { KeyBuilder } from './internal';
import { ConcurrentQueueConfig, ConcurrentQueueConfigImpl } from './types';

/**
 * ConcurrentQueue Decorator
 * -------------------------
 *
 * The ConcurrentQueue decorator is used to enforce a distributed lock queue mechanism
 * for concurrent execution of methods. It prevents the decorated method from executing
 * until the lock record created by the decorator is first in the queue. Requests will
 * be processed in the order their corresponding lock record was inserted into the queue.
 *
 * If a method should reject duplicate concurrent requests with the same lock key, use
 * the ConcurrentLock decorator.
 */
export class ConcurrentQueue implements ResilienceDecorator {
  private static core: ResilienceProviderService;
  private initialized: Promise<void>;

  private constructor(
    private readonly name: string,
    private readonly config: ConcurrentQueueConfigImpl,
    private readonly tags: Map<string, string>,
  ) {
    ConcurrentQueue.core = ResilienceProviderService.forRoot();
    this.initialized = this.init();
  }

  /**
   * Creates a new ConcurrentQueue decorator.
   */
  static of(name: string, config: ConcurrentQueueConfig): ConcurrentQueue;
  static of(
    name: string,
    config: ConcurrentQueueConfig,
    tags?: Map<string, string>,
  ): ConcurrentQueue {
    return new ConcurrentQueue(name, new ConcurrentQueueConfigImpl(config), tags || new Map());
  }

  private async init(): Promise<void> {
    const registered = await ConcurrentQueue.core.cache.sIsMember(
      KeyBuilder.lockQueueRegistryKey(),
      this.name,
    );

    if (!registered) {
      await ConcurrentQueue.core.cache.sAdd(KeyBuilder.lockQueueRegistryKey(), [this.name]);
    }

    ConcurrentQueue.core.emitter.emit('r4t-lock-ready', this.name, this.tags);

    return;
  }

  /**
   * Decorates the given function with a concurrent lock queue.
   */
  on<Args, Return>(fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;

      ConcurrentQueue.core.emitter.emit('r4t-lock-queue-request', this.name, this.tags);

      const { withKey, backoff, maxAttempts } = this.config;
      const uuid = crypto.randomUUID();
      const maxDuration = Array(maxAttempts)
        .fill(backoff)
        .reduce<number>((acc, curr, idx) => acc + curr * (idx + 1), 0);

      const uniqueId = typeof withKey === 'string' ? withKey : withKey(...args);
      const score = Date.now() + maxDuration;
      try {
        await ConcurrentQueue.core.cache.zAdd(KeyBuilder.lockQueueKey(uniqueId), {
          score,
          value: uuid,
        });
      } catch (err: unknown) {
        ConcurrentQueue.core.emitter.emit('r4t-lock-queue-failure', this.name, this.tags);
        const cause = err instanceof Error ? err : new Error(JSON.stringify(err));
        throw new CreateQueueLockException(this.name, uniqueId, cause);
      }

      let acquired = false;
      let attempts = 0;

      try {
        while (!acquired) {
          await setTimeout(attempts * backoff);
          acquired = await this.acquireLock(uniqueId, uuid, score, attempts, maxAttempts);
          attempts++;
        }

        return await fn(...args);
      } catch (err: unknown) {
        ConcurrentQueue.core.emitter.emit('r4t-lock-queue-failure', this.name, this.tags);
        throw err;
      } finally {
        await ConcurrentQueue.core.cache.zRem(KeyBuilder.lockQueueKey(uniqueId), uuid);
      }
    };
  }

  /**
   * Decorates the given function with a concurrent lock queue. This variant of the
   * decorator is used when the function is bound to a class.
   */
  onBound<Args, Return>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    self: unknown,
  ) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;

      ConcurrentQueue.core.emitter.emit('r4t-lock-queue-request', this.name, this.tags);

      const { withKey, backoff, maxAttempts } = this.config;
      const uuid = crypto.randomUUID();
      const maxDuration = Array(maxAttempts)
        .fill(backoff)
        .reduce<number>((acc, curr, idx) => acc + curr * (idx + 1), 0);

      const uniqueId = typeof withKey === 'string' ? withKey : withKey(...args);
      const score = Date.now() + maxDuration;
      try {
        await ConcurrentQueue.core.cache.zAdd(KeyBuilder.lockQueueKey(uniqueId), {
          score,
          value: uuid,
        });
      } catch (err: unknown) {
        ConcurrentQueue.core.emitter.emit('r4t-lock-queue-failure', this.name, this.tags);
        const cause = err instanceof Error ? err : new Error(JSON.stringify(err));
        throw new CreateQueueLockException(this.name, uniqueId, cause);
      }

      let acquired = false;
      let attempts = 0;

      try {
        while (!acquired) {
          await setTimeout(attempts * backoff);
          acquired = await this.acquireLock(uniqueId, uuid, score, attempts, maxAttempts);
          attempts++;
        }

        return await fn.call(self, ...args);
      } catch (err: unknown) {
        ConcurrentQueue.core.emitter.emit('r4t-lock-queue-failure', this.name, this.tags);
        throw err;
      } finally {
        await ConcurrentQueue.core.cache.zRem(KeyBuilder.lockQueueKey(uniqueId), uuid);
      }
    };
  }

  private async acquireLock(
    uniqueId: string,
    uuid: string,
    maxDuration: number,
    attempt: number,
    maxAttempts: number,
  ): Promise<boolean> {
    if (attempt >= maxAttempts) {
      throw new QueueWaitExceeded(this.name, uniqueId);
    }

    const expired: number[] = [];
    const queuedLocks = await ConcurrentQueue.core.cache.zRangeWithScores(
      KeyBuilder.lockQueueKey(uniqueId),
      '-inf',
      maxDuration,
      {
        BY: 'SCORE',
        LIMIT: { offset: 0, count: 20 },
      },
    );
    const now = Date.now();

    for (const lock of queuedLocks) {
      if (lock.score <= now) {
        expired.push(lock.score);
      } else if (lock.value === uuid) {
        await ConcurrentQueue.core.cache.zRemRangeByScore(
          KeyBuilder.lockQueueKey(uniqueId),
          0,
          Math.max(...expired),
        );
        return true;
      } else {
        return false;
      }
    }

    return false;
  }

  getName() {
    return this.name;
  }
}
