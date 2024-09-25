import { Cache as CacheImpl, type CacheConfig } from '@forts/resilience4ts-all';
import { TDecoratable } from '@forts/resilience4ts-core';

/**
 * Cache Decorator
 * ---------------
 *
 * This decorator wraps the decorated function with caching. The result of the decorated function
 * will be cached for a configurable amount of time. The cache key is configurable and can be
 * extracted from the arguments passed to the decorated function. If a cached value exists for the
 * computed key, the cached value will be returned instead of executing the decorated function.
 */
export const Cache = (options: CacheConfig) => {
  return <T extends TDecoratable>(
    _: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) => {
    if (!descriptor.value) {
      return descriptor;
    }

    const cache = CacheImpl.of(propertyKey, options);
    const originalMethod = descriptor.value;
    descriptor.value = function (this: unknown, ...args: Parameters<T>) {
      return cache.onBound(originalMethod, this)(...args);
    } as T;

    return descriptor;
  };
};
