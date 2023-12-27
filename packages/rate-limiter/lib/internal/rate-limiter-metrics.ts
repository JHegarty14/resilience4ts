import { Metrics, NoopMetrics, SlidingTimeWindowMetrics } from '@forts/resilience4ts-core';

export class RateLimiterMetrics {
  private readonly metrics: Metrics;
  constructor(windowSize?: number) {
    if (windowSize !== undefined) {
      this.metrics = new SlidingTimeWindowMetrics(1000);
    } else {
      this.metrics = new NoopMetrics();
    }
  }

  onCounterValueResolved(availablePermits: number, maxAllowed: number) {
    this.metrics.record(['ktwo', 'kthree', 'kfour'], {
      kthree: availablePermits,
      kfour: maxAllowed,
    });
  }

  getAvailablePermits(): number {
    const snapshot = this.metrics.getSnapshot();

    return snapshot.getBucketKeyValue('kthree');
  }
  getWaitingCount(): number {
    const snapshot = this.metrics.getSnapshot();

    return snapshot.getBucketKeyValue('kfour');
  }
}

export const AVAILABLE_PERMITS = 'available_permits';

export const WAITING_COUNT = 'waiting_count';
