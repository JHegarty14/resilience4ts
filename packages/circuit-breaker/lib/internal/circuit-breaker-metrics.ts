import {
  type AtomicValueKey,
  type Duration,
  Metrics,
  SizedSlidingWindowMetrics,
  SlidingTimeWindowMetrics,
  NoopMetrics,
} from '@forts/resilience4ts-core';
import {
  CircuitBreakerConfigImpl,
  type CircuitBreakerMetrics,
  CircuitBreakerStrategy,
} from '../types';

export class CircuitBreakerMetricsImpl implements CircuitBreakerMetrics {
  private readonly metrics: Metrics;
  private readonly slowCallDurationThreshold: Duration;
  private readonly minimumNumberOfCalls: number;
  constructor(config: CircuitBreakerConfigImpl, windowSize?: number, slowCallDuration = 1000) {
    if (windowSize === undefined) {
      this.metrics = new NoopMetrics();
      this.minimumNumberOfCalls = config.minimumFailures;
    } else if (config.strategy === CircuitBreakerStrategy.Volume) {
      this.metrics = new SizedSlidingWindowMetrics(windowSize);
      this.minimumNumberOfCalls = Math.min(config.minimumFailures, config.threshold);
    } else {
      this.metrics = new SlidingTimeWindowMetrics(windowSize);
      this.minimumNumberOfCalls = config.minimumFailures;
    }
    this.slowCallDurationThreshold = slowCallDuration;
  }

  onCallNotPermitted() {
    const outcome = Outcome.NotPermitted;
    this.metrics.record(OutcomeToUpdatableBucketKeys[outcome]);
  }

  onCallSuccess(duration: number) {
    const outcome =
      duration >= this.slowCallDurationThreshold ? Outcome.SlowSuccess : Outcome.Success;
    this.metrics.record(OutcomeToUpdatableBucketKeys[outcome], { kone: duration });
  }

  onCallFailure(duration: number) {
    const outcome = duration >= this.slowCallDurationThreshold ? Outcome.SlowError : Outcome.Error;
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

    if (snapshot.getBucketKeyValue('ktwo') < this.minimumNumberOfCalls) {
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

    if (snapshot.getBucketKeyValue('ktwo') < this.minimumNumberOfCalls) {
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
   * Returns the current number of not permitted calls, when the state is OPEN.
   *
   * The number of denied calls is always 0, when the CircuitBreaker state is CLOSED or
   * HALF_OPEN. The number of denied calls is only increased when the CircuitBreaker state is
   * OPEN.
   *
   * @return the current number of not permitted calls
   */
  getNumberOfNotPermittedCalls(): number {
    const snapshot = this.metrics.getSnapshot();
    return snapshot.getBucketKeyValue('ksix');
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
}

enum Outcome {
  Success,
  Error,
  SlowSuccess,
  SlowError,
  NotPermitted,
}

/**
 * Maps the outcome of a call to the metrics to the generic MetricsBucket keys that should be updated.
 *
 * kone: total duration
 * ktwo: total number of calls
 * kthree: total number of failed calls
 * kfour: total number of slow calls
 * kfive: total number of slow failed calls
 * ksix: total number of calls that were not permitted
 */
const OutcomeToUpdatableBucketKeys: Record<Outcome, AtomicValueKey[]> = {
  [Outcome.Success]: ['ktwo'],
  [Outcome.Error]: ['ktwo', 'kthree'],
  [Outcome.SlowSuccess]: ['ktwo', 'kfour'],
  [Outcome.SlowError]: ['ktwo', 'kthree', 'kfour', 'kfive'],
  [Outcome.NotPermitted]: ['ksix'],
};

export const SUCCESSFUL = 'successful';

export const FAILED = 'failed';

export const NOT_PERMITTED = 'not_permitted';

export const FAILURE_RATE = 'failure_rate';

export const SLOW = 'slow';

export const SLOW_SUCCESSFUL = 'slow_successful';

export const SLOW_FAILED = 'slow_failed';

export const SLOW_RATE = 'slow_rate';
