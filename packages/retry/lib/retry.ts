import {
  defaultRetryExecutionOptions,
  RetryBackoff,
  type RetryConfig,
  RetryConfigImpl,
  type RetryEvent,
  RetryEventImpl,
  type RetryException,
  type RetryExecutionOptions,
} from './types';
import { ResilienceProviderService } from '@forts/resilience4ts-core';
import { Err, Ok, Result, Option } from 'oxide.ts';
import { ScheduledRetry } from './internal/scheduled-retry';
import { FailedWithScheduledRetryException, RetryValidationException } from './exceptions';
import { Backoff } from './backoff';
import type { ResilienceDecorator } from '@forts/resilience4ts-core';
import { KeyBuilder, RetryMetricsImpl } from './internal';

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
    this.Metrics = new RetryMetricsImpl(Retry.core.config.metrics?.captureInterval);
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
  ): (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>;
  on<Args, Return, Opts extends RetryExecutionOptions>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    fromNow: number,
    options?: Opts,
  ): (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>;
  on<Args, Return, Opts extends RetryExecutionOptions>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    when: string | Date,
    options?: Opts,
  ): (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>;
  on<Args, Return, Opts extends RetryExecutionOptions, I extends string | Date | number>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    whenOrFromNow: I,
    options?: Opts,
  ): (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>;
  on<Args, Return, Opts extends RetryExecutionOptions>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    whenOrFromNow?: string | Date | number | Opts,
    options?: Opts,
  ) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;

      if (
        whenOrFromNow &&
        (typeof whenOrFromNow === 'number' ||
          typeof whenOrFromNow === 'string' ||
          whenOrFromNow instanceof Date)
      ) {
        return await this.scheduleRetryInner(fn, args, whenOrFromNow, options);
      }

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
  ): (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>;
  onBound<Args, Return, Opts extends RetryExecutionOptions>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    self: unknown,
    fromNow: number,
    options?: Opts,
  ): (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>;
  onBound<Args, Return, Opts extends RetryExecutionOptions>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    self: unknown,
    when: string | Date,
    options?: Opts,
  ): (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>;
  onBound<Args, Return, Opts extends RetryExecutionOptions, I extends string | Date | number>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    self: unknown,
    whenOrFromNow: I,
    options?: Opts,
  ): (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>;
  onBound<Args, Return, Opts extends RetryExecutionOptions>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    self: unknown,
    whenOrFromNow?: string | Date | number | Opts,
    options?: Opts,
  ) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;

      if (
        whenOrFromNow &&
        (typeof whenOrFromNow === 'number' ||
          typeof whenOrFromNow === 'string' ||
          whenOrFromNow instanceof Date)
      ) {
        return await this.scheduleRetryInnerBound(fn, self, args, whenOrFromNow, options);
      }

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
    while (retryEvent.unwrap().attempts < maxAttempts) {
      try {
        const raw = await fn(...args);

        const validated = this.validateRetryResult<Return>(raw, validationMode === 1);
        if (validated.isOk()) {
          if (retryEvent.unwrap().attempts > 0 || isRetry) {
            this.Metrics.onSuccessfulRetry();
          } else {
            this.Metrics.onSuccess();
          }
          return validated.unwrap();
        } else {
          error = validated.unwrapErr();
        }
      } catch (err: unknown) {
        error = err instanceof Error ? err : new Error(`Unknown error: ${JSON.stringify(err)}`);
        Retry.core.logger.info('error');
      }
      retryEvent.unwrap().attempts++;
      if (retryEvent.unwrap().attempts > 0 || isRetry) {
        this.Metrics.onFailureWithRetry();
      } else {
        this.Metrics.onFailureWithoutRetry();
      }
      await Backoff.wait(
        backoff ?? RetryBackoff.Linear,
        retryEvent.unwrap().attempts,
        this.config.maxAttempts,
        wait,
      );
    }

    onRuntimeError(error);
    throw error;
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
    while (retryEvent.unwrap().attempts < maxAttempts) {
      try {
        const raw = await fn.call(self, ...args);

        const validated = this.validateRetryResult<Return>(raw, validationMode === 1);
        if (validated.isOk()) {
          if (retryEvent.unwrap().attempts > 0 || isRetry) {
            this.Metrics.onSuccessfulRetry();
          } else {
            this.Metrics.onSuccess();
          }
          return validated.unwrap();
        } else {
          error = validated.unwrapErr();
        }
      } catch (err: unknown) {
        error = err instanceof Error ? err : new Error(`Unknown error: ${JSON.stringify(err)}`);
        Retry.core.logger.info('error');
      }
      retryEvent.unwrap().attempts++;
      if (retryEvent.unwrap().attempts > 0 || isRetry) {
        this.Metrics.onFailureWithRetry();
      } else {
        this.Metrics.onFailureWithoutRetry();
      }
      await Backoff.wait(
        backoff ?? RetryBackoff.Linear,
        retryEvent.unwrap().attempts,
        this.config.maxAttempts,
        wait,
      );
    }

    onRuntimeError(error);
    throw error;
  }

  private async scheduleRetryInner<Args, Return, Opts extends RetryExecutionOptions>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    args: Args extends unknown[] ? Args : [Args],
    fromNow: number,
    options?: Opts,
  ): Promise<Return>;
  private async scheduleRetryInner<Args, Return, Opts extends RetryExecutionOptions>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    args: Args extends unknown[] ? Args : [Args],
    when: string | Date,
    options?: Opts,
  ): Promise<Return>;
  private async scheduleRetryInner<
    Args,
    Return,
    Opts extends RetryExecutionOptions,
    I extends string | Date | number,
  >(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    args: Args extends unknown[] ? Args : [Args],
    whenOrFromNow: I,
    options?: Opts,
  ): Promise<Return>;
  private async scheduleRetryInner<Args, Return, Opts extends RetryExecutionOptions>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    args: Args extends unknown[] ? Args : [Args],
    whenOrFromNow: string | Date | number,
    options?: Opts,
  ): Promise<Return | void> {
    let retryEvent = new RetryEventImpl({ name: this.name, data: args });
    const existing = await Retry.core.cache.hGetAll(retryEvent.taskUid);
    const isRetry = existing && Object.keys(existing).length > 0;

    const { maxAttempts, onRuntimeError } = this.config;

    if (isRetry) {
      retryEvent = RetryEventImpl.fromRecord<Args extends unknown[] ? Args : [Args]>(existing);
      if (retryEvent.unwrap().attempts >= maxAttempts) {
        this.Metrics.onFailureWithoutRetry();
        Retry.core.logger.error(retryEvent.unwrap(), 'Max retries exceeded');
        return;
      }
    } else {
      await Retry.core.cache.hSet(retryEvent.taskUid, retryEvent.forInsert());
    }

    try {
      const result = await fn(...args);

      const validated = this.validateRetryResult<Return>(result, options?.validationMode === 1);
      if (validated.isOk()) {
        if (isRetry) {
          this.Metrics.onSuccessfulRetry();
        } else {
          this.Metrics.onSuccess();
        }
        return validated.unwrap();
      }
    } catch (err: unknown) {
      onRuntimeError(err as Error);
    }

    const raw = retryEvent.unwrap();
    let scheduled!: ScheduledRetry<Args extends unknown[] ? Args : [Args]>;
    try {
      scheduled = await this.scheduleRetryEvent(whenOrFromNow, raw);
      Retry.core.logger.info(raw, 'Scheduled retry');
      this.Metrics.onFailureWithRetry();
    } catch (e: unknown) {
      Retry.core.logger.error(e, 'Failed to schedule retry', raw);
      this.Metrics.onFailureWithoutRetry();
      if (!isRetry) {
        throw new Error('Failed to schedule retry');
      }
    }

    if (!isRetry) {
      throw new FailedWithScheduledRetryException(scheduled);
    }
  }

  private async scheduleRetryInnerBound<Args, Return, Opts extends RetryExecutionOptions>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    self: unknown,
    args: Args extends unknown[] ? Args : [Args],
    fromNow: number,
    options?: Opts,
  ): Promise<Return>;
  private async scheduleRetryInnerBound<Args, Return, Opts extends RetryExecutionOptions>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    self: unknown,
    args: Args extends unknown[] ? Args : [Args],
    when: string | Date,
    options?: Opts,
  ): Promise<Return>;
  private async scheduleRetryInnerBound<
    Args,
    Return,
    Opts extends RetryExecutionOptions,
    I extends string | Date | number,
  >(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    self: unknown,
    args: Args extends unknown[] ? Args : [Args],
    whenOrFromNow: I,
    options?: Opts,
  ): Promise<Return>;
  private async scheduleRetryInnerBound<Args, Return, Opts extends RetryExecutionOptions>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    self: unknown,
    args: Args extends unknown[] ? Args : [Args],
    whenOrFromNow: string | Date | number,
    options?: Opts,
  ): Promise<Return | void> {
    let retryEvent = new RetryEventImpl({ name: this.name, data: args });
    const existing = await Retry.core.cache.hGetAll(retryEvent.taskUid);
    const isRetry = existing && Object.keys(existing).length > 0;

    const { maxAttempts, onRuntimeError } = this.config;

    if (isRetry) {
      retryEvent = RetryEventImpl.fromRecord<Args extends unknown[] ? Args : [Args]>(existing);
      if (retryEvent.unwrap().attempts >= maxAttempts) {
        this.Metrics.onFailureWithoutRetry();
        Retry.core.logger.error(retryEvent.unwrap(), 'Max retries exceeded');
        return;
      }
    } else {
      await Retry.core.cache.hSet(retryEvent.taskUid, retryEvent.forInsert());
    }

    try {
      const result = await fn.call(self, ...args);

      const validated = this.validateRetryResult<Return>(result, options?.validationMode === 1);
      if (validated.isOk()) {
        if (isRetry) {
          this.Metrics.onSuccessfulRetry();
        } else {
          this.Metrics.onSuccess();
        }
        return validated.unwrap();
      }
    } catch (err: unknown) {
      onRuntimeError(err as Error);
    }

    const raw = retryEvent.unwrap();
    let scheduled!: ScheduledRetry<Args extends unknown[] ? Args : [Args]>;
    try {
      scheduled = await this.scheduleRetryEvent(whenOrFromNow, raw);
      Retry.core.logger.info(raw, 'Scheduled retry');
      this.Metrics.onFailureWithRetry();
    } catch (e: unknown) {
      Retry.core.logger.error(e, 'Failed to schedule retry', raw);
      this.Metrics.onFailureWithoutRetry();
      if (!isRetry) {
        throw new Error('Failed to schedule retry');
      }
    }

    if (!isRetry) {
      throw new FailedWithScheduledRetryException(scheduled);
    }
  }

  private async scheduleRetryEvent<Args>(
    fromNow: number,
    event: RetryEvent<Args>,
  ): Promise<ScheduledRetry<Args>>;
  private async scheduleRetryEvent<Args>(
    when: string | Date,
    event: RetryEvent<Args>,
  ): Promise<ScheduledRetry<Args>>;
  private async scheduleRetryEvent<Args, I extends string | Date | number>(
    whenOrFromNow: I,
    event: RetryEvent<Args>,
  ): Promise<ScheduledRetry<Args>>;
  private async scheduleRetryEvent<Args, I extends string | Date | number>(
    whenOrFromNow: I,
    event: RetryEvent<Args>,
  ): Promise<ScheduledRetry<Args>> {
    const scheduledRetry = new ScheduledRetry(event.taskUid, event.data, whenOrFromNow);
    try {
      await Promise.allSettled([
        Retry.core.scheduler.schedule(whenOrFromNow, KeyBuilder.retryEventKey(this.name), event),
        Retry.core.cache.hSet(event.taskUid, 'attempts', event.attempts + 1),
      ]);
      return scheduledRetry;
    } catch (err: unknown) {
      return scheduledRetry;
    }
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

  readonly Metrics: RetryMetricsImpl;
}
