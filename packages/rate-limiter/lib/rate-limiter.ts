import { ResilienceProviderService } from '@forts/resilience4ts-core';
import type { ResilienceDecorator } from '@forts/resilience4ts-core';
import { RateLimitViolationException } from './exceptions';
import { BaseRateLimiterStrategy, RateLimiterStrategyFactory } from './internal';
import { type RateLimiterConfig, RateLimiterConfigImpl } from './types';

/**
 * RateLimiter Decorator
 * ---------------------
 *
 * The RateLimiter decorator is used to enforce a rate limit on the decorated method. The rate
 * limit can be enforced for the decorated method across all instances of the application, or
 * by a configurable request identifier. If the rate limit is exceeded, the decorated method
 * will throw a {@link RateLimitViolationException}.
 */
export class RateLimiter implements ResilienceDecorator {
  private static core: ResilienceProviderService;
  private initialized: Promise<void>;
  private strategy!: BaseRateLimiterStrategy;

  private constructor(
    private readonly name: string,
    private readonly config: RateLimiterConfigImpl,
    private readonly tags: Map<string, string>,
  ) {
    RateLimiter.core = ResilienceProviderService.forRoot();
    this.initialized = this.init();
  }

  /**
   * Creates a new RateLimiter decorator.
   */
  static of(name: string, config: RateLimiterConfig): RateLimiter;
  static of(name: string, config: RateLimiterConfig, tags?: Map<string, string>): RateLimiter {
    return new RateLimiter(name, new RateLimiterConfigImpl(config), tags || new Map());
  }

  private async init(): Promise<void> {
    await RateLimiter.core.start();

    this.strategy = RateLimiterStrategyFactory.resolve(RateLimiter.core.cache, this.config);
  }

  /**
   * Decorates the given function with a rate limiter.
   */
  on<Args, Return>(fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;

      RateLimiter.core.emitter.emit('r4t-rate-limiter-request', this.name, this.tags);

      const allowed = await this.strategy.guard(
        this.name,
        this.config.requestIdentifier?.(...args),
      );

      if (!allowed) {
        RateLimiter.core.emitter.emit('r4t-rate-limiter-rejected', this.name, this.tags);
        throw new RateLimitViolationException();
      }

      return await fn(...args);
    };
  }

  /**
   * Decorates the given function with a rate limiter. This varient of the
   * decorator is useful when the decorated function is a method on a class.
   */
  onBound<Args, Return>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    self: unknown,
  ) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;

      RateLimiter.core.emitter.emit('r4t-rate-limiter-request', this.name, this.tags);

      const allowed = await this.strategy.guard(
        this.name,
        this.config.requestIdentifier?.(...args),
      );

      if (!allowed) {
        RateLimiter.core.emitter.emit('r4t-rate-limiter-rejected', this.name, this.tags);
        throw new RateLimitViolationException();
      }

      return await fn.call(self, ...args);
    };
  }

  getName() {
    return this.name;
  }
}
