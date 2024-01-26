export type RateLimiterConfig = {
  permitLimit?: number;
  queueLimit?: number;
  window?: number;
} & (
  | { readonly scope: RateLimiterScope.Distributed }
  | { readonly scope: RateLimiterScope.Instance; requestIdentifier: (...args: any[]) => string }
);

export class RateLimiterConfigImpl {
  permitLimit: number;
  queueLimit: number;
  window: number;
  scope: RateLimiterScope;
  requestIdentifier?: (...args: any[]) => string;

  constructor(config: RateLimiterConfig) {
    this.permitLimit = config.permitLimit ?? 1000;
    this.queueLimit = config.queueLimit ?? 0;
    this.window = config.window ?? 1000 * 60;
    this.scope = config.scope;
    this.requestIdentifier =
      config.scope === RateLimiterScope.Instance ? config.requestIdentifier : undefined;
  }
}

export enum RateLimiterScope {
  Distributed = 'distributed',
  Instance = 'instance',
}
