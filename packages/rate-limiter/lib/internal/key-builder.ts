import { ResilienceKeyBuilder } from '@forts/resilience4ts-core';

export class KeyBuilder implements ResilienceKeyBuilder {
  static rateLimiterRegistryKey(...parts: string[]): string {
    return ResilienceKeyBuilder.build('rate-limiter', ...parts);
  }
}
