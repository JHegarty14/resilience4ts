import {
  RequestScopedCache as RequestScopedCacheImpl,
  type RequestScopedCacheConfig,
} from '@forts/resilience4ts-all';
import { TDecoratable } from '@forts/resilience4ts-core';

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
export const RequestScopedCache = (options: RequestScopedCacheConfig) => {
  return <T extends TDecoratable>(
    _: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) => {
    if (!descriptor.value) {
      return descriptor;
    }

    const cache = RequestScopedCacheImpl.of(propertyKey, options);

    descriptor.value = function (this: unknown, args: Parameters<T>) {
      return cache.onBound(descriptor.value as T, this)(...args);
    } as T;

    return descriptor;
  };
};
