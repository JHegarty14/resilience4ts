import {
  Bulkhead as BulkheadImpl,
  type BulkheadConfig as BaseBulkheadConfig,
} from '@forts/resilience4ts-all';
import { TDecoratable } from '@forts/resilience4ts-core';
import { RESILIENCE_METRICS } from '../constants/metadata.constants';
import { extendArrayMetadata } from '../utils';

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

    const existingMetrics = Reflect.getMetadata(RESILIENCE_METRICS, descriptor.value) ?? [];

    const name = `${target.constructor.name}.${propertyKey}`;
    const bulkhead = BulkheadImpl.of(name, options);
    descriptor.value = function (this: unknown, ...args: Parameters<T>) {
      return bulkhead.onBound(descriptor.value as T, this)(...args);
    } as T;

    extendArrayMetadata(RESILIENCE_METRICS, [...existingMetrics, bulkhead], descriptor.value);

    return descriptor;
  };
};

type BulkheadConfig = Omit<BaseBulkheadConfig, 'name'>;
