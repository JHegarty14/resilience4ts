import type { Json } from '@forts/resilience4ts-core';
import { MaxRetriesExceeded } from '../exceptions';
import { ScheduledRetry } from '../internal/scheduled-retry';

export type RetryException = MaxRetriesExceeded | Error | Json;

export type ScheduledRetryException = ScheduledRetry<unknown> | MaxRetriesExceeded | Error | Json;
