import {
  type Decoratable,
  type ResilienceDecorator,
  ResilienceProviderService,
} from '@forts/resilience4ts-core';
import { CacheBusterConfig, CacheBusterConfigImpl } from './types';

/**
 * CacheBuster Decorator
 * ---------------------
 *
 * This decorator busts the cache value stored at the computed key on execution of the decorated
 * function. This is useful for optimistically invalidating cached data when the underlying data
 * changes frequently via known operations, rather than relying on pub/sub or time-based invalidation
 * mechanisms. The decorated function is always executed, even if the cache is not invalidated.
 */
export class CacheBuster implements ResilienceDecorator {
  private static core: ResilienceProviderService;
  private initialized!: Promise<void>;

  private constructor(
    private readonly name: string,
    private readonly config: CacheBusterConfigImpl,
    private readonly tags: Map<string, string>,
  ) {
    CacheBuster.core = ResilienceProviderService.forRoot();
    this.init();
  }

  /**
   * Creates a new CacheBuster decorator.
   */
  static of(name: string, config: CacheBusterConfig): CacheBuster;
  static of(name: string, config: CacheBusterConfig, tags?: Map<string, string>): CacheBuster {
    return new CacheBuster(name, new CacheBusterConfigImpl(config), tags || new Map());
  }

  private async init() {
    if (!this.initialized) {
      this.initialized = CacheBuster.core.start();
    }

    CacheBuster.core.emitter.emit('r4t-cache-ready', this.tags);
  }

  /**
   * Decorates the given function with cache busting functionality.
   */
  on<Args, Return>(fn: Decoratable<Args, Return>) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;
      let shouldInvalidate = false;
      try {
        const result = await fn(...args);
        shouldInvalidate = this.config.shouldInvalidate.eval(result);
        return result;
      } catch (e: unknown) {
        shouldInvalidate =
          this.config.invalidateOnException || this.config.shouldInvalidate.eval(e);
        throw e;
      } finally {
        if (shouldInvalidate) {
          const keysToInvalidate = this.config.invalidatesKeys(...args);
          CacheBuster.core.emitter.emit(
            'r4t-cache-bust',
            { name: this.name, keys: keysToInvalidate },
            this.tags,
          );
          await CacheBuster.core.cache.del(keysToInvalidate);
        }
      }
    };
  }

  /**
   * Decorates the given function with cache busting functionality. This varient of the decorator is
   * useful when the decorated function is a method on a class.
   */
  onBound<Args, Return>(fn: Decoratable<Args, Return>, self: unknown) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;
      let shouldInvalidate = false;
      try {
        const result = await fn.call(self, ...args);
        shouldInvalidate = this.config.shouldInvalidate.eval(result);
        return result;
      } catch (e: unknown) {
        shouldInvalidate =
          this.config.invalidateOnException || this.config.shouldInvalidate.eval(e);
        throw e;
      } finally {
        if (shouldInvalidate) {
          const keysToInvalidate = this.config.invalidatesKeys(...args);
          CacheBuster.core.emitter.emit(
            'r4t-cache-bust',
            { name: this.name, keys: keysToInvalidate },
            this.tags,
          );
          await CacheBuster.core.cache.del(keysToInvalidate);
        }
      }
    };
  }

  getName() {
    return this.name;
  }
}
