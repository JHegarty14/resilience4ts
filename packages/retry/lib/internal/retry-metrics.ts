import {
  SlidingTimeWindowMetrics,
  type AtomicValueKey,
  Metrics,
  NoopMetrics,
} from '@forts/resilience4ts-core';

export class RetryMetricsImpl {
  private readonly metrics: Metrics;
  constructor(windowSize?: number) {
    if (windowSize !== undefined) {
      this.metrics = new SlidingTimeWindowMetrics(windowSize);
    } else {
      this.metrics = new NoopMetrics();
    }
  }

  onSuccessfulRetry() {
    this.metrics.record(OutcomeToUpdatableBucketKeys[Outcome.RetrySuccess]);
  }

  onSuccess() {
    this.metrics.record(OutcomeToUpdatableBucketKeys[Outcome.Success]);
  }

  onFailureWithRetry() {
    this.metrics.record(OutcomeToUpdatableBucketKeys[Outcome.FailureWithRetry]);
  }

  onFailureWithoutRetry() {
    this.metrics.record(OutcomeToUpdatableBucketKeys[Outcome.FailureWithoutRetry]);
  }

  getNumberOfSuccessfulCallsWithoutRetryAttempt(): number {
    const snapshot = this.metrics.getSnapshot();

    return snapshot.getDiffOfBucketKeys('ktwo', 'kfour');
  }

  getNumberOfFailedCallsWithRetry(): number {
    const snapshot = this.metrics.getSnapshot();

    return snapshot.getDiffOfBucketKeys('kthree', 'kfive');
  }

  getNumberOfSuccessfulCallsFromRetry(): number {
    const snapshot = this.metrics.getSnapshot();

    return snapshot.getBucketKeyValue('kfour');
  }

  getNumberOfFailedCallsWithoutRetry(): number {
    const snapshot = this.metrics.getSnapshot();

    return snapshot.getBucketKeyValue('kfive');
  }

  getTotalNumberOfCalls(): number {
    const snapshot = this.metrics.getSnapshot();

    return snapshot.getBucketKeyValue('ktwo');
  }

  getNumberOfFailedCalls(): number {
    const snapshot = this.metrics.getSnapshot();

    return snapshot.getBucketKeyValue('kthree');
  }

  getNumberOfSuccessfulCalls(): number {
    const snapshot = this.metrics.getSnapshot();

    return snapshot.getDiffOfBucketKeys('ktwo', 'kthree');
  }
}

enum Outcome {
  Success,
  RetrySuccess,
  FailureWithRetry,
  FailureWithoutRetry,
}

/**
 * Maps the outcome of a call to the metrics to the generic MetricsBucket keys that should be updated.
 *
 * kone: total duration
 * ktwo: total number of calls
 * kthree: total number of failed calls
 * kfour: total number of calls from retries
 * kfive: total number of failed calls that did not trigger a retry
 */
const OutcomeToUpdatableBucketKeys: Record<Outcome, AtomicValueKey[]> = {
  [Outcome.Success]: ['ktwo'],
  [Outcome.RetrySuccess]: ['ktwo', 'kfour'],
  [Outcome.FailureWithRetry]: ['ktwo', 'kthree'],
  [Outcome.FailureWithoutRetry]: ['ktwo', 'kthree', 'kfour', 'kfive'],
};

export const SUCCESSFUL_CALLS_WITHOUT_RETRY = 'successful_calls_without_retry';

export const FAILED_CALLS_WITH_RETRY = 'failed_calls_with_retry';

export const SUCCESSFUL_CALLS_WITH_RETRY = 'successful_calls_with_retry';

export const FAILED_CALLS_WITHOUT_RETRY = 'failed_calls_without_retry';
