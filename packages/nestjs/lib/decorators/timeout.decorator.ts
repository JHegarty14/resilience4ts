import { Timeout as TimeoutImpl, type TimeoutConfig } from '@forts/resilience4ts-all';
import { Decoratable } from '@forts/resilience4ts-core';

/**
 * Timeout Decorator
 * -----------------
 *
 * The Timeout decorator is used to enforce a timeout on the execution of a method.
 * If the decorated method does not complete within the configured timeout, the
 * decorator will reject the request with a `TimeoutExceededException`.
 */
export const Timeout = (options: TimeoutConfig) => {
  return <T extends Decoratable>(
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
      return timeout.on(this, originalMethod)(...args);
    } as T;

    return descriptor;
  };
};
