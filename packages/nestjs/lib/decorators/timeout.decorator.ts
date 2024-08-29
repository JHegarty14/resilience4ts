import { Timeout as TimeoutImpl, type TimeoutConfig } from '@forts/resilience4ts-all';
import { TDecoratable } from '@forts/resilience4ts-core';
import { extendArrayMetadata } from '../utils';
import { RESILIENCE_METRICS } from '../constants/metadata.constants';

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

    const existingMetrics = Reflect.getMetadata(RESILIENCE_METRICS, descriptor.value) ?? [];

    const timeout = TimeoutImpl.of(propertyKey, options);

    descriptor.value = function (this: unknown, ...args: Parameters<T>) {
      return timeout.onBound(descriptor.value as T, this)(...args);
    } as T;

    extendArrayMetadata(RESILIENCE_METRICS, [...existingMetrics, timeout], descriptor.value);

    return descriptor;
  };
};
