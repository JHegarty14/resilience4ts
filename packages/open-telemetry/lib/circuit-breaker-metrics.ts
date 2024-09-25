import {
  CircuitBreaker,
  FAILED,
  NOT_PERMITTED,
  SUCCESSFUL,
  FAILURE_RATE,
  SLOW,
  SLOW_SUCCESSFUL,
  SLOW_FAILED,
  SLOW_RATE,
} from '@forts/resilience4ts-all';
import { metrics } from '@opentelemetry/api';

export class CircuitBreakerMetrics {
  constructor(prefix: string, circuitBreakers: CircuitBreaker[]) {
    circuitBreakers.forEach((circuitBreaker) => {
      const name = circuitBreaker.getName();
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${SUCCESSFUL}`)
        .addCallback((result) => {
          result.observe(circuitBreaker.Metrics.getNumberOfSuccessfulCalls());
        });
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${FAILED}`)
        .addCallback((result) => {
          result.observe(circuitBreaker.Metrics.getNumberOfFailedCalls());
        });
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${NOT_PERMITTED}`)
        .addCallback((result) => {
          result.observe(circuitBreaker.Metrics.getNumberOfNotPermittedCalls());
        });
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${FAILURE_RATE}`)
        .addCallback((result) => {
          result.observe(circuitBreaker.Metrics.getFailureRate());
        });
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${SLOW}`)
        .addCallback((result) => {
          result.observe(circuitBreaker.Metrics.getNumberOfSlowCalls());
        });
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${SLOW_SUCCESSFUL}`)
        .addCallback((result) => {
          result.observe(circuitBreaker.Metrics.getNumberOfSlowSuccessfulCalls());
        });
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${SLOW_FAILED}`)
        .addCallback((result) => {
          result.observe(circuitBreaker.Metrics.getNumberOfSlowFailedCalls());
        });
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${SLOW_RATE}`)
        .addCallback((result) => {
          result.observe(circuitBreaker.Metrics.getSlowCallRate());
        });
    });
  }
}
