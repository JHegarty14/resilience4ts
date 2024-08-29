import {
  Hedge,
  PRIMARY_SUCCESS,
  PRIMARY_FAILURE,
  HEDGE_SUCCESS,
  HEDGE_FAILURE,
} from '@forts/resilience4ts-all';
import { metrics } from '@opentelemetry/api';

export class HedgeMetrics {
  constructor(prefix: string, hedges: Hedge[]) {
    hedges.forEach((hedge) => {
      const name = hedge.getName();
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${PRIMARY_SUCCESS}`)
        .addCallback((result) => {
          result.observe(hedge.Metrics.getNumberOfPrimarySuccesses());
        });
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${PRIMARY_FAILURE}`)
        .addCallback((result) => {
          result.observe(hedge.Metrics.getNumberOfPrimaryFailures());
        });
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${HEDGE_SUCCESS}`)
        .addCallback((result) => {
          result.observe(hedge.Metrics.getNumberOfHedgeSuccesses());
        });
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${HEDGE_FAILURE}`)
        .addCallback((result) => {
          result.observe(hedge.Metrics.getNumberOfHedgeFailures());
        });
    });
  }
}
