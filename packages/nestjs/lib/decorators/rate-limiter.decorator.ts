import { RateLimiter as RateLimiterImpl, type RateLimiterConfig } from '@forts/resilience4ts-all';
import { TDecoratable } from '@forts/resilience4ts-core';
import { RESILIENCE_METRICS } from '../constants';

/**
 * RateLimiter Decorator
 * ---------------------
 *
 * The RateLimiter decorator is used to enforce a rate limit on the decorated method. The rate
 * limit can be enforced for the decorated method across all instances of the application, or
 * by a configurable request identifier. If the rate limit is exceeded, the decorated method
 * will throw a {@link RateLimitViolationException}.
 */
export const RateLimiter = (options: RateLimiterConfig) => {
  return <T extends TDecoratable>(
    _: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) => {
    if (!descriptor.value) {
      return descriptor;
    }

    const originalMethod = descriptor.value;
    const retry = RateLimiterImpl.of(propertyKey, options);

    descriptor.value = function (this: unknown, ...args: Parameters<T>) {
      return retry.onBound(originalMethod, this)(...args);
    } as T;

    Reflect.defineMetadata(RESILIENCE_METRICS, retry, descriptor.value);

    return descriptor;
  };
};
