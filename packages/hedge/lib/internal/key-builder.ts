import { ResilienceKeyBuilder } from '@forts/resilience4ts-core';

export class KeyBuilder implements ResilienceKeyBuilder {
  static hedgeKey(name: string) {
    return ResilienceKeyBuilder.build('hedge', name);
  }
}
