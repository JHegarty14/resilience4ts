import { Hedge as HedgeImpl, type HedgeConfig } from '@forts/resilience4ts-all';
import { TDecoratable } from '@forts/resilience4ts-core';

/**
 * Hedge Decorator
 * ---------------
 *
 * The hedging strategy enables the re-execution of a user-defined callback if the previous
 * execution takes too long. This approach gives you the option to either run the original
 * callback again or specify a new callback for subsequent hedged attempts. Implementing a
 * hedging strategy can boost the overall responsiveness of the system. However, it's
 * essential to note that this improvement comes at the cost of increased resource utilization.
 * If low latency is not a critical requirement, you may find the `@Retry` decorator is
 * more appropriate.
 */
export const Hedge = (options: HedgeConfig) => {
  return <T extends TDecoratable>(
    _: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) => {
    if (!descriptor.value) {
      return descriptor;
    }

    const hedge = HedgeImpl.of(propertyKey, options);
    descriptor.value = function (this: unknown, ...args: Parameters<T>) {
      return hedge.onBound(descriptor.value as T, this)(...args);
    } as T;

    return descriptor;
  };
};
