import { ResilienceMetricsConfig } from '../types';
import { AtomicValueKey } from './bucket';
import { SnapshotImpl } from './snapshot';

export abstract class Metrics {
  abstract record(
    keysToUpdate: AtomicValueKey[],
    valuesForKeys?: Partial<Record<AtomicValueKey, number>>
  ): void;

  abstract getSnapshot(): SnapshotImpl;
}

export class NoopMetrics extends Metrics {
  getSnapshot() {
    return new SnapshotImpl();
  }

  record(_: AtomicValueKey[], __?: Partial<Record<AtomicValueKey, number>> | undefined): void {
    // noop
    return;
  }
}

export const DefaultMetricsConfig: ResilienceMetricsConfig = {
  captureInterval: 3000,
  minimumNumberOfCalls: 10,
  slowCallDurationThreshold: 1000,
  dataRetentionPolicy: {
    metricsBucketWindow: '1s',
    retentionWindow: '1d',
  },
};
