import { Duration } from '../types';
import {
  RawMetricsBucket,
  MetricsBucketImpl,
  MetricsBucket,
  InMemoryMetricsBucket,
} from './bucket';

export interface Snapshot {
  /**
   * Returns the current total duration of all calls.
   *
   * @return the current total duration of all calls
   */
  getTotalDuration(): Duration;

  /**
   * Returns the current average duration of all calls.
   *
   * @return the current average duration of all calls
   */
  getAverageDuration(): Duration;

  /**
   * Returns the current number of calls which were slower than a certain threshold.
   *
   * @return the current number of calls which were slower than a certain threshold
   */
  getTotalNumberOfSlowCalls(): number;

  /**
   * Returns the current number of successful calls which were slower than a certain threshold.
   *
   * @return the current number of successful calls which were slower than a certain threshold
   */
  getNumberOfSlowSuccessfulCalls(): number;

  /**
   * Returns the current number of failed calls which were slower than a certain threshold.
   *
   * @return the current number of failed calls which were slower than a certain threshold
   */
  getNumberOfSlowFailedCalls(): number;

  /**
   * Returns the current percentage of calls which were slower than a certain thxreshold.
   *
   * @return the current percentage of calls which were slower than a certain threshold
   */
  getSlowCallRate(): number;

  /**
   * Returns the current number of successful calls.
   *
   * @return the current number of successful calls
   */
  getNumberOfSuccessfulCalls(): number;

  /**
   * Returns the current number of failed calls.
   *
   * @return the current number of failed calls
   */
  getNumberOfFailedCalls(): number;

  /**
   * Returns the current total number of all calls.
   *
   * @return the current total number of all calls
   */
  getTotalNumberOfCalls(): number;

  /**
   * Returns the current failure rate in percentage.
   *
   * @return the current  failure rate in percentage
   */
  getFailureRate(): number;

  /**
   * Returns the current number of calls which were not permitted.
   *
   * @return the current number of calls which were not permitted.
   */
  getNumberOfNotPermittedCalls(): number;
}

export class SnapshotImpl {
  private kone: Duration;
  private ktwo: number;
  private kthree: number;
  private kfour: number;
  private kfive: number;
  private ksix: number;
  private snapshotStart: number;
  private snapshotEnd: number;

  constructor(...buckets: MetricsBucket<number>[]) {
    this.kone = 0;
    this.ktwo = 0;
    this.kthree = 0;
    this.kfour = 0;
    this.kfive = 0;
    this.ksix = 0;
    for (const bucket of buckets) {
      this.kone += bucket.kone;
      this.ktwo += bucket.ktwo;
      this.kthree += bucket.kthree;
      this.kfour += bucket.kfour;
      this.kfive += bucket.kfive;
      this.ksix += bucket.ksix;
    }
    this.snapshotStart = this.calcSnapshotStart(buckets);
    this.snapshotEnd = this.calcSnapshotEnd(buckets);
  }

  static fromAggregates(...aggregates: InMemoryMetricsBucket[]) {
    const buckets = aggregates.map((a) => a.into<MetricsBucketImpl>(MetricsBucketImpl));
    return new SnapshotImpl(...buckets);
  }

  static fromRaw(...raw: RawMetricsBucket[]): SnapshotImpl {
    if (Array.isArray(raw)) {
      try {
        const buckets = raw.map((r) => MetricsBucketImpl.fromRaw(r));
        return new SnapshotImpl(...buckets);
      } catch (err: unknown) {
        throw new Error(`Failed to parse snapshot: ${err}`);
      }
    }

    try {
      const parsed = MetricsBucketImpl.fromRaw(raw);
      return new SnapshotImpl(parsed);
    } catch (err: unknown) {
      throw new Error(`Failed to parse snapshot: ${err}`);
    }
  }

  getSnapshotStart(): number {
    return this.snapshotStart;
  }

  getSnapshotEnd(): number {
    return this.snapshotEnd;
  }

  getDiffOfBucketKeys(a: keyof MetricsBucket, b: keyof MetricsBucket): number {
    return this[a] - this[b];
  }

  getSumOfBucketKeys(a: keyof MetricsBucket, b: keyof MetricsBucket): number {
    return this[a] + this[b];
  }

  getRateOfBucketKeys(num: keyof MetricsBucket, den: keyof MetricsBucket): number {
    if (this[den] === 0) {
      return 0;
    }

    return (this[num] / this[den]) * 100;
  }

  getBucketKeyValue(key: keyof MetricsBucket): number {
    return this[key];
  }

  removeBucket(bucket: MetricsBucket<number>): void {
    this.kone -= bucket.kone;
    this.ktwo -= bucket.ktwo;
    this.kthree -= bucket.kthree;
    this.kfour -= bucket.kfour;
    this.kfive -= bucket.kfive;
    this.ksix -= bucket.ksix;
  }

  private calcSnapshotStart(buckets: MetricsBucket<number>[]): number {
    const ts = buckets.map((b) => b.init_ts);
    return Math.min(...ts);
  }

  private calcSnapshotEnd(buckets: MetricsBucket<number>[]): number {
    const ts = buckets.map((b) => b.init_ts);
    return Math.max(...ts) + (buckets?.[0]?.interval ?? 0);
  }
}
