import { Guard } from '@forts/resilience4ts-core';
import { RetryException } from './retry-exception.type';
import { Bucketable } from '@forts/resilience4ts-core/lib/types';

export enum RetryStrategy {
  Budgeted,
  Default,
}

export type RetryConfig = {
  readonly wait?: number;
  readonly maxAttempts?: number;
  readonly retryMode?: RetryBackoff;
  readonly maxInterval?: number;

  readonly onRuntimeError?: OnRuntimeExceptionFn;
  readonly until?: ValidateResultFn;
} & (
  | {
      readonly retryStrategy: RetryStrategy.Budgeted;
      readonly windowBudget: number;
      readonly windowSize: number;
    }
  | {
      readonly retryStrategy?: RetryStrategy.Default;
    }
);

export class RetryConfigImpl {
  private readonly defaultWait: number = 500;
  private readonly defaultMaxAttempts: number = 3;
  private readonly defaultMaxInterval: number = 60000;
  private readonly defaultRetryBackoff = RetryBackoff.Linear;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private readonly defaultOnRuntimeException = (_: RetryException) => void 0;
  currentAttempt = 0;
  wait: number;
  maxAttempts: number;
  retryMode: RetryBackoff;
  retryStrategy: RetryStrategy;
  windowBudget: number;
  windowSize: number;
  maxInterval: number;
  onRuntimeError: OnRuntimeExceptionFn;
  until?: ValidateResultFn;

  constructor(config: RetryConfig) {
    this.wait = config.wait ?? this.defaultWait;
    this.maxAttempts = config.maxAttempts ?? this.defaultMaxAttempts;
    this.retryMode = config.retryMode ?? this.defaultRetryBackoff;
    this.maxInterval = config.maxInterval ?? this.defaultMaxInterval;
    this.retryStrategy = config.retryStrategy ?? RetryStrategy.Default;
    this.windowBudget = config.retryStrategy === RetryStrategy.Budgeted ? config.windowBudget : 0;
    this.windowSize = config.retryStrategy === RetryStrategy.Budgeted ? config.windowSize : 0;
    this.onRuntimeError = config.onRuntimeError ?? this.defaultOnRuntimeException;
    this.until = config.until;
  }

  withMaxAttempts(maxAttempts: number): RetryConfigImpl {
    Guard.throwIfNotPositive(maxAttempts, 'maxAttempts');

    this.maxAttempts = maxAttempts;
    return this;
  }

  withWait(wait: number): RetryConfigImpl {
    Guard.throwIfNotPositive(wait, 'wait');

    this.wait = wait;
    return this;
  }

  onResult(fn: ValidateResultFn): RetryConfigImpl {
    this.until = fn;
    return this;
  }

  onRuntimeException(fn: OnRuntimeExceptionFn): RetryConfigImpl {
    this.onRuntimeError = fn;
    return this;
  }

  static ofDefaults() {
    return new RetryConfigImpl({});
  }
}

type ValidateResultFn = <T>(result: T) => boolean;

type OnRuntimeExceptionFn = (err: RetryException) => void;

export enum RetryBackoff {
  Linear = 'linear',
  Exponential = 'exponential',
  Jitter = 'jitter',
  Constant = 'constant',
  Immediate = 'immediate',
}

export enum RetryValidationMode {
  Default,
  Strict,
}

export type RetryBucket = {
  lastFailure: number;
} & Bucketable;

export const defaultRetryBucket = (): RetryBucket => ({
  success: 0,
  failure: 0,
  rejection: 0,
  lastFailure: 0,
});

export const recordToRetryBucket = (record: { [x: string]: string }): RetryBucket => ({
  success: parseInt(record.success),
  failure: parseInt(record.failure),
  rejection: parseInt(record.rejection),
  lastFailure: parseInt(record.lastFailure),
});
