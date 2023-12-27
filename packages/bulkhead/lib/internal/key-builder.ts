import { ResilienceKeyBuilder } from '@forts/resilience4ts-core';

export class KeyBuilder {
  static bulkheadRegistryKey() {
    return ResilienceKeyBuilder.build('r4t-bulkheads');
  }

  static bulkheadThreadPoolKey(threadPoolUid: string) {
    return ResilienceKeyBuilder.build(`r4t-bulkheadT-${threadPoolUid}`);
  }

  static bulkheadSemaphoreKey(name: string) {
    return ResilienceKeyBuilder.build(`r4t-bulkheadS-${name}`);
  }
}
