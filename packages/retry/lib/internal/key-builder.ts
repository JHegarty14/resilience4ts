import { ResilienceKeyBuilder } from '@forts/resilience4ts-core';

export class KeyBuilder implements ResilienceKeyBuilder {
  static retryRegistryKey(...parts: string[]) {
    return ResilienceKeyBuilder.build('retry-registry', ...parts);
  }

  static retryEventKey(...parts: string[]): string {
    return ResilienceKeyBuilder.build('retry-event', ...parts);
  }

  static timeseriesKey(name: string) {
    return ResilienceKeyBuilder.build('retry', name, 'tsbucket');
  }
}
