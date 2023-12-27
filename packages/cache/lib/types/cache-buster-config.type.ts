import { PredicateBuilder } from '@forts/resilience4ts-core';

export type CacheBusterConfig = {
  readonly invalidatesKeys: (...args: any[]) => string | string[];
  readonly invalidateOnException?: boolean;
  readonly shouldInvalidate?: PredicateBuilder;
};

export class CacheBusterConfigImpl implements CacheBusterConfig {
  readonly invalidatesKeys: (...args: any[]) => string | string[];
  readonly invalidateOnException: boolean;
  readonly shouldInvalidate: PredicateBuilder;

  constructor(config: CacheBusterConfig) {
    this.invalidatesKeys = config.invalidatesKeys;
    this.invalidateOnException = config.invalidateOnException ?? false;
    if (config.shouldInvalidate !== undefined) {
      this.shouldInvalidate = config.shouldInvalidate;
    } else {
      const predicate = config.invalidateOnException
        ? new PredicateBuilder()
        : new PredicateBuilder().isnot((x: unknown) => x instanceof Error);
      this.shouldInvalidate = predicate;
    }
  }
}
