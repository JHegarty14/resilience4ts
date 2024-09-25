import { Aggregation } from './aggregation';

export class PartialAggregation extends Aggregation {
  private epochMs: number;

  constructor(epochMs: number) {
    super();
    this.epochMs = epochMs;
  }

  reset(epochMs: number) {
    this.epochMs = epochMs;
    this.totalDurationInMillis = 0;
    this.numberOfSlowCalls = 0;
    this.numberOfSlowFailedCalls = 0;
    this.numberOfFailedCalls = 0;
    this.numberOfCalls = 0;
  }

  getEpochMs() {
    return this.epochMs;
  }
}
