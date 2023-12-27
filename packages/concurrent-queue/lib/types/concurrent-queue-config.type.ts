export type ConcurrentQueueConfig = {
  withKey: string | ((...args: any[]) => string);
  maxAttempts?: number;
  backoff?: number;
};

export class ConcurrentQueueConfigImpl {
  withKey: string | ((...args: any[]) => string);
  maxAttempts: number;
  backoff: number;

  constructor(config: ConcurrentQueueConfig) {
    this.withKey = config.withKey;
    this.maxAttempts = config.maxAttempts ?? 1000;
    this.backoff = config.backoff ?? 0.01;
  }
}
