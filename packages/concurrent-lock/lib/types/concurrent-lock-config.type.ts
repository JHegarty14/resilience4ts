export type ConcurrentLockConfig = {
  withKey: string | ((...args: any[]) => string);
  duration?: number;
  driftFactor?: number;
  refreshInterval?: number;
  extensible?: boolean;
};

export class ConcurrentLockConfigImpl {
  withKey: string | ((...args: any[]) => string);
  duration: number;
  driftFactor: number;
  refreshInterval: number;
  extensible: boolean;

  constructor(config: ConcurrentLockConfig) {
    this.withKey = config.withKey;
    this.duration = config.duration ?? 1000;
    this.driftFactor = config.driftFactor ?? 0.01;
    this.refreshInterval = config.refreshInterval ?? 100;
    this.extensible = config.extensible ?? true;
  }
}
