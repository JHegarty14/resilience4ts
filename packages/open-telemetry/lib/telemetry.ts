import { metrics } from '@opentelemetry/api';
import {
  ConsoleMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import {
  AbstractTelemetryProvider,
  assertUnreachable,
  type ResilienceConfig,
} from '@forts/resilience4ts-core';
import { MetricsImpl, ResiliencePrefix } from './types/metrics-source.type';
import { BulkheadMetrics } from './bulkhead-metrics';
import { CircuitBreakerMetrics } from './circuit-breaker-metrics';
import { HedgeMetrics } from './hedge-metrics';
import { RateLimiterMetrics } from './rate-limiter-metrics';
import { RetryMetrics } from './retry-metrics';
import { TimeoutMetrics } from './timeout-metrics';
import {
  Bulkhead,
  CircuitBreaker,
  Hedge,
  RateLimiter,
  Retry,
  Timeout,
} from '@forts/resilience4ts-all';

/**
 * OpenTelemetry Provider
 * ----------------------
 *
 * The OpenTelemetry provider is used to capture metrics from the resilience4ts decorators. It
 * uses the OpenTelemetry SDK to capture metrics and export them to the console.
 */
export class OpenTelemetryProvider extends AbstractTelemetryProvider {
  private static instance: OpenTelemetryProvider;
  forRoot(config: ResilienceConfig) {
    if (OpenTelemetryProvider.instance) {
      return OpenTelemetryProvider.instance;
    }

    OpenTelemetryProvider.instance = new OpenTelemetryProvider();

    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: config.resilience.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: config.resilience.serviceVersion,
      }),
    );

    const metricReader = new PeriodicExportingMetricReader({
      exporter: new ConsoleMetricExporter(),

      // Default is 60000ms (60 seconds)
      exportIntervalMillis: config.metrics?.captureInterval ?? 60000,
    });

    const myServiceMeterProvider = new MeterProvider({
      resource: resource,
    });

    myServiceMeterProvider.addMetricReader(metricReader);

    // Set this MeterProvider to be global to the app being instrumented.
    metrics.setGlobalMeterProvider(myServiceMeterProvider);

    return OpenTelemetryProvider.instance;
  }

  register<T extends ResiliencePrefix>(prefix: T, metricSource: MetricsImpl<T>[]) {
    switch (prefix) {
      case 'bulkhead':
        new BulkheadMetrics(prefix, metricSource as Bulkhead[]);
        break;
      case 'circuit-breaker':
        new CircuitBreakerMetrics(prefix, metricSource as CircuitBreaker[]);
        break;
      case 'hedge':
        new HedgeMetrics(prefix, metricSource as Hedge[]);
        break;
      case 'rate-limiter':
        new RateLimiterMetrics(prefix, metricSource as RateLimiter[]);
        break;
      case 'retry':
        new RetryMetrics(prefix, metricSource as unknown as Retry[]);
        break;
      case 'timeout':
        new TimeoutMetrics(prefix, metricSource as Timeout[]);
        break;
      default:
        assertUnreachable(prefix);
    }
  }
}
