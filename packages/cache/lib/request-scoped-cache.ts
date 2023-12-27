import { type ResilienceDecorator, ResilienceProviderService } from '@forts/resilience4ts-core';
import { RequestScopedCacheFactory } from './internal';
import { type RequestScopedCacheConfig, RequestScopedCacheType } from './types';

/**
 * RequestScopedCache Decorator
 * ----------------------------
 *
 * This decorator caches the result of the decorated function for the lifetime
 * of a given request. This is useful for caching data that is expensive to
 * compute and is used multiple times within a single request. The cache key
 * is configurable and can be extracted from the arguments passed to the
 * decorated function. If a cached value exists for the computed key, the
 * cached value will be returned instead of executing the decorated function.
 */
export class RequestScopedCache implements ResilienceDecorator {
  private static core: ResilienceProviderService;
  private initialized!: Promise<void>;

  private constructor(
    private readonly name: string,
    private readonly config: RequestScopedCacheConfig,
    private readonly tags: Map<string, string>
  ) {
    RequestScopedCache.core = ResilienceProviderService.forRoot();
    this.init();
  }

  /**
   * Creates a new RequestScopedCache decorator.
   */
  static of(name: string, config: RequestScopedCacheConfig): RequestScopedCache;
  static of(name: string, config: RequestScopedCacheConfig): RequestScopedCache;
  static of(
    name: string,
    config: RequestScopedCacheConfig,
    tags?: Map<string, string>
  ): RequestScopedCache {
    return new RequestScopedCache(name, config, tags || new Map());
  }

  private init() {
    if (!this.initialized) {
      this.initialized = RequestScopedCache.core.start();
    }

    RequestScopedCache.core.emitter.emit('r4t-cache-ready', this.tags);
  }

  /**
   * Decorates the given function with caching.
   */
  on<Args, Return>(fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;

      const cache = RequestScopedCacheFactory.resolve(
        this.config.type,
        RequestScopedCache.core.cache
      );
      const scope = this.config.extractScope(...args);
      try {
        const cacheKey = this.config.extractKey(...args);

        const cached = await cache.get<Return>(scope, cacheKey);

        if (cached) {
          RequestScopedCache.core.emitter.emit(
            'r4t-cache-hit',
            { name: this.name, cacheKey },
            this.tags
          );
          return cached;
        }

        RequestScopedCache.core.emitter.emit(
          'r4t-cache-miss',
          { name: this.name, cacheKey },
          this.tags
        );
        const result = await fn(...args);

        if (result) {
          await cache.set(scope, cacheKey, result);
        }

        return result;
      } catch (err: unknown) {
        RequestScopedCache.core.emitter.emit('r4t-cache-error', this.name, this.tags);
        throw err;
      } finally {
        if (
          this.config.type === RequestScopedCacheType.Distributed &&
          this.config.clearOnRequestEnd
        ) {
          await cache.del(scope);
        }
      }
    };
  }

  /**
   * Decorates the given function with caching. This variant of the decorator is
   * used when the function is bound to a class.
   */
  onBound<Args, Return>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    self: unknown
  ) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;

      const cache = RequestScopedCacheFactory.resolve(
        this.config.type,
        RequestScopedCache.core.cache
      );
      const scope = this.config.extractScope(...args);
      try {
        const cacheKey = this.config.extractKey(...args);

        const cached = await cache.get<Return>(scope, cacheKey);

        if (cached) {
          RequestScopedCache.core.emitter.emit(
            'r4t-cache-hit',
            { name: this.name, cacheKey },
            this.tags
          );
          return cached;
        }

        RequestScopedCache.core.emitter.emit(
          'r4t-cache-miss',
          { name: this.name, cacheKey },
          this.tags
        );
        const result = await fn.call(self, ...args);

        if (result) {
          await cache.set(scope, cacheKey, result);
        }

        return result;
      } catch (err: unknown) {
        RequestScopedCache.core.emitter.emit('r4t-cache-error', this.name, this.tags);
        throw err;
      } finally {
        if (
          this.config.type === RequestScopedCacheType.Distributed &&
          this.config.clearOnRequestEnd
        ) {
          await cache.del(scope);
        }
      }
    };
  }

  onCacheHit(
    listener: (event: { name: string; cacheKey: string }, tags: Map<string, string>) => void
  ) {
    RequestScopedCache.core.emitter.on('r4t-cache-hit', listener);
  }

  onCacheMiss(
    listener: (event: { name: string; cacheKey: string }, tags: Map<string, string>) => void
  ) {
    RequestScopedCache.core.emitter.on('r4t-cache-miss', listener);
  }

  onCacheError(
    listener: (error: { error: Error; name: string }, tags: Map<string, string>) => void
  ) {
    RequestScopedCache.core.emitter.on('r4t-cache-error', listener);
  }

  getName() {
    return this.name;
  }
}
