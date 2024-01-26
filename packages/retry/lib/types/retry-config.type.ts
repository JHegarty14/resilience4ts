import { Guard } from '@forts/resilience4ts-core';
import { RetryException, ScheduledRetryException } from './retry-exception.type';

export type RetryConfig = {
  readonly wait?: number;
  readonly maxAttempts?: number;
  readonly whitelist?: Array<Error>;
  readonly retryMode?: RetryBackoff;
  readonly maxInterval?: number;

  readonly validateResult?: ValidateResultFn;
  readonly onRuntimeError?: OnRuntimeExceptionFn;
};

export class RetryConfigImpl {
  private readonly defaultWait: number = 500;
  private readonly defaultMaxAttempts: number = 3;
  private readonly defaultMaxInterval: number = 60000;
  private readonly defaultRetryBackoff = RetryBackoff.Linear;

  private readonly defaultValidateResult = <T>(result: T) => {
    return !(result instanceof Error) || this.whitelist.every((e) => e.name !== result.name);
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private readonly defaultOnRuntimeException = (_: ScheduledRetryException) => void 0;

  wait: number;
  maxAttempts: number;
  whitelist: Error[];
  retryMode: RetryBackoff;
  maxInterval: number;
  validateResult: ValidateResultFn;
  onRuntimeError: OnRuntimeExceptionFn;

  constructor(config: RetryConfig) {
    this.wait = config.wait ?? this.defaultWait;
    this.maxAttempts = config.maxAttempts ?? this.defaultMaxAttempts;
    this.whitelist = config.whitelist ?? [];
    this.retryMode = config.retryMode ?? this.defaultRetryBackoff;
    this.maxInterval = config.maxInterval ?? this.defaultMaxInterval;

    this.validateResult = config.validateResult ?? this.defaultValidateResult;
    this.onRuntimeError = config.onRuntimeError ?? this.defaultOnRuntimeException;
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

  withWhitelist(whitelist: Array<Error>): RetryConfigImpl {
    this.whitelist = whitelist;
    return this;
  }

  onResult(fn: ValidateResultFn): RetryConfigImpl {
    this.validateResult = fn;
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

export type RetryExecutionOptions = {
  readonly backoff?: RetryBackoff;
  readonly validationMode?: RetryValidationMode | undefined;
};

type ValidateResultFn = <T>(result: T) => boolean;

type OnRuntimeExceptionFn = (err: RetryException | ScheduledRetryException) => void;

export enum RetryBackoff {
  Linear = 'linear',
  Exponential = 'exponential',
  Jitter = 'jitter',
  Constant = 'constant',
  Immediate = 'immediate',
  Scheduled = 'scheduled',
}

export enum RetryValidationMode {
  Default,
  Strict,
}

export const defaultRetryExecutionOptions = {
  backoff: RetryBackoff.Linear as const,
  validationMode: RetryValidationMode.Default as const,
} satisfies RetryExecutionOptions;
