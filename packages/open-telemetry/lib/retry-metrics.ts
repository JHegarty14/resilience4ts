import {
  Retry,
  SUCCESSFUL_CALLS_WITHOUT_RETRY,
  FAILED_CALLS_WITH_RETRY,
  SUCCESSFUL_CALLS_WITH_RETRY,
  FAILED_CALLS_WITHOUT_RETRY,
} from '@forts/resilience4ts-all';
import { metrics } from '@opentelemetry/api';
import { RetryPrefix } from './types/metrics-source.type';

export class RetryMetrics {
  constructor(prefix: RetryPrefix, retries: Retry[]) {
    retries.forEach((retry) => {
      const name = retry.getName();
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${SUCCESSFUL_CALLS_WITHOUT_RETRY}`)
        .addCallback((result) => {
          result.observe(retry.Metrics.getNumberOfSuccessfulCallsWithoutRetryAttempt());
        });
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${FAILED_CALLS_WITH_RETRY}`)
        .addCallback((result) => {
          result.observe(retry.Metrics.getNumberOfFailedCallsWithRetry());
        });
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${SUCCESSFUL_CALLS_WITH_RETRY}`)
        .addCallback((result) => {
          result.observe(retry.Metrics.getNumberOfSuccessfulCallsFromRetry());
        });
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${FAILED_CALLS_WITHOUT_RETRY}`)
        .addCallback((result) => {
          result.observe(retry.Metrics.getNumberOfFailedCallsWithoutRetry());
        });
    });
  }
}
