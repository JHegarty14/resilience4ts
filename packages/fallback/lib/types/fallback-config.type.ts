import { defaultPredicateBuilder, type Json, PredicateBuilder } from '@forts/resilience4ts-core';

export type FallbackConfig = {
  readonly shouldHandle?: PredicateBuilder;
  readonly fallbackAction: (...args: any[]) => Promise<any> | any;
};

export class FallbackConfigImpl<Action extends Json = Json> {
  shouldHandle: PredicateBuilder;
  fallbackAction: (...args: any[]) => Promise<Action> | Action;

  constructor(config: FallbackConfig) {
    this.shouldHandle = config.shouldHandle ?? defaultPredicateBuilder;

    this.fallbackAction = config.fallbackAction as (...args: any[]) => Promise<Action> | Action;
  }
}

export type FallbackAction<C extends FallbackConfig> = C['fallbackAction'] extends (
  ...args: any[]
) => infer R
  ? R
  : null;
