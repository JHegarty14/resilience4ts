import { RateLimiter as RateLimiterImpl, type RateLimiterConfig } from '@forts/resilience4ts-all';
import { TDecoratable } from '@forts/resilience4ts-core';
import { extendArrayMetadata } from '../utils';
import { RESILIENCE_METRICS } from '../constants/metadata.constants';

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
    descriptor: TypedPropertyDescriptor<T>,
  ) => {
    if (!descriptor.value) {
      return descriptor;
    }

    const existingMetrics = Reflect.getMetadata(RESILIENCE_METRICS, descriptor.value) ?? [];

    const retry = RateLimiterImpl.of(propertyKey, options);

    descriptor.value = function (this: unknown, ...args: Parameters<T>) {
      return retry.onBound(descriptor.value as T, this)(...args);
    } as T;

    extendArrayMetadata(RESILIENCE_METRICS, [...existingMetrics, retry], descriptor.value);

    return descriptor;
  };
};
