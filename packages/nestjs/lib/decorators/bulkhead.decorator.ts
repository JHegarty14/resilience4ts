import {
  Bulkhead as BulkheadImpl,
  type BulkheadConfig as BaseBulkheadConfig,
} from '@forts/resilience4ts-all';
import { TDecoratable } from '@forts/resilience4ts-core';

/**
 * Bulkhead Decorator
 * ------------------
 *
 * The Bulkhead decorator limits the number of concurrent calls to the decorated function. A bulkhead
 * can be configured to cap the number of concurrent calls to a function across all instances of the
 * application, or to cap the number of concurrent calls to a function per instance of the application.
 *
 * If the bulkhead is full, the decorated function will throw a {@link BulkheadFullException}.
 */
export const Bulkhead = (options: BulkheadConfig) => {
  return <T extends TDecoratable>(
    target: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) => {
    if (!descriptor.value) {
      return descriptor;
    }

    const name = `${target.constructor.name}.${descriptor.value.name}`;
    const bulkhead = BulkheadImpl.of(propertyKey, {
      ...options,
      name,
    });
    const originalMethod = descriptor.value;
    descriptor.value = function (this: unknown, ...args: Parameters<T>) {
      return bulkhead.onBound(originalMethod, this)(...args);
    } as T;

    return descriptor;
  };
};

type BulkheadConfig = Omit<BaseBulkheadConfig, 'name'>;
