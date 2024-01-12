import { Retry as RetryImpl, type RetryConfig } from '@forts/resilience4ts-all';
import { TDecoratable } from '@forts/resilience4ts-core';
import { MethodDecorator } from '../types';

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

    const options: RetryConfig =
      typeof timesOrOptions === 'number'
        ? {
            maxAttempts: timesOrOptions,
          }
        : timesOrOptions;

    const originalMethod = descriptor.value;
    const retry = RetryImpl.of(propertyKey, options);

    descriptor.value = function (this: unknown, ...args: Parameters<T>) {
      return retry.onBound(originalMethod, this)(...args);
    } as T;

    return descriptor;
  };
}
