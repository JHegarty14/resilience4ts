import { Retry as RetryImpl, type RetryConfig } from '@forts/resilience4ts-all';
import { TDecoratable } from '@forts/resilience4ts-core';
import { MethodDecorator } from '../types';
import { extendArrayMetadata } from '../utils';
import { RESILIENCE_METRICS } from '../constants/metadata.constants';

/**
 * Retry Decorator
 * ---------------
 *
 * This decorator retries the decorated function until it succeeds or the maximum number of
 * attempts has been reached. It can be used to retry a function that is expected to fail
 * intermittently, such as a network request. It can also be used to schedule a retry for
 * a later time. This is useful for retrying a function that is expected to fail due to
 * temporary conditions, such as a database connection failure. In this case, the retry
 * will be scheduled for a later time when the connection is expected to be restored.
 */
export function Retry(times: number): MethodDecorator;
export function Retry(options: RetryConfig): MethodDecorator;
export function Retry(timesOrOptions: number | RetryConfig): MethodDecorator {
  return <T extends TDecoratable>(
    _: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) => {
    if (!descriptor.value) {
      return descriptor;
    }

    const existingMetrics = Reflect.getMetadata(RESILIENCE_METRICS, descriptor.value) ?? [];

    const options: RetryConfig =
      typeof timesOrOptions === 'number'
        ? {
            maxAttempts: timesOrOptions,
          }
        : timesOrOptions;

    const retry = RetryImpl.of(propertyKey, options);

    descriptor.value = function (this: unknown, ...args: Parameters<T>) {
      return retry.onBound(descriptor.value as T, this)(...args);
    } as T;

    extendArrayMetadata(RESILIENCE_METRICS, [...existingMetrics, retry], descriptor.value);

    return descriptor;
  };
}
