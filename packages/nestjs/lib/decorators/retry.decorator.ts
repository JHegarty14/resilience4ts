import { Retry as RetryImpl, type RetryConfig as BaseRetryConfig } from '@forts/resilience4ts-all';
import { TDecoratable } from '@forts/resilience4ts-core';
import { RESILIENCE_CONSUMER, RESILIENCE_METRICS } from '../constants';
import { MethodDecorator } from '../types';

type InlineRetry = BaseRetryConfig;

type ScheduledRetry = BaseRetryConfig & { scheduleRetry: true; retryIn: number };

type RetryConfig = InlineRetry | ScheduledRetry;

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

    if (options.scheduleRetry && 'retryIn' in options) {
      descriptor.value = function (this: unknown, ...args: Parameters<T>) {
        return retry.onBound(originalMethod, this, options.retryIn)(...args);
      } as T;
      Reflect.defineMetadata(RESILIENCE_CONSUMER, descriptor.value.name, descriptor.value);
    } else {
      descriptor.value = function (this: unknown, ...args: Parameters<T>) {
        return retry.onBound(originalMethod, this)(...args);
      } as T;
    }

    Reflect.defineMetadata(RESILIENCE_METRICS, retry, descriptor.value);

    return descriptor;
  };
}
