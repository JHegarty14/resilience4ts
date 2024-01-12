import { Guard } from '../util';

export enum ConfigFileExtensions {
  Json = 'json',
  Toml = 'toml',
}

export type ResilienceConfig = {
  resilience: ResilienceCoreConfig;
  redis: ResilienceRedisConfig;
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

export type RetentionWindow = `${number}${'s' | 'm' | 'h' | 'd'}`;

export class ResilienceConfigImpl implements ResilienceConfig {
  resilience: ResilienceCoreConfig;
  redis: ResilienceRedisConfig;

  constructor(config: ResilienceConfig) {
    Guard.throwIfNullOrEmpty(config, 'config');
    this.resilience = this.parseCoreConfig(config.resilience);
    this.redis = this.parseRedisConfig(config.redis);
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
}
