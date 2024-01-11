import type { Bucketable } from '@forts/resilience4ts-core/lib/types';

export type CircuitBucket = {
  state: CircuitBreakerState;
  inFlight: number;
  lastFailure: number;
} & Bucketable;

export enum CircuitBreakerState {
  Closed,
  HalfOpen,
  Open,
}

export const defaultCircuitBucket = (): CircuitBucket => ({
  state: CircuitBreakerState.Closed,
  inFlight: 0,
  success: 0,
  failure: 0,
  rejection: 0,
  lastFailure: 0,
});

export const incrementables = ['success', 'failure', 'rejection', 'inFlight'] as const;

export type CircuitTimestamp = number;
export type CircuitInterval = number;
export type CircuitUid = `${CircuitTimestamp}-${CircuitInterval}`;

// Sorted Set
export type CircuitEvent = {
  timestamp: CircuitTimestamp;
  circuitUid: string;
};

// Strings
export type Incrementable = (typeof incrementables)[number];

export function recordToCircuitBucket(record: { [x: string]: string }): CircuitBucket {
  return {
    state: parseInt(record.state),
    inFlight: parseInt(record.inFlight),
    success: parseInt(record.success),
    failure: parseInt(record.failure),
    rejection: parseInt(record.rejection),
    lastFailure: parseInt(record.lastFailure),
  };
}
