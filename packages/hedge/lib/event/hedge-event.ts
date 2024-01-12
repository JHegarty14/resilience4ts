import type { Json, ResilienceEvent } from '@forts/resilience4ts-core';

export class HedgeEvent implements ResilienceEvent<HedgeEventContext> {
  constructor(
    readonly name: string,
    readonly context: HedgeEventContext,
    readonly type = 'r4t-HedgeEvent',
  ) {}

  static fromError(
    name: string,
    error: Error | Json,
    duration: number,
    type: HedgeFailureEvent,
  ): HedgeEvent {
    return new HedgeEvent(name, {
      type,
      error,
      duration,
    });
  }

  get eventName() {
    return `${this.type}-${this.context.type}`;
  }
}

export type HedgeEventContext = {
  duration: number;
} & (
  | {
      type: HedgeEventType.PrimarySuccess | HedgeEventType.SecondarySuccess;
    }
  | {
      type: HedgeEventType.PrimaryFailure | HedgeEventType.SecondaryFailure;
      error: Error | Json;
    }
);

export enum HedgeEventType {
  PrimarySuccess = 'primary-success',
  PrimaryFailure = 'primary-failure',
  SecondarySuccess = 'secondary-success',
  SecondaryFailure = 'secondary-failure',
}

type HedgeFailureEvent = HedgeEventType.PrimaryFailure | HedgeEventType.SecondaryFailure;
