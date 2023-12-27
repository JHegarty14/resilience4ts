import {
  ResiliencePipe,
  SUCCESSFUL,
  FAILED,
  SLOW_SUCCESSFUL,
  SLOW_FAILED,
  TIMEOUT,
  NOT_PERMITTED,
  OPERATION_CANCELLED,
} from '@forts/resilience4ts-all';
import { metrics } from '@opentelemetry/api';

export class ResiliencePipeMetrics {
  constructor(prefix: string, pipes: ResiliencePipe<any, any>[]) {
    pipes.forEach((pipe) => {
      const name = pipe.getName();
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${SUCCESSFUL}`)
        .addCallback((result) => {
          result.observe(pipe.Metrics.getNumberOfSuccessfulCalls());
        });
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${FAILED}`)
        .addCallback((result) => {
          result.observe(pipe.Metrics.getNumberOfFailedCalls());
        });
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${SLOW_SUCCESSFUL}`)
        .addCallback((result) => {
          result.observe(pipe.Metrics.getNumberOfSlowSuccessfulCalls());
        });
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${SLOW_FAILED}`)
        .addCallback((result) => {
          result.observe(pipe.Metrics.getNumberOfSlowFailedCalls());
        });
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${TIMEOUT}`)
        .addCallback((result) => {
          result.observe(pipe.Metrics.getNumberOfTimedOutCalls());
        });
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${NOT_PERMITTED}`)
        .addCallback((result) => {
          result.observe(pipe.Metrics.getNumberOfNotPermittedCalls());
        });
      metrics
        .getMeter(prefix)
        .createObservableGauge(`${prefix}.${name}.${OPERATION_CANCELLED}`)
        .addCallback((result) => {
          result.observe(pipe.Metrics.getNumberOfCancelledCalls());
        });
    });
  }
}
