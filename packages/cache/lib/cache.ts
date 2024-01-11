import { ResilienceProviderService, type ResilienceDecorator } from '@forts/resilience4ts-core';
import { KeyBuilder } from './internal';
import { type CacheConfig, CacheConfigImpl } from './types';

/**
 * Cache Decorator
 * ---------------
 *
 * This decorator wraps the decorated function with caching. The result of the decorated function
 * will be cached for a configurable amount of time. The cache key is configurable and can be
 * extracted from the arguments passed to the decorated function. If a cached value exists for the
 * computed key, the cached value will be returned instead of executing the decorated function.
 */
export class Cache implements ResilienceDecorator {
  private static core: ResilienceProviderService;
  private initialized!: Promise<void>;

  private constructor(
    private readonly name: string,
    private readonly config: CacheConfigImpl,
    private readonly tags: Map<string, string>,
  ) {
    Cache.core = ResilienceProviderService.forRoot();
    this.init();
  }

  /**
   * Creates a new Cache decorator.
   */
  static of(name: string, config: CacheConfig): Cache;
  static of(name: string, config: CacheConfig, tags?: Map<string, string>): Cache {
    return new Cache(name, new CacheConfigImpl(config), tags || new Map());
  }

  private async init() {
    if (!this.initialized) {
      this.initialized = Cache.core.start();
    }

    Cache.core.emitter.emit('r4t-cache-ready', this.tags);
  }

  /**
   * Decorates the given function with caching.
   */
  on<Args, Return>(fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      try {
        await this.initialized;

        const cacheKey = this.config.extractKey(...args);

        const cached = await Cache.core.cache.get(cacheKey);

        if (cached) {
          Cache.core.emitter.emit('r4t-cache-hit', { name: this.name, cacheKey }, this.tags);
          return JSON.parse(cached);
        }

        Cache.core.emitter.emit('r4t-cache-miss', { name: this.name, cacheKey }, this.tags);
        const result = await fn(...args);

        if (result) {
          await Cache.core.cache.set(cacheKey, JSON.stringify(result), {
            PX: this.config.expiration,
          });
        }
        return result;
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(JSON.stringify(err));
        Cache.core.emitter.emit('r4t-cache-error', { error, name: this.name }, this.tags);
        throw err;
      }
    };
  }

  /**
   * Decorates the given function with caching.
   *
   * This variant of the decorator is used when the function is bound to a class.
   */
  onBound<Args, Return>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    self: unknown,
  ) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      try {
        await this.initialized;

        const cacheKey = this.config.extractKey(...args);

        const cached = await Cache.core.cache.get(cacheKey);

        if (cached) {
          Cache.core.emitter.emit('r4t-cache-hit', { name: this.name, cacheKey }, this.tags);
          return JSON.parse(cached);
        }

        Cache.core.emitter.emit('r4t-cache-miss', { name: this.name, cacheKey }, this.tags);
        const result = await fn.call(self, ...args);

        if (result) {
          await Cache.core.cache.set(cacheKey, JSON.stringify(result), {
            PX: this.config.expiration,
          });
        }
        return result;
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(JSON.stringify(err));
        Cache.core.emitter.emit('r4t-cache-error', { error, name: this.name }, this.tags);
        throw err;
      }
    };
  }

  onCacheHit(
    listener: (event: { name: string; cacheKey: string }, tags: Map<string, string>) => void,
  ) {
    Cache.core.emitter.on('r4t-cache-hit', listener);
  }

  onCacheMiss(
    listener: (event: { name: string; cacheKey: string }, tags: Map<string, string>) => void,
  ) {
    Cache.core.emitter.on('r4t-cache-miss', listener);
  }

  onCacheError(
    listener: (error: { error: Error; name: string }, tags: Map<string, string>) => void,
  ) {
    Cache.core.emitter.on('r4t-cache-error', listener);
  }

  readonly Metrics = new (class {
    constructor(readonly parent: Cache) {}

    async getCacheMisses(windowStart?: number, windowEnd?: number) {
      return await Cache.core.cache.zCount(
        KeyBuilder.cacheMissesKey(this.parent.name),
        windowStart ?? 0,
        windowEnd ?? Date.now(),
      );
    }

    async getCacheHits(windowStart?: number, windowEnd?: number) {
      return await Cache.core.cache.zCount(
        KeyBuilder.cacheHitsKey(this.parent.name),
        windowStart ?? 0,
        windowEnd ?? Date.now(),
      );
    }
  })(this);

  getName() {
    return this.name;
  }
}
