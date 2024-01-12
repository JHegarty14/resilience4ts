import { PredicateBuilder, defaultPredicateBuilder } from '@forts/resilience4ts-core';

export type HedgeConfig = {
  readonly shouldHandle?: PredicateBuilder;
  readonly delay: number;
  readonly maxHedgedAttempts?: number;
  // readonly durationType?: HedgeDurationType;
  readonly actionGenerator?:
    | (<Args, Ret>(...args: Args extends unknown[] ? Args : [Args]) => Promise<Ret>)
    | null;
  readonly exceptOnHedge?: boolean;
};

export enum HedgeDurationType {
  Preconfigured,
  AveragePlus,
}

export enum HedgeStrategy {
  Latency = 'Latency',
  Parallel = 'Parallel',
}

export class HedgeConfigImpl {
  shouldHandle: PredicateBuilder;
  delay: number;
  maxHedgedAttempts: number;
  // durationType: HedgeDurationType;
  hedgeStrategy: HedgeStrategy;
  exceptOnHedge: boolean;
  actionGenerator:
    | (<Args, Ret>(...args: Args extends unknown[] ? Args : [Args]) => Promise<Ret>)
    | null;

  constructor(config: HedgeConfig) {
    this.shouldHandle = config.shouldHandle ?? defaultPredicateBuilder;
    this.delay = config.delay ?? 2000;
    this.maxHedgedAttempts = config.maxHedgedAttempts ?? 1;
    // this.durationType = config.durationType ?? HedgeDurationType.Preconfigured;
    this.actionGenerator = config.actionGenerator || null;
    this.hedgeStrategy = this.resolveStrategy(config.delay);
    this.exceptOnHedge = config.exceptOnHedge ?? false;
  }

  private resolveStrategy(delay: number): HedgeStrategy {
    if (delay === 0) {
      return HedgeStrategy.Parallel;
    }

    if (delay > 0) {
      return HedgeStrategy.Latency;
    }

    throw new Error('Invalid delay');
  }

  withShouldHandle(predicateBuilder: PredicateBuilder) {
    this.shouldHandle = predicateBuilder;
    return this;
  }

  withDelay(delay: number) {
    this.delay = delay;
    return this;
  }

  withMaxHedgedAttempts(maxHedgedAttempts: number) {
    this.maxHedgedAttempts = maxHedgedAttempts;
    return this;
  }

  withActionGenerator(
    actionGenerator: <Args, Ret>(...args: Args extends unknown[] ? Args : [Args]) => Promise<Ret>,
  ) {
    this.actionGenerator = actionGenerator;
    return this;
  }
}
