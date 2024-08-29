import { ResilienceConfig } from '../types';

export abstract class AbstractTelemetryProvider {
  abstract forRoot(config: ResilienceConfig): void;

  abstract register(prefix: string, metricsSource: unknown): void;
}

export class NoopTelemetryProvider extends AbstractTelemetryProvider {
  forRoot(_: ResilienceConfig): void {
    // noop
    return;
  }

  register(_: string, __: unknown): void {
    // noop
    return;
  }
}
