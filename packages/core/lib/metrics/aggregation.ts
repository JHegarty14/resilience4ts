import { Duration } from '../types';

export class Aggregation {
  totalDurationInMillis: Duration;
  numberOfSlowCalls: number;
  numberOfSlowFailedCalls: number;
  numberOfFailedCalls: number;
  numberOfCalls: number;
  numberOfNotPermittedCalls: number;

  constructor() {
    this.totalDurationInMillis = 0;
    this.numberOfSlowCalls = 0;
    this.numberOfSlowFailedCalls = 0;
    this.numberOfFailedCalls = 0;
    this.numberOfCalls = 0;
    this.numberOfNotPermittedCalls = 0;
  }

  removeBucket(bucket: Aggregation) {
    this.totalDurationInMillis -= bucket.totalDurationInMillis;
    this.numberOfSlowCalls -= bucket.numberOfSlowCalls;
    this.numberOfSlowFailedCalls -= bucket.numberOfSlowFailedCalls;
    this.numberOfFailedCalls -= bucket.numberOfFailedCalls;
    this.numberOfCalls -= bucket.numberOfCalls;
  }

  withTotalDurationInMillis(totalDurationInMillis: Duration) {
    this.totalDurationInMillis = totalDurationInMillis;
    return this;
  }

  withNumberOfSlowCalls(numberOfSlowCalls: number) {
    this.numberOfSlowCalls = numberOfSlowCalls;
    return this;
  }

  withNumberOfSlowFailedCalls(numberOfSlowFailedCalls: number) {
    this.numberOfSlowFailedCalls = numberOfSlowFailedCalls;
    return this;
  }

  withNumberOfFailedCalls(numberOfFailedCalls: number) {
    this.numberOfFailedCalls = numberOfFailedCalls;
    return this;
  }

  withNumberOfCalls(numberOfCalls: number) {
    this.numberOfCalls = numberOfCalls;
    return this;
  }

  withNumberOfNotPermittedCalls(numberOfNotPermittedCalls: number) {
    this.numberOfNotPermittedCalls = numberOfNotPermittedCalls;
    return this;
  }
}
