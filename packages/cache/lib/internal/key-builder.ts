import { ResilienceKeyBuilder } from '@forts/resilience4ts-core';

export class KeyBuilder {
  static cacheKey(key: string) {
    return ResilienceKeyBuilder.build(`cache-${key}`);
  }

  static cacheMissesKey(name: string) {
    return ResilienceKeyBuilder.build(`cache-${name}-misses`);
  }

  static cacheHitsKey(name: string) {
    return ResilienceKeyBuilder.build(`cache-${name}-hits`);
  }
}
