import {
  OperationCancelledException,
  Stopwatch,
  SafePromise,
  ResilienceProviderService,
} from '@forts/resilience4ts-core';
import type { ResilienceDecorator } from '@forts/resilience4ts-core';
import { setTimeout } from 'timers/promises';
import { InvalidArgumentException, TimeoutExceededException } from './exceptions';
import { TimeoutMetrics } from './internal';
import type { TimeoutConfig, TimeoutOptions } from './types';

/**
 * Timeout Decorator
 * -----------------
 *
 * The Timeout decorator is used to enforce a timeout on the execution of a method.
 * If the decorated method does not complete within the configured timeout, the
 * decorator will reject the request with a {@link TimeoutExceededException}.
 */
export class Timeout implements ResilienceDecorator {
  private constructor(private readonly name: string, private readonly config: TimeoutConfig) {
    if (config.timeout < 0) {
      throw new InvalidArgumentException('config.timeout must be greater than 0');
    }

    this.Metrics = new TimeoutMetrics(
      this.config,
      ResilienceProviderService.instance?.config?.metrics?.captureInterval
    );
  }

  static of(name: string, config: TimeoutConfig): Timeout {
    return new Timeout(name, config);
  }

  /**
   * Decorates the given function with a timeout.
   */
  on<Args, Return>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    options?: TimeoutOptions<Args extends unknown[] ? Args : [Args]>
  ) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      const { signal } = options ?? {};
      if (signal?.aborted === true) {
        throw new OperationCancelledException(`Operation aborted: ${this.name}`);
      }

      const timeoutCtrl = new AbortController();
      const ctrl = new AbortController();

      const stopwatch = Stopwatch.start();

      try {
        const result = await SafePromise.race<Return | TimeoutExceededException>([
          fn(...args),
          this.timeout(this.config.timeout, ctrl, timeoutCtrl),
        ]);

        if (result instanceof TimeoutExceededException) {
          this.Metrics.onTimeout();
          throw result;
        }

        this.Metrics.onSuccess(stopwatch.getElapsedMilliseconds());
        return result;
      } catch (err: unknown) {
        this.Metrics.onFailure(stopwatch.getElapsedMilliseconds());
        throw err;
      } finally {
        timeoutCtrl.abort();
      }
    };
  }

  /**
   * Decorates the given function with a timeout. This varient of the decorator is
   * useful when the decorated function is a method on a class.
   */
  onBound<Args, Return>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    self: unknown,
    options?: TimeoutOptions<Args extends unknown[] ? Args : [Args]>
  ) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      const { signal } = options ?? {};
      if (signal?.aborted === true) {
        throw new OperationCancelledException(`Operation aborted: ${this.name}`);
      }

      const timeoutCtrl = new AbortController();
      const ctrl = new AbortController();

      const stopwatch = Stopwatch.start();

      try {
        const result = await SafePromise.race<Return | TimeoutExceededException>([
          fn.call(self, ...args),
          this.timeout(this.config.timeout, ctrl, timeoutCtrl),
        ]);

        if (result instanceof TimeoutExceededException) {
          this.Metrics.onTimeout();
          throw result;
        }

        this.Metrics.onSuccess(stopwatch.getElapsedMilliseconds());
        return result;
      } catch (err: unknown) {
        this.Metrics.onFailure(stopwatch.getElapsedMilliseconds());
        throw err;
      } finally {
        timeoutCtrl.abort();
      }
    };
  }

  private async timeout(
    delay: number,
    timeoutController: AbortController,
    taskController: AbortController
  ) {
    await setTimeout(delay, undefined, { signal: timeoutController.signal });
    taskController.abort();
    return new TimeoutExceededException(this.name, this.config.timeout);
  }

  getName() {
    return this.name;
  }

  readonly Metrics: TimeoutMetrics;
}
