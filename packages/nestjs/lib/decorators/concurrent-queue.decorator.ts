import {
  ConcurrentQueue as ConcurrentQueueImpl,
  type ConcurrentQueueConfig,
} from '@forts/resilience4ts-all';
import { TDecoratable } from '@forts/resilience4ts-core';

/**
 * ConcurrentQueue Decorator
 * -------------------------
 *
 * The ConcurrentQueue decorator is used to enforce a distributed lock mechanism to
 * prevent concurrent execution of methods. It prevents the decorated method from executing
 * unless the caller is able to create a unique lock record with the configurable lock key.
 *
 * This locking mechanism is blocking! If a request is rejected, it will be retried until
 * it is able to acquire the lock, or the configured maxAttempts is exceeded. It is important
 * to consider the impact of this on the system. If the decorated method is called frequently,
 * and the configured backoff is small, the queue may grow very large and cause a backlog of
 * requests. If the configured backoff is large, the queue may be processed slowly and cause
 * requests to timeout.
 *
 * Decorating a method with ConcurrentQueue will reject the request with a {@link AcquireLockException}
 * if a lock record for the key exists. If requests should be queued and processed in the order they
 * were received, the `@ConcurrentQueue` decorator should be used.
 */
export const ConcurrentQueue = (options: ConcurrentQueueConfig) => {
  return <T extends TDecoratable>(
    _: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) => {
    if (!descriptor.value) {
      return descriptor;
    }

    const lock = ConcurrentQueueImpl.of(propertyKey, options);

    descriptor.value = function (this: unknown, ...args: Parameters<T>) {
      return lock.onBound(descriptor.value as T, this)(...args);
    } as T;

    return descriptor;
  };
};
