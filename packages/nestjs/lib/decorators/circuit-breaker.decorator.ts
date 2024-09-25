import {
  CircuitBreaker as CircuitBreakerConfigImpl,
  type CircuitBreakerConfig,
} from '@forts/resilience4ts-all';
import { TDecoratable } from '@forts/resilience4ts-core';
import { extendArrayMetadata } from '../utils';
import { RESILIENCE_METRICS } from '../constants/metadata.constants';

/**
 * CircuitBreaker Decorator
 * ------------------------
 *
 * The CircuitBreaker decorator is used to prevent a method from executing if the
 * error rate exceeds a certain threshold. A circuit breaker can be configured to
 * measure errors against a percentage or volume threshold. If the error rate exceeds
 * the threshold, the circuit is opened and the exeuction of the decorated method will
 * not be allowed until the circuit is closed.
 *
 * If the circuit is open, the decorated method will throw a {@link CircuitOpenException}.
 */
export const CircuitBreaker = (options: CircuitBreakerConfig) => {
  return <T extends TDecoratable>(
    _: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) => {
    if (!descriptor.value) {
      return descriptor;
    }

    const existingMetrics = Reflect.getMetadata(RESILIENCE_METRICS, descriptor.value) ?? [];

    const circuit = CircuitBreakerConfigImpl.of(propertyKey, options);
    const originalMethod = descriptor.value;
    descriptor.value = function (this: unknown, ...args: Parameters<T>) {
      return circuit.onBound(originalMethod, this)(...args);
    } as T;

    extendArrayMetadata(RESILIENCE_METRICS, [...existingMetrics, circuit], descriptor.value);

    return descriptor;
  };
};
