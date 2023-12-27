import { ResilienceKeyBuilder } from '@forts/resilience4ts-core';

export class KeyBuilder {
  static lockRegistryKey() {
    return ResilienceKeyBuilder.build('locks');
  }

  static lockKey(uniqueId: string) {
    return ResilienceKeyBuilder.build('lock', uniqueId);
  }
}
