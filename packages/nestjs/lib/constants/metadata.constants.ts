export const RESILIENCE_PIPELINE = '__r4t:pipeline__';
export const RESILIENCE_CONSUMER = '__r4t:consumer__';
export const RESILIENCE_DISCOVERABLE = '__r4t:discoverable__';
export const RESILIENCE_BULKHEAD = '__r4t:bulkhead__';
export const RESILIENCE_METRICS = '__r4t:metrics__';
export const RESILIENCE_CACHE = '__r4t:cache__';
export const RESILIENCE_CIRCUIT_BREAKER = '__r4t:circuit-breaker__';
export const RESILIENCE_FALLBACK = '__r4t:fallback__';
export const RESILIENCE_HEDGE = '__r4t:hedge__';
export const RESILIENCE_LOCK = '__r4t:lock__';
export const RESILIENCE_QUEUE = '__r4t:queue__';
export const RESILIENCE_RATE_LIMITER = '__r4t:rate-limiter__';
export const RESILIENCE_RETRY = '__r4t:retry__';
export const RESILIENCE_TIMEOUT = '__r4t:timeout__';
export const RESILIENCE_TARGET = '__r4t:target__';

export const RESILIENCE_COMPONENTS = [
  RESILIENCE_PIPELINE,
  RESILIENCE_CONSUMER,
  RESILIENCE_DISCOVERABLE,
  RESILIENCE_BULKHEAD,
  RESILIENCE_CACHE,
  RESILIENCE_CIRCUIT_BREAKER,
  RESILIENCE_FALLBACK,
  RESILIENCE_HEDGE,
  RESILIENCE_LOCK,
  RESILIENCE_QUEUE,
  RESILIENCE_RATE_LIMITER,
  RESILIENCE_RETRY,
  RESILIENCE_TIMEOUT,
] as const;

export type ResilienceComponent = (typeof RESILIENCE_COMPONENTS)[number];
