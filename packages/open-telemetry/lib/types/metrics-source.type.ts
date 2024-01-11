import { Bulkhead, CircuitBreaker, Hedge, RateLimiter, Timeout } from '@forts/resilience4ts-all';
import { RetryMetrics } from '../retry-metrics';

export type BulkheadPrefix = 'bulkhead';
export type CachePrefix = 'cache';
export type CircuitBreakerPrefix = 'circuit-breaker';
export type ConcurrentLockPrefix = 'concurrent-lock';
export type ConcurrentQueuePrefix = 'concurrent-queue';
export type FallbackPrefix = 'fallback';
export type HedgePrefix = 'hedge';
export type RateLimiterPrefix = 'rate-limiter';
export type RetryPrefix = 'retry';
export type TimeoutPrefix = 'timeout';

export type ResiliencePrefix =
  | BulkheadPrefix
  // | CachePrefix
  | CircuitBreakerPrefix
  // | ConcurrentLockPrefix
  // | ConcurrentQueuePrefix
  // | FallbackPrefix
  | HedgePrefix
  | RateLimiterPrefix
  | RetryPrefix
  | TimeoutPrefix;

export type MetricsImpl<K extends ResiliencePrefix> = K extends 'bulkhead'
  ? Bulkhead
  : K extends 'circuit-breaker'
    ? CircuitBreaker
    : K extends 'hedge'
      ? Hedge
      : K extends 'rate-limiter'
        ? RateLimiter
        : K extends 'retry'
          ? RetryMetrics
          : K extends 'timeout'
            ? Timeout
            : never;
