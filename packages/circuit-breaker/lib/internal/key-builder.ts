import { ResilienceKeyBuilder } from '@forts/resilience4ts-core';

export class KeyBuilder {
  static circuitRegistryKey() {
    return `r4t-circuits`;
  }

  static timeseriesKey(name: string) {
    return ResilienceKeyBuilder.build(`${name}`, 'tsbucket');
  }
}
