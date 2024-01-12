export type CircuitBreakerConfig = {
  readonly interval?: number;
  readonly minimumFailures?: number;
  readonly whitelist?: Error[];
  readonly circuitConnectionRetries?: number;
  readonly halfOpenLimit?: number;
} & (
  | {
      readonly strategy: CircuitBreakerStrategy.Volume;
      readonly threshold: number;
    }
  | {
      readonly strategy: CircuitBreakerStrategy.Percentage;
      readonly threshold: number;
    }
);

export enum CircuitBreakerStrategy {
  Volume = 'volume',
  Percentage = 'percentage',
}

export const DefaultCircuitBreakerConfig = {
  strategy: CircuitBreakerStrategy.Percentage,
  threshold: 0.5,
  interval: 1000 * 15,
  minimumFailures: 3,
  whitelist: [],
  circuitConnectionRetries: 3,
  halfOpenLimit: 3,
};

export class CircuitBreakerConfigImpl {
  constructor(private readonly config: CircuitBreakerConfig) {}

  get strategy() {
    return this.config.strategy;
  }

  get threshold() {
    return this.config.threshold;
  }

  get interval() {
    return this.config.interval ?? DefaultCircuitBreakerConfig.interval;
  }

  get minimumFailures() {
    return this.config.minimumFailures ?? DefaultCircuitBreakerConfig.minimumFailures;
  }

  get whitelist() {
    return this.config.whitelist ?? DefaultCircuitBreakerConfig.whitelist;
  }

  get circuitConnectionRetries() {
    return (
      this.config.circuitConnectionRetries ?? DefaultCircuitBreakerConfig.circuitConnectionRetries
    );
  }

  get halfOpenLimit() {
    return this.config.halfOpenLimit ?? DefaultCircuitBreakerConfig.halfOpenLimit;
  }
}
