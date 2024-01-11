import {
  type AtomicValueKey,
  type Duration,
  Metrics,
  SlidingTimeWindowMetrics,
  NoopMetrics,
} from '@forts/resilience4ts-core';
import { TimeoutConfig } from '../types';

export class TimeoutMetrics {
  private readonly metrics: Metrics;
  constructor(
    private readonly config: TimeoutConfig,
    windowSize?: number,
  ) {
    if (windowSize !== undefined) {
      this.metrics = new SlidingTimeWindowMetrics(config.timeout);
    } else {
      this.metrics = new NoopMetrics();
    }
  }

  onSuccess(duration: Duration) {
    this.metrics.record(OutcomeToUpdatableBucketKeys[Outcome.Success], { kone: duration });
  }

  onFailure(duration: Duration) {
    this.metrics.record(OutcomeToUpdatableBucketKeys[Outcome.Error], { kone: duration });
  }

  onTimeout() {
    this.metrics.record(OutcomeToUpdatableBucketKeys[Outcome.Timeout], {
      kone: this.config.timeout,
    });
  }

  getNumberOfTotalCalls(): number {
    const snapshot = this.metrics.getSnapshot();

    return snapshot.getBucketKeyValue('ktwo');
  }

  getNumberOfSuccessfulCalls(): number {
    const snapshot = this.metrics.getSnapshot();

    return snapshot.getDiffOfBucketKeys('ktwo', 'kthree');
  }

  getNumberOfFailedCalls(): number {
    const snapshot = this.metrics.getSnapshot();

    return snapshot.getBucketKeyValue('kthree');
  }

  getNumberOfTimeouts(): number {
    const snapshot = this.metrics.getSnapshot();

    return snapshot.getBucketKeyValue('kfour');
  }
}

enum Outcome {
  Success,
  Error,
  Timeout,
}

/**
 * Maps the outcome of a call to the metrics to the generic MetricsBucket keys that should be updated.
 *
 * kone: total duration
 * ktwo: total number of calls
 * kthree: total number of failed calls
 * kfour: total number of calls resulting in a timeout
 */
const OutcomeToUpdatableBucketKeys: Record<Outcome, AtomicValueKey[]> = {
  [Outcome.Success]: ['ktwo'],
  [Outcome.Error]: ['ktwo', 'kthree'],
  [Outcome.Timeout]: ['ktwo', 'kfour'],
};

export const SUCCESSFUL = 'successful';

export const FAILED = 'failed';

export const TIMEOUT = 'timeout';
