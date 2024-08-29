import { Timeout, SUCCESSFUL, FAILED, TIMEOUT } from '@forts/resilience4ts-all';
import { metrics } from '@opentelemetry/api';

export class TimeoutMetrics {
  constructor(prefix: string, timeouts: Timeout[]) {
    timeouts.forEach((timeout) => {
      const name = timeout.getName();
      metrics
        .getMeter(prefix)
        .createCounter(`${prefix}.${name}.${SUCCESSFUL}`)
        .add(timeout.Metrics.getNumberOfSuccessfulCalls());
      metrics
        .getMeter(prefix)
        .createCounter(`${prefix}.${name}.${FAILED}`)
        .add(timeout.Metrics.getNumberOfFailedCalls());
      metrics
        .getMeter(prefix)
        .createCounter(`${prefix}.${name}.${TIMEOUT}`)
        .add(timeout.Metrics.getNumberOfTimeouts());
    });
  }
}
