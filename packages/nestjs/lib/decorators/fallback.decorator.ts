import { Fallback as FallbackImpl, type FallbackConfig } from '@forts/resilience4ts-all';
import { TDecoratable } from '@forts/resilience4ts-core';

/**
 * Fallback Decorator
 * ------------------
 *
 * This decorator executes the fallback action if the decorated function throws an error.
 * The fallback action can be either a synchronous function or a promise. If the fallback
 * action is a promise, the decorator will wait for the promise to resolve before returning
 * the result. If the fallback action is a synchronous function, the decorator will return
 * the result immediately. If the fallback action is not defined, the decorator will rethrow
 * the error.
 */
export const Fallback = (options: FallbackConfig) => {
  return <T extends TDecoratable>(
    _: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) => {
    if (!descriptor.value) {
      return descriptor;
    }

    const originalMethod = descriptor.value;
    const fallback = FallbackImpl.of(propertyKey, options);
    descriptor.value = function (this: unknown, ...args: Parameters<T>) {
      return fallback.onBound(originalMethod, this)(...args);
    } as T;

    return descriptor;
  };
};
