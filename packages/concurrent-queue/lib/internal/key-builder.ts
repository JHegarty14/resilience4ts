import { ResilienceKeyBuilder } from '@forts/resilience4ts-core';

export class KeyBuilder {
  static lockQueueRegistryKey() {
    return ResilienceKeyBuilder.build('lock-queues');
  }

  static lockQueueKey(uniqueId: string) {
    return ResilienceKeyBuilder.build('lock-queue', uniqueId);
  }
}
