import { DefaultMetricsConfig } from '../metrics';
import { Guard } from '../util';

export enum ConfigFileExtensions {
  Json = 'json',
  Toml = 'toml',
}

export type ResilienceConfig = {
  resilience: ResilienceCoreConfig;
  redis: ResilienceRedisConfig;
  scheduler: ResilienceSchedulerConfig;
  metrics?: ResilienceMetricsConfig;
};

export type ResilienceCoreConfig = {
  serviceName: string;
  serviceVersion?: string;
  delimiter?: string;
  collectResourceUsage?: boolean;
  observationInterval?: number;
  maxUtilization?: number;
  maxSafeUtilization?: number;
  maxCpuUtilization?: number;
  maxSafeCpuUtilization?: number;
};

export type ResilienceRedisConfig = {
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
  redisUser?: string;
  redisPrefix?: string;
  maxConnectionAttempts?: number;
  maxBackoff?: number;
  maxIncrBackoff?: number;
  rejectUnauthorized?: boolean;
  useTls?: boolean;
};

export type ResilienceSchedulerConfig = {
  defaultInterval: number;
  recoveryInterval: number;
  runConsumer: boolean;
  consumer?: {
    maxErrors: number;
    startBackoffAt: number;
  };
};

export type ResilienceMetricsConfig = {
  captureInterval: number;
  exposeMetricsDashboard?: boolean;
  minimumNumberOfCalls: number;
  slowCallDurationThreshold: number;
  dataRetentionPolicy: {
    metricsBucketWindow: MetricsBucketWindow;
    retentionWindow: RetentionWindow;
  };
};

export type MetricsBucketWindow = `${number}${'ms' | 's' | 'm' | 'h'}`;
export type RetentionWindow = `${number}${'s' | 'm' | 'h' | 'd'}`;

export class ResilienceConfigImpl implements ResilienceConfig {
  resilience: ResilienceCoreConfig;
  redis: ResilienceRedisConfig;
  scheduler: ResilienceSchedulerConfig;
  metrics?: ResilienceMetricsConfig;

  constructor(config: ResilienceConfig) {
    Guard.throwIfNullOrEmpty(config, 'config');
    this.resilience = this.parseCoreConfig(config.resilience);
    this.redis = this.parseRedisConfig(config.redis);
    this.scheduler = this.parseSchedulerConfig(config.scheduler);
    this.metrics = this.parseMetricsConfig(config.metrics);
  }

  private parseCoreConfig(cfg: ResilienceCoreConfig) {
    Guard.throwIfNullOrEmpty(cfg, 'cfg');
    Guard.throwIfNullOrEmpty(cfg.serviceName, 'cfg.serviceName');
    Guard.throwIfExistsAndNotString(cfg.delimiter, 'cfg.delimiter');
    Guard.throwIfExistsAndNotBoolean(cfg.collectResourceUsage, 'cfg.collectResourceUsage');
    return cfg;
  }

  private parseRedisConfig(cfg: ResilienceRedisConfig) {
    Guard.throwIfNullOrEmpty(cfg, 'cfg');
    Guard.throwIfNullOrEmpty(cfg.redisHost, 'cfg.redisHost');
    Guard.throwIfExistsAndNotNumber(cfg.redisPort, 'cfg.redisPort');
    Guard.throwIfExistsAndNotString(cfg.redisPassword, 'cfg.redisPassword');
    Guard.throwIfExistsAndNotString(cfg.redisUser, 'cfg.redisUser');
    Guard.throwIfExistsAndNotString(cfg.redisPrefix, 'cfg.redisPrefix');
    Guard.throwIfExistsAndNotNumber(cfg.maxConnectionAttempts, 'cfg.maxConnectionAttempts');
    Guard.throwIfExistsAndNotNumber(cfg.maxBackoff, 'cfg.maxBackoff');
    Guard.throwIfExistsAndNotNumber(cfg.maxIncrBackoff, 'cfg.maxIncrBackoff');
    return cfg;
  }

  private parseSchedulerConfig(cfg: ResilienceSchedulerConfig) {
    Guard.throwIfNullOrEmpty(cfg, 'cfg');
    Guard.throwIfNotPositive(cfg.defaultInterval, 'cfg.defaultInterval');
    Guard.throwIfNotPositive(cfg.recoveryInterval, 'cfg.recoveryInterval');
    Guard.throwIfExistsAndNotBoolean(cfg.runConsumer, 'cfg.runConsumer');
    if (cfg.consumer) {
      Guard.throwIfExistsAndNotNumber(cfg.consumer.maxErrors, 'cfg.consumer.maxErrors');
      Guard.throwIfNotPositive(cfg.consumer.startBackoffAt, 'cfg.consumer.startBackoffAt');
    }
    return cfg;
  }

  private parseMetricsConfig(cfg?: ResilienceMetricsConfig) {
    if (!cfg) {
      return DefaultMetricsConfig;
    }

    Guard.throwIfNullOrEmpty(cfg, 'cfg');
    Guard.throwIfNotPositive(cfg.captureInterval, 'cfg.captureInterval');
    Guard.throwIfExistsAndNotBoolean(cfg.exposeMetricsDashboard, 'cfg.exposeMetricsDashboard');
    Guard.throwIfExistsAndNotNumber(cfg.minimumNumberOfCalls, 'cfg.minimumNumberOfCalls');
    Guard.throwIfNotPositive(cfg.slowCallDurationThreshold, 'cfg.slowCallDurationThreshold');
    if (cfg.dataRetentionPolicy) {
      Guard.throwIfExistsAndNotString(
        cfg.dataRetentionPolicy.metricsBucketWindow,
        'cfg.dataRetentionPolicy.metricsBucketWindow'
      );
      Guard.throwIfExistsAndNotString(
        cfg.dataRetentionPolicy.retentionWindow,
        'cfg.dataRetentionPolicy.retentionWindow'
      );
    }
    return cfg;
  }
}
