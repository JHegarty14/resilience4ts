import { AtomicValueKey, InMemoryMetricsBucket } from './bucket';
import { Metrics } from './metrics';
import { SnapshotImpl } from './snapshot';

export class SlidingTimeWindowMetrics implements Metrics {
  private readonly windowSizeInSeconds: number;
  private readonly partialAggregation: InMemoryMetricsBucket[];
  private headIdx: number;

  constructor(windowSizeMs: number) {
    this.windowSizeInSeconds = Math.max(Math.floor(windowSizeMs / 1000), 1);
    this.headIdx = 0;
    this.partialAggregation = [];
    let epochSecond = Math.floor(Date.now() / 1000);
    for (let i = 0; i < this.windowSizeInSeconds; i++) {
      this.partialAggregation.push(
        new InMemoryMetricsBucket(epochSecond, this.windowSizeInSeconds),
      );
      epochSecond++;
    }
  }

  record(
    keysToIncrement: AtomicValueKey[],
    valuesForKeys?: Partial<Record<AtomicValueKey, number>>,
  ): void {
    this.moveWindowToCurrentEpocSecond(this.getLatestPartialAggregation()).record(
      keysToIncrement,
      valuesForKeys,
    );
  }

  moveWindowToCurrentEpocSecond(
    latestPartialAggregation: InMemoryMetricsBucket,
  ): InMemoryMetricsBucket {
    const currentEpochSecond = Math.floor(Date.now() / 1000);
    const diffInSeconds = currentEpochSecond - latestPartialAggregation.getInitialTimestamp();
    if (diffInSeconds === 0) {
      return latestPartialAggregation;
    }

    let secondsToMove = Math.min(diffInSeconds, this.windowSizeInSeconds);
    let currentPartialAggregation!: InMemoryMetricsBucket;
    while (secondsToMove > 0) {
      secondsToMove--;
      this.moveHeadIndexByOne();
      currentPartialAggregation = this.getLatestPartialAggregation();
      currentPartialAggregation.reset(currentEpochSecond - secondsToMove);
    }

    return currentPartialAggregation;
  }

  getLatestPartialAggregation() {
    return this.partialAggregation[this.headIdx];
  }

  moveHeadIndexByOne() {
    this.headIdx = (this.headIdx + 1) % this.windowSizeInSeconds;
  }

  getSnapshot(): SnapshotImpl {
    this.moveWindowToCurrentEpocSecond(this.getLatestPartialAggregation());
    return SnapshotImpl.fromAggregates(...this.partialAggregation);
  }
}
