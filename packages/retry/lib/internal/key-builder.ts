import { ResilienceKeyBuilder } from '@forts/resilience4ts-core';

export class KeyBuilder implements ResilienceKeyBuilder {
  static retryEventKey(...parts: string[]): string {
    return ResilienceKeyBuilder.build('retry-event', ...parts);
  }
}
