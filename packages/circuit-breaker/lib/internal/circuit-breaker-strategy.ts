import { CircuitBreakerConfigImpl, CircuitBreakerStrategy } from '../types';

export class CircuitBreakerStrategyFactory {
  static resolve(config: CircuitBreakerConfigImpl) {
    switch (config.strategy) {
      case CircuitBreakerStrategy.Volume:
        return new VolumeStrategy(config);
      case CircuitBreakerStrategy.Percentage:
        return new PercentageStrategy(config);
    }
  }
}

export abstract class BaseStrategy {
  constructor(protected readonly config: CircuitBreakerConfigImpl) {}
  abstract isThresholdExceeded(failure: number, success?: number): boolean;

  allowCanary(inFlight: number, lastFailure: number) {
    return this.config.halfOpenLimit >= inFlight || this.circuitStateExpired(lastFailure);
  }

  circuitStateExpired(lastFailure: number) {
    return Date.now() - this.config.interval > lastFailure;
  }
}

export class VolumeStrategy extends BaseStrategy {
  constructor(config: CircuitBreakerConfigImpl) {
    super(config);
  }

  isThresholdExceeded(failure: number): boolean {
    const minimumFailures = this.config.minimumFailures || 0;
    return failure >= minimumFailures && failure >= this.config.threshold;
  }
}

export class PercentageStrategy extends BaseStrategy {
  constructor(config: CircuitBreakerConfigImpl) {
    super(config);
  }

  isThresholdExceeded(failure: number, success?: number | undefined): boolean {
    const minimumFailures = this.config.minimumFailures || 0;
    return (
      failure >= minimumFailures && failure / (failure + (success || 0)) >= this.config.threshold
    );
  }
}
