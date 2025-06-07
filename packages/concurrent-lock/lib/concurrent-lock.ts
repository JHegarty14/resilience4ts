import { Decoratable, ResilienceProviderService } from '@forts/resilience4ts-core';
import type { ResilienceDecorator } from '@forts/resilience4ts-core';
import { AcquireLockException } from './exceptions';
import { KeyBuilder } from './internal';
import { type ConcurrentLockConfig, ConcurrentLockConfigImpl } from './types';
import { wrapDecoratableFunction } from '@forts/resilience4ts-core/dist/lib/util';

/**
 * ConcurrentLock Decorator
 * -------------------------
 *
 * The ConcurrentLock decorator is used to enforce a distributed lock mechanism to
 * prevent concurrent execution of methods. It prevents the decorated method from executing
 * unless the caller is able to create a unique lock record with the configurable lock key.
 *
 * Decorating a method with ConcurrentLock will reject the request with a {@link AcquireLockException}
 * if a lock record for the key exists. If requests should be queued and processed in the order they
 * were received, the `@ConcurrentQueue` decorator should be used.
 */
export class ConcurrentLock implements ResilienceDecorator {
  private static core: ResilienceProviderService;
  private initialized: Promise<void>;

  private constructor(
    private readonly name: string,
    private readonly config: ConcurrentLockConfigImpl,
    private readonly tags: Map<string, string>,
  ) {
    ConcurrentLock.core = ResilienceProviderService.forRoot();
    this.initialized = this.init();
  }

  /**
   * Creates a new ConcurrentLock decorator.
   */
  static of(name: string, config: ConcurrentLockConfig): ConcurrentLock;
  static of(
    name: string,
    config: ConcurrentLockConfig,
    tags?: Map<string, string>,
  ): ConcurrentLock {
    return new ConcurrentLock(name, new ConcurrentLockConfigImpl(config), tags || new Map());
  }

  private async init(): Promise<void> {
    const registered = await ConcurrentLock.core.cache.sIsMember(
      KeyBuilder.lockRegistryKey(),
      this.name,
    );

    if (!registered) {
      await ConcurrentLock.core.cache.sAdd(KeyBuilder.lockRegistryKey(), [this.name]);
    }

    ConcurrentLock.core.emitter.emit('r4t-lock-ready', this.name, this.tags);

    return;
  }

  /**
   * Decorates the given function with a concurrent lock.
   */
  on<Args, Return>(fn: Decoratable<Args, Return>): Decoratable<Args, Return>;
  on<Args, Return>(self: unknown, fn: Decoratable<Args, Return>): Decoratable<Args, Return>;
  on<Args, Return>(fnOrSelf: Decoratable<Args, Return> | unknown, fn?: Decoratable<Args, Return>) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;

      const { withKey } = this.config;
      const uniqueId = typeof withKey === 'string' ? withKey : withKey(...args);
      const wrappedFn = wrapDecoratableFunction(fnOrSelf, fn, ...args);
      return await this.onInner(wrappedFn, uniqueId);
      
    };
  }

  private async onInner<Return>(fn: () => Promise<Return>, uniqueId: string) {
    ConcurrentLock.core.emitter.emit('r4t-lock-request', this.name, this.tags);

      const { withKey, duration, driftFactor, refreshInterval } = this.config;
      const drift = Math.round((driftFactor ?? 0.01) * duration) + 2;


      try {
        const acquired = await ConcurrentLock.core.cache.set(
          KeyBuilder.lockKey(uniqueId),
          Date.now(),
          {
            NX: true,
            PX: duration,
          },
        );
        if (!acquired) {
          ConcurrentLock.core.emitter.emit('r4t-lock-acquisition-failed', this.name, this.tags);
          throw new AcquireLockException(this.name, uniqueId);
        }
      } catch (err: unknown) {
        ConcurrentLock.core.emitter.emit('r4t-lock-acquisition-failed', this.name, this.tags);
        throw new AcquireLockException(this.name, uniqueId);
      }

      let heartbeat: NodeJS.Timer | null = null;
      if (this.config.extensible !== false) {
        heartbeat = setInterval(async () => {
          const ttl = Date.now() + duration - drift;
          await ConcurrentLock.core.cache.expire(KeyBuilder.lockKey(uniqueId), ttl);
        }, duration - refreshInterval);
      }

      try {
        return await fn();
      } finally {
        if (heartbeat) clearInterval(heartbeat);
        await ConcurrentLock.core.cache.del(KeyBuilder.lockKey(uniqueId));
        ConcurrentLock.core.emitter.emit('r4t-lock-cleared', this.name, this.tags);
      }
  }

  getName() {
    return this.name;
  }
}
