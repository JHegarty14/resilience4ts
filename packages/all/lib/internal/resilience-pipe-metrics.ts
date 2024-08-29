import { AtomicValueKey, Metrics, SlidingTimeWindowMetrics } from '@forts/resilience4ts-core';
import { ResilienceMetricsConfig } from '@forts/resilience4ts-core/lib/types';
import { ExceptionGuard } from './exception-guard';

export class ResiliencePipeMetrics {
  private readonly metrics: Metrics;

  constructor(private readonly config: ResilienceMetricsConfig) {
    this.metrics = new SlidingTimeWindowMetrics(config.captureInterval);
  }

  handlePipelineResult<T>(result: T | Error, duration: number): void {
    if (!(result instanceof Error)) {
      return this.onCallSuccess(duration);
    }

    if (ExceptionGuard.isTimeoutExceptionVariant(result)) {
      return this.onCallTimeout(duration);
    }

    if (ExceptionGuard.isCancelledOpExceptionVariant(result)) {
      return this.onCallCancelled(duration);
    }

    if (ExceptionGuard.isNotPermittedExceptionVariant(result)) {
      return this.onCallNotPermitted(duration);
    }

    return this.onCallFailure(duration);
  }

  onCallSuccess(duration: number) {
    const outcome =
      duration >= this.config.slowCallDurationThreshold ? Outcome.SlowSuccess : Outcome.Success;
    this.metrics.record(OutcomeToUpdatableBucketKeys[outcome], { kone: duration });
  }

  onCallFailure(duration: number) {
    const outcome =
      duration >= this.config.slowCallDurationThreshold ? Outcome.SlowError : Outcome.Error;
    this.metrics.record(OutcomeToUpdatableBucketKeys[outcome], { kone: duration });
  }

  onCallTimeout(duration: number) {
    const outcome = Outcome.Timeout;
    this.metrics.record(OutcomeToUpdatableBucketKeys[outcome], { kone: duration });
  }

  onCallCancelled(duration: number) {
    const outcome = Outcome.OperationCancelled;
    this.metrics.record(OutcomeToUpdatableBucketKeys[outcome], { kone: duration });
  }

  onCallNotPermitted(duration: number) {
    const outcome = Outcome.NotPermitted;
    this.metrics.record(OutcomeToUpdatableBucketKeys[outcome], { kone: duration });
  }

  /**
   * Returns the current failure rate in percentage. If the number of measured calls is below
   * the minimum number of measured calls, it returns -1.
   *
   * @return the failure rate in percentage
   */
  getFailureRate(): number {
    const snapshot = this.metrics.getSnapshot();

    if (snapshot.getBucketKeyValue('ktwo') < this.config.minimumNumberOfCalls) {
      return -1;
    }

    return snapshot.getRateOfBucketKeys('kthree', 'ktwo');
  }

  /**
   * Returns the current percentage of calls which were slower than a certain threshold. If
   * the number of measured calls is below the minimum number of measured calls, it returns
   * -1.
   *
   * @return the failure rate in percentage
   */
  getSlowCallRate(): number {
    const snapshot = this.metrics.getSnapshot();

    if (snapshot.getBucketKeyValue('ktwo') < this.config.minimumNumberOfCalls) {
      return -1;
    }

    return snapshot.getRateOfBucketKeys('kfour', 'ktwo');
  }

  /**
   * Returns the current total number of calls which were slower than a certain threshold.
   *
   * @return the current total number of calls which were slower than a certain threshold
   */
  getNumberOfSlowCalls(): number {
    const snapshot = this.metrics.getSnapshot();
    return snapshot.getBucketKeyValue('kfour');
  }

  /**
   * Returns the current number of successful calls which were slower than a certain
   * threshold.
   *
   * @return the current number of successful calls which were slower than a certain threshold
   */
  getNumberOfSlowSuccessfulCalls(): number {
    const snapshot = this.metrics.getSnapshot();
    return snapshot.getDiffOfBucketKeys('kfour', 'kfive');
  }

  /**
   * Returns the current number of failed calls which were slower than a certain threshold.
   *
   * @return the current number of failed calls which were slower than a certain threshold
   */
  getNumberOfSlowFailedCalls(): number {
    const snapshot = this.metrics.getSnapshot();
    return snapshot.getBucketKeyValue('kfive');
  }

  /**
   * Returns the current total number of calls.
   *
   * @return he current total number of calls
   */
  getNumberOfHandledCalls(): number {
    const snapshot = this.metrics.getSnapshot();
    return snapshot.getBucketKeyValue('ktwo');
  }

  /**
   * Returns the current number of failed calls.
   *
   * @return the current number of failed calls
   */
  getNumberOfFailedCalls(): number {
    const snapshot = this.metrics.getSnapshot();
    return snapshot.getBucketKeyValue('kthree');
  }

  /**
   * Returns the current number of not permitted calls.
   *
   * @return the current number of not permitted calls
   */
  getNumberOfNotPermittedCalls(): number {
    const snapshot = this.metrics.getSnapshot();
    return snapshot.getBucketKeyValue('kseven');
  }

  /**
   * Returns the current number of successful calls.
   *
   * @return the current number of successful calls
   */
  getNumberOfSuccessfulCalls(): number {
    const snapshot = this.metrics.getSnapshot();
    return snapshot.getDiffOfBucketKeys('ktwo', 'kthree');
  }

  /**
   * Returns the current number of calls which were cancelled.
   *
   * @return the current number of calls which were cancelled
   */
  getNumberOfCancelledCalls(): number {
    const snapshot = this.metrics.getSnapshot();
    return snapshot.getBucketKeyValue('keight');
  }

  /**
   * Returns the current number of calls which timed out.
   *
   * @return the current number of calls which timed out
   */
  getNumberOfTimedOutCalls(): number {
    const snapshot = this.metrics.getSnapshot();
    return snapshot.getBucketKeyValue('ksix');
  }
}

enum Outcome {
  Success,
  Error,
  SlowSuccess,
  SlowError,
  Timeout,
  NotPermitted,
  OperationCancelled,
}

/**
 * Maps the outcome of a call to the metrics to the generic MetricsBucket keys that should be updated.
 *
 * kone: total duration
 * ktwo: total number of calls
 * kthree: total number of failed calls
 * kfour: total number of slow calls
 * kfive: total number of slow failed calls
 * ksix: total number of calls that timed out
 * kseven: total number of calls that were not permitted
 * keight: total number of calls that were cancelled
 */
const OutcomeToUpdatableBucketKeys: Record<Outcome, AtomicValueKey[]> = {
  [Outcome.Success]: ['kone', 'ktwo'],
  [Outcome.Error]: ['kone', 'ktwo', 'kthree'],
  [Outcome.SlowSuccess]: ['kone', 'ktwo', 'kfour'],
  [Outcome.SlowError]: ['kone', 'ktwo', 'kthree', 'kfour', 'kfive'],
  [Outcome.Timeout]: ['kone', 'ktwo', 'ksix'],
  [Outcome.NotPermitted]: ['kone', 'ktwo', 'kseven'],
  [Outcome.OperationCancelled]: ['kone', 'ktwo', 'keight'],
};

export const SUCCESSFUL = 'successful';

export const FAILED = 'failed';

export const SLOW_SUCCESSFUL = 'slow_successful';

export const SLOW_FAILED = 'slow_failed';

export const TIMEOUT = 'timeout';

export const NOT_PERMITTED = 'not_permitted';

export const OPERATION_CANCELLED = 'operation_cancelled';
