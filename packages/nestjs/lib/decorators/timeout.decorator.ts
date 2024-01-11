import { Timeout as TimeoutImpl, type TimeoutConfig } from '@forts/resilience4ts-all';
import { TDecoratable } from '@forts/resilience4ts-core';
import { RESILIENCE_METRICS } from '../constants';

/**
 * Timeout Decorator
 * -----------------
 *
 * The Timeout decorator is used to enforce a timeout on the execution of a method.
 * If the decorated method does not complete within the configured timeout, the
 * decorator will reject the request with a `TimeoutExceededException`.
 */
export const Timeout = (options: TimeoutConfig) => {
  return <T extends TDecoratable>(
    _: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) => {
    if (!descriptor.value) {
      return descriptor;
    }

    const originalMethod = descriptor.value;
    const timeout = TimeoutImpl.of(propertyKey, options);

    descriptor.value = function (this: unknown, ...args: Parameters<T>) {
      return timeout.onBound(originalMethod, this)(...args);
    } as T;

    Reflect.defineMetadata(RESILIENCE_METRICS, timeout, descriptor.value);

    return descriptor;
  };
};
