import { ScheduledRetry } from '../internal';

export class FailedWithScheduledRetryException<Args> extends Error {
  constructor(readonly retryContext: ScheduledRetry<Args>) {
    super();
    this.name = 'FailedWithScheduledRetryException';
  }
}
