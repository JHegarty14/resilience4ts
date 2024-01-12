import { CacheBuster as CacheBusterImpl, type CacheBusterConfig } from '@forts/resilience4ts-all';
import { TDecoratable } from '@forts/resilience4ts-core';

/**
 * CacheBuster Decorator
 * ---------------------
 *
 * This decorator busts the cache value stored at the computed key on execution of the decorated
 * function. This is useful for optimistically invalidating cached data when the underlying data
 * changes frequently via known operations, rather than relying on pub/sub or time-based invalidation
 * mechanisms. The decorated function is always executed, even if the cache is not invalidated.
 */
export function CacheBuster(config: CacheBusterConfig) {
  return <T extends TDecoratable>(
    _: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) => {
    if (!descriptor.value) {
      return descriptor;
    }

    const originalMethod = descriptor.value;
    const cacheBuster = CacheBusterImpl.of(propertyKey, config);

    descriptor.value = function (this: unknown, ...args: Parameters<T>) {
      return cacheBuster.onBound(originalMethod, this)(...args);
    } as T;

    return descriptor;
  };
}
