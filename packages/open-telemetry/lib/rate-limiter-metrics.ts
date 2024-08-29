import { RateLimiter, AVAILABLE_PERMITS, WAITING_COUNT } from '@forts/resilience4ts-all';
import { metrics } from '@opentelemetry/api';

export class RateLimiterMetrics {
  constructor(prefix: string, rateLimiters: RateLimiter[]) {
    rateLimiters.forEach((rateLimiter) => {
      const name = rateLimiter.getName();
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${AVAILABLE_PERMITS}`)
        .addCallback((result) => {
          result.observe(rateLimiter.Metrics.getAvailablePermits());
        });
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${WAITING_COUNT}`)
        .addCallback((result) => {
          result.observe(rateLimiter.Metrics.getWaitingCount());
        });
    });
  }
}
