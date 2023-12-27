import { AtomicValueKey, InMemoryMetricsBucket } from './bucket';
import { Metrics } from './metrics';
import { SnapshotImpl } from './snapshot';

export class SizedSlidingWindowMetrics implements Metrics {
  readonly partialAggregation: InMemoryMetricsBucket[];
  private readonly aggregation: InMemoryMetricsBucket;
  private headIdx: number;

  constructor(private readonly windowSize: number) {
    this.headIdx = 0;
    this.partialAggregation = [];
    for (let i = 0; i < windowSize; i++) {
      this.partialAggregation.push(new InMemoryMetricsBucket(0, windowSize));
    }
    this.aggregation = new InMemoryMetricsBucket(0);
  }

  record(
    keysToIncrement: AtomicValueKey[],
    valuesForKeys?: Partial<Record<AtomicValueKey, number>>
  ): void {
    this.aggregation.record(keysToIncrement, valuesForKeys);
    this.partialAggregation[this.headIdx].record(keysToIncrement, valuesForKeys);
    this.moveHeadIndexByOne();
  }

  moveHeadIndexByOne() {
    this.headIdx = (this.headIdx + 1) % this.windowSize;
  }

  getSnapshot(): SnapshotImpl {
    return this.aggregation.into<SnapshotImpl>(SnapshotImpl);
  }
}
