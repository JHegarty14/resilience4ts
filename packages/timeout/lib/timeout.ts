import { Decoratable, isDecoratable, OperationCancelledException, SafePromise } from '@forts/resilience4ts-core';
import type { ResilienceDecorator } from '@forts/resilience4ts-core';
import { setTimeout } from 'timers/promises';
import { InvalidArgumentException, TimeoutExceededException } from './exceptions';
import type { TimeoutConfig, TimeoutOptions } from './types';
import { wrapDecoratableFunction } from '@forts/resilience4ts-core/dist/lib/util';

/**
 * Timeout Decorator
 * -----------------
 *
 * The Timeout decorator is used to enforce a timeout on the execution of a method.
 * If the decorated method does not complete within the configured timeout, the
 * decorator will reject the request with a {@link TimeoutExceededException}.
 */
export class Timeout implements ResilienceDecorator {
  private constructor(
    private readonly name: string,
    private readonly config: TimeoutConfig,
  ) {
    if (config.timeout < 0) {
      throw new InvalidArgumentException('config.timeout must be greater than 0');
    }
  }

  static of(name: string, config: TimeoutConfig): Timeout {
    return new Timeout(name, config);
  }

  /**
   * Decorates the given function with a timeout.
   */
  on<Args, Return>(
    fn: Decoratable<Args, Return>,
    options?: TimeoutOptions<Args extends unknown[] ? Args : [Args]>,
  ): Decoratable<Args, Return>;
  on<Args, Return>(
    self: unknown,
    fn?: Decoratable<Args, Return>,
    options?: TimeoutOptions<Args extends unknown[] ? Args : [Args]>
  ): Decoratable<Args, Return>;
  on<Args, Return>(
    fnOrSelf: Decoratable<Args, Return> | unknown,
    fnOrOpts?: Decoratable<Args, Return> | TimeoutOptions<Args extends unknown[] ? Args: [Args]>,
    options?: TimeoutOptions<Args extends unknown[] ? Args: [Args]>
  ) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      const wrappedFn = wrapDecoratableFunction(fnOrSelf, fnOrOpts, ...args)
      const opts = typeof fnOrOpts === 'function' ? options : fnOrOpts

      return await this.onInner(wrappedFn, opts);
    };
  }

  private async onInner<Args, Return>(fn: () => Promise<Return>, options?: TimeoutOptions<Args extends unknown[] ? Args : [Args]>) {
    const { signal } = options ?? {};
    if (signal?.aborted === true) {
      throw new OperationCancelledException(`Operation aborted: ${this.name}`);
    }

    const timeoutCtrl = new AbortController();
    const ctrl = new AbortController();

    try {
      const result = await SafePromise.race<Return | TimeoutExceededException>([
        fn(),
        this.timeout(this.config.timeout, ctrl, timeoutCtrl),
      ]);

      if (result instanceof TimeoutExceededException) {
        throw result;
      }

      return result;
    } finally {
      timeoutCtrl.abort();
    }
  }

  private async timeout(
    delay: number,
    timeoutController: AbortController,
    taskController: AbortController,
  ) {
    await setTimeout(delay, undefined, { signal: timeoutController.signal });
    taskController.abort();
    return new TimeoutExceededException(this.name, this.config.timeout);
  }

  getName() {
    return this.name;
  }
}
