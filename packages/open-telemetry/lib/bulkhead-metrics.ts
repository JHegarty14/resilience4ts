import {
  Bulkhead,
  AVAILABLE_CONCURRENT_CALLS,
  MAX_ALLOWED_CONCURRENT_CALLS,
} from '@forts/resilience4ts-all';
import { metrics } from '@opentelemetry/api';

export class BulkheadMetrics {
  constructor(prefix: string, bulkheads: Bulkhead[]) {
    bulkheads.forEach((bulkhead) => {
      const name = bulkhead.getName();
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${AVAILABLE_CONCURRENT_CALLS}`)
        .addCallback((result) => {
          result.observe(bulkhead.Metrics.getAvailableConcurrentCalls());
        });
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${MAX_ALLOWED_CONCURRENT_CALLS}`)
        .addCallback((result) => {
          result.observe(bulkhead.Metrics.getMaxAllowedConcurrentCalls());
        });
    });
  }
}
