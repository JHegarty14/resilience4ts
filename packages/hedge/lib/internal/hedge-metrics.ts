import {
  type AtomicValueKey,
  type Duration,
  Metrics,
  SlidingTimeWindowMetrics,
  NoopMetrics,
} from '@forts/resilience4ts-core';
import { HedgeConfigImpl } from '../types';

export class HedgeMetrics {
  private readonly metrics: Metrics;
  constructor(private readonly config: HedgeConfigImpl, windowSize?: number) {
    if (windowSize !== undefined) {
      this.metrics = new SlidingTimeWindowMetrics(1000);
    } else {
      this.metrics = new NoopMetrics();
    }
  }

  getCurrentHedgeDelay(): number {
    return this.config.delay;
  }

  onPrimarySuccess(duration: Duration): void {
    this.metrics.record(OutcomeToUpdatableBucketKeys[Outcome.PrimarySuccess], { kone: duration });
  }

  onPrimaryFailure(duration: Duration): void {
    this.metrics.record(OutcomeToUpdatableBucketKeys[Outcome.PrimaryFailure], { kone: duration });
  }

  onHedgeSuccess(duration: Duration): void {
    this.metrics.record(OutcomeToUpdatableBucketKeys[Outcome.HedgeSuccess], { kone: duration });
  }

  onHedgeFailure(duration: Duration): void {
    this.metrics.record(OutcomeToUpdatableBucketKeys[Outcome.HedgeFailure], { kone: duration });
  }

  getNumberOfPrimarySuccesses(): number {
    const snapshot = this.metrics.getSnapshot();

    return snapshot.getDiffOfBucketKeys('kthree', 'kfive');
  }

  getNumberOfHedgeSuccesses(): number {
    const snapshot = this.metrics.getSnapshot();

    return snapshot.getDiffOfBucketKeys('kseven', 'keight');
  }

  getNumberOfPrimaryFailures(): number {
    const snapshot = this.metrics.getSnapshot();

    return snapshot.getBucketKeyValue('kfive');
  }

  getNumberOfHedgeFailures(): number {
    const snapshot = this.metrics.getSnapshot();

    return snapshot.getBucketKeyValue('keight');
  }
}

enum Outcome {
  PrimarySuccess,
  PrimaryFailure,
  HedgeSuccess,
  HedgeFailure,
}

/**
 * Maps the outcome of a call to the metrics to the generic MetricsBucket keys that should be updated.
 *
 * kone: total duration
 * ktwo: total number of calls
 * kthree: total number of primary calls
 * kfour: total number of successful calls
 * kfive: total number of failed primary calls
 * ksix: total number of failed calls
 * kseven: total number of hedged calls
 * keight: total number of failed hedged calls
 */
const OutcomeToUpdatableBucketKeys: Record<Outcome, AtomicValueKey[]> = {
  [Outcome.PrimarySuccess]: ['kone', 'ktwo', 'kthree', 'kfour'],
  [Outcome.PrimaryFailure]: ['kone', 'ktwo', 'kthree', 'kfive'],
  [Outcome.HedgeSuccess]: ['kone', 'ktwo', 'kfour', 'kseven', 'keight'],
  [Outcome.HedgeFailure]: ['kone', 'ktwo', 'kseven', 'keight'],
};

export const PRIMARY_SUCCESS = 'primary_success';

export const PRIMARY_FAILURE = 'primary_failure';

export const HEDGE_SUCCESS = 'hedge_success';

export const HEDGE_FAILURE = 'hedge_failure';
