import {
  ConcurrentLock as ConcurrentLockImpl,
  type ConcurrentLockConfig,
} from '@forts/resilience4ts-all';
import { TDecoratable } from '@forts/resilience4ts-core';

/**
 * ConcurrentLock Decorator
 * -------------------------
 *
 * The ConcurrentLock decorator is used to enforce a distributed lock mechanism to
 * prevent concurrent execution of methods. It prevents the decorated method from executing
 * unless the caller is able to create a unique lock record with the configurable lock key.
 *
 * Decorating a method with ConcurrentLock will reject the request with a {@link AcquireLockException}
 * if a lock record for the key exists. If requests should be queued and processed in the order they
 * were received, the `@ConcurrentQueue` decorator should be used.
 */
export const ConcurrentLock = (options: ConcurrentLockConfig) => {
  return <T extends TDecoratable>(
    _: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) => {
    if (!descriptor.value) {
      return descriptor;
    }

    const originalMethod = descriptor.value;
    const lock = ConcurrentLockImpl.of(propertyKey, options);

    descriptor.value = function (this: unknown, ...args: Parameters<T>) {
      return lock.onBound(originalMethod, this)(...args);
    } as T;

    return descriptor;
  };
};
