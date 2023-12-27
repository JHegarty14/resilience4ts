import { Metrics, NoopMetrics, SlidingTimeWindowMetrics } from '@forts/resilience4ts-core';
import { BulkheadConfigImpl } from '../types';

export class BulkheadMetricsImpl {
  private readonly metrics: Metrics;
  constructor(private readonly config: BulkheadConfigImpl, windowSize?: number) {
    if (windowSize !== undefined) {
      this.metrics = new SlidingTimeWindowMetrics(windowSize);
    } else {
      this.metrics = new NoopMetrics();
    }
  }

  onCounterValueResolved(availablePermits: number) {
    this.metrics.record(['ktwo'], {
      kthree: availablePermits,
    });
  }

  getAvailableConcurrentCalls(): number {
    const snapshot = this.metrics.getSnapshot();

    return Math.max(0, this.config.maxConcurrent - snapshot.getBucketKeyValue('kthree'));
  }

  getMaxAllowedConcurrentCalls(): number {
    return this.config.maxConcurrent;
  }
}

export const AVAILABLE_CONCURRENT_CALLS = 'available_concurrent_calls';

export const MAX_ALLOWED_CONCURRENT_CALLS = 'max_allowed_concurrent_calls';
