import {
  defaultRetryExecutionOptions,
  RetryBackoff,
  type RetryConfig,
  RetryConfigImpl,
  RetryEventImpl,
  type RetryException,
  type RetryExecutionOptions,
} from './types';
import { ResilienceProviderService } from '@forts/resilience4ts-core';
import { Err, Ok, Result, Option } from 'oxide.ts';
import { MaxRetriesExceeded, RetryValidationException } from './exceptions';
import { Backoff } from './backoff';
import type { ResilienceDecorator } from '@forts/resilience4ts-core';

/**
 * Retry Decorator
 * ---------------
 *
 * This decorator retries the decorated function until it succeeds or the maximum number of
 * attempts has been reached. It can be used to retry a function that is expected to fail
 * intermittently, such as a network request. It can also be used to schedule a retry for
 * a later time. This is useful for retrying a function that is expected to fail due to
 * temporary conditions, such as a database connection failure. In this case, the retry
 * will be scheduled for a later time when the connection is expected to be restored.
 */
export class Retry implements ResilienceDecorator {
  private static core: ResilienceProviderService;
  private initialized: Promise<void>;

  private constructor(
    private readonly name: string,
    private readonly config: RetryConfigImpl,
    private readonly tags: Map<string, string>, // TODO: will be used for metrics
  ) {
    Retry.core = ResilienceProviderService.forRoot();
    this.initialized = this.init();
  }

  static of(name: string, config: RetryConfig): Retry;
  static of(name: string, config: RetryConfig, tags?: Map<string, string>): Retry {
    return new Retry(name, new RetryConfigImpl(config), tags || new Map<string, string>());
  }

  private async init(): Promise<void> {
    await Retry.core.start();

    Retry.core.emitter.emit('r4t-retry-ready');

    return;
  }

  /**
   * Decorates the given function with retry.
   */
  on<Args, Return, Opts extends RetryExecutionOptions>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    options?: Opts,
  ): (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return> {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;

      return await this.retryInner(fn, args, options);
    };
  }

  /**
   * Decorates the given function with retry. This varient of the decorator is
   * useful when the decorated function is a method on a class.
   */
  onBound<Args, Return, Opts extends RetryExecutionOptions>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    self: unknown,
    options?: Opts,
  ): (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return> {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;

      return await this.retryInnerBound(fn, self, args, options);
    };
  }

  private async retryInner<Args, Return, Opts extends RetryExecutionOptions>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    args: Args extends unknown[] ? Args : [Args],
    options?: Opts,
  ): Promise<Return> {
    let retryEvent = new RetryEventImpl({ name: this.name, data: args });
    const { backoff, validationMode } = options ?? defaultRetryExecutionOptions;
    const { maxAttempts, onRuntimeError, wait } = this.config;
    const existing = await Retry.core.cache.hGetAll(retryEvent.taskUid);
    const isRetry = existing && Object.keys(existing).length > 0;

    if (!isRetry) {
      await Retry.core.cache.hSet(retryEvent.taskUid, retryEvent.forInsert());
    } else {
      retryEvent = RetryEventImpl.fromRecord(existing);
    }

    let error!: RetryException;
    let attempts = retryEvent.unwrap().attempts;
    while (attempts < maxAttempts) {
      try {
        const raw = await fn(...args);

        const validated = this.validateRetryResult<Return>(raw, validationMode === 1);
        if (validated.isOk()) {
          return validated.unwrap();
        } else {
          error = validated.unwrapErr();
        }
      } catch (err: unknown) {
        error = err instanceof Error ? err : new Error(`Unknown error: ${JSON.stringify(err)}`);
        Retry.core.logger.error(error);
      }
      attempts++;
      await Backoff.wait(backoff ?? RetryBackoff.Linear, attempts, this.config.maxAttempts, wait);
    }

    onRuntimeError(error);
    throw new MaxRetriesExceeded(this.name, error);
  }

  private async retryInnerBound<Args, Return, Opts extends RetryExecutionOptions>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    self: unknown,
    args: Args extends unknown[] ? Args : [Args],
    options?: Opts,
  ): Promise<Return> {
    let retryEvent = new RetryEventImpl({ name: this.name, data: args });
    const { backoff, validationMode } = options ?? defaultRetryExecutionOptions;
    const { maxAttempts, onRuntimeError, wait } = this.config;
    const existing = await Retry.core.cache.hGetAll(retryEvent.taskUid);
    const isRetry = existing && Object.keys(existing).length > 0;

    if (!isRetry) {
      await Retry.core.cache.hSet(retryEvent.taskUid, retryEvent.forInsert());
    } else {
      retryEvent = RetryEventImpl.fromRecord(existing);
    }

    let error!: RetryException;
    let attempts = retryEvent.unwrap().attempts;
    while (attempts < maxAttempts) {
      try {
        const raw = await fn.call(self, ...args);

        const validated = this.validateRetryResult<Return>(raw, validationMode === 1);
        if (validated.isOk()) {
          return validated.unwrap();
        } else {
          error = validated.unwrapErr();
        }
      } catch (err: unknown) {
        error = err instanceof Error ? err : new Error(`Unknown error: ${JSON.stringify(err)}`);
        Retry.core.logger.error(error);
      }
      attempts++;
      await Backoff.wait(backoff ?? RetryBackoff.Linear, attempts, this.config.maxAttempts, wait);
    }

    onRuntimeError(error);
    throw new MaxRetriesExceeded(this.name, error);
  }

  private validateRetryResult<T>(
    raw: unknown,
    strict: boolean,
  ): Result<T, RetryValidationException> {
    const { validateResult } = this.config;
    if (Result.is(raw)) {
      if (raw.isErr()) {
        return Err(
          new RetryValidationException('r4t-retry: wrapped function returned error', {
            cause: raw.unwrapErr(),
          }),
        );
      }
    } else if (Option.is(raw)) {
      if (raw.isNone() && strict) {
        return Err(
          new RetryValidationException('r4t-retry: strictly wrapped function returned None value'),
        );
      }
    }
    if (!validateResult(raw)) {
      return Err(
        new RetryValidationException(
          'r4t-retry: value returned by wrapped function failed validation',
          { cause: raw },
        ),
      );
    }

    return Ok(raw as T);
  }

  getName() {
    return this.name;
  }
}
