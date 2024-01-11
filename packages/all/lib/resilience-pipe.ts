import { Bulkhead } from '@forts/resilience4ts-bulkhead';
import { Cache, CacheBuster, RequestScopedCache } from '@forts/resilience4ts-cache';
import { CircuitBreaker } from '@forts/resilience4ts-circuit-breaker';
import { ConcurrentLock } from '@forts/resilience4ts-concurrent-lock';
import { ConcurrentQueue } from '@forts/resilience4ts-concurrent-queue';
import {
  DefaultMetricsConfig,
  InvalidArgumentException,
  ResilienceDecorator,
  ResilienceProviderService,
  Stopwatch,
} from '@forts/resilience4ts-core';
import type { Json } from '@forts/resilience4ts-core';
import { Fallback } from '@forts/resilience4ts-fallback';
import { Hedge } from '@forts/resilience4ts-hedge';
import { RateLimiter } from '@forts/resilience4ts-rate-limiter';
import { Retry } from '@forts/resilience4ts-retry';
import { Timeout } from '@forts/resilience4ts-timeout';
import { ResiliencePipeMetrics } from './internal';

/**
 * ResiliencePipe Decorator
 * ------------------------
 *
 * The ResiliencePipe decorator is used to create a pipeline of resilience decorators
 * that will be applied to the decorated method. The decorators will be applied in the
 * order they are added to the pipeline.
 *
 * The ResiliencePipe decorator is useful for creating reusable pipelines of resilience
 * decorators that can be applied to multiple methods.
 */
export class ResiliencePipe<Args, Return> {
  private static core: ResilienceProviderService;
  private constructor(
    private readonly name: string,
    private fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
  ) {
    ResiliencePipe.core = ResilienceProviderService.forRoot();
    this.Metrics = new ResiliencePipeMetrics(DefaultMetricsConfig);
  }

  /**
   * Creates a new ResiliencePipe decorator.
   */
  static of<Args, Return>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
  ): ResiliencePipe<Args, Return>;
  static of<Args, Return>(
    name: string,
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
  ): ResiliencePipe<Args, Return>;
  static of<Args, Return>(
    nameOrFn: string | ((...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>),
    fn?: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
  ): ResiliencePipe<Args, Return> {
    if (typeof nameOrFn === 'string' && fn) {
      return new ResiliencePipe<Args, Return>(nameOrFn, fn);
    }

    if (typeof nameOrFn === 'function') {
      return new ResiliencePipe<Args, Return>(nameOrFn.name, nameOrFn);
    }

    throw new InvalidArgumentException('ResiliencePipe.of()');
  }

  /**
   * Add a Bulkhead to the pipeline.
   */
  withBulkhead(bulkhead: Bulkhead): ResiliencePipe<Args, Return> {
    this.fn = bulkhead.on(this.fn);
    return this;
  }

  /**
   * Add a Cache to the pipeline.
   */
  withCache(cache: Cache): ResiliencePipe<Args, Return> {
    this.fn = cache.on(this.fn);
    return this;
  }

  /**
   * Add a CacheBuster to the pipeline.
   */
  withCacheBuster(cacheBuster: CacheBuster): ResiliencePipe<Args, Return> {
    this.fn = cacheBuster.on(this.fn);
    return this;
  }

  /**
   * Add a CircuitBreaker to the pipeline.
   */
  withCircuitBreaker(circuitBreaker: CircuitBreaker): ResiliencePipe<Args, Return> {
    this.fn = circuitBreaker.on(this.fn);
    return this;
  }

  /**
   * Add a Fallback to the pipeline.
   */
  withFallback<Action extends Json>(fallback: Fallback<Action>): ResiliencePipe<Args, Return> {
    this.fn = fallback.on(this.fn);
    return this;
  }

  /**
   * Add a Hedge to the pipeline.
   */
  withHedge(hedge: Hedge): ResiliencePipe<Args, Return> {
    this.fn = hedge.on(this.fn);
    return this;
  }

  /**
   * Add a ConcurrentLock to the pipeline.
   */
  withLock(lock: ConcurrentLock): ResiliencePipe<Args, Return> {
    this.fn = lock.on(this.fn);
    return this;
  }

  /**
   * Add a ConcurrentQueue to the pipeline.
   */
  withQueue(queue: ConcurrentQueue): ResiliencePipe<Args, Return> {
    this.fn = queue.on(this.fn);
    return this;
  }

  /**
   * Add a RateLimiter to the pipeline.
   */
  withRateLimiter(rateLimiter: RateLimiter): ResiliencePipe<Args, Return> {
    this.fn = rateLimiter.on(this.fn);
    return this;
  }

  /**
   * Add a RequestScopedCache to the pipeline.
   */
  withRequestScopedCache(cache: RequestScopedCache): ResiliencePipe<Args, Return> {
    this.fn = cache.on(this.fn);
    return this;
  }

  /**
   * Add a Retry to the pipeline.
   */
  withRetry(retry: Retry): ResiliencePipe<Args, Return> {
    this.fn = retry.on(this.fn);
    return this;
  }

  /**
   * Add a Timeout to the pipeline.
   */
  withTimeout(timeout: Timeout): ResiliencePipe<Args, Return> {
    this.fn = timeout.on(this.fn);
    return this;
  }

  /**
   * Add any ResilienceDecorator or list of ResilienceDecorators to the pipeline.
   */
  with(...providers: ResilienceDecorator[]): ResiliencePipe<Args, Return> {
    for (const provider of providers) {
      this.fn = provider.on(this.fn);
    }
    return this;
  }

  async execute(...args: Args extends unknown[] ? Args : [Args]): Promise<Return> {
    const stopwatch = Stopwatch.start();
    try {
      const result = await this.fn(...args);

      this.Metrics.handlePipelineResult(result, stopwatch.getElapsedMilliseconds());

      return result;
    } catch (err: unknown) {
      this.Metrics.onCallFailure(stopwatch.getElapsedMilliseconds());
      throw err;
    }
  }

  async executeBound(
    self: unknown,
    ...args: Args extends unknown[] ? Args : [Args]
  ): Promise<Return> {
    const stopwatch = Stopwatch.start();
    try {
      const result = await this.fn.call(self, ...args);

      this.Metrics.handlePipelineResult(result, stopwatch.getElapsedMilliseconds());

      return result;
    } catch (err: unknown) {
      this.Metrics.onCallFailure(stopwatch.getElapsedMilliseconds());
      throw err;
    }
  }

  getName() {
    return this.name;
  }

  readonly Metrics: ResiliencePipeMetrics;
}

/**
 * ResiliencePipeBuilder
 * ---------------------
 *
 * The ResiliencePipeBuilder is used to create a pipeline of resilience decorators
 * that will be applied to the decorated method. The decorators will be applied in the
 * order they are added to the pipeline.
 *
 * The ResiliencePipeBuilder is useful for creating reusable pipelines of resilience
 * decorators that can be applied to multiple methods.
 */
export class ResiliencePipeBuilder {
  private readonly decorators: ResilienceDecorator[] = [];

  /**
   * Add a Bulkhead to the pipeline.
   */
  withBulkhead(bulkhead: Bulkhead): ResiliencePipeBuilder {
    this.decorators.push(bulkhead);
    return this;
  }

  /**
   * Add a Cache to the pipeline.
   */
  withCache(cache: Cache): ResiliencePipeBuilder {
    this.decorators.push(cache);
    return this;
  }

  /**
   * Add a CacheBuster to the pipeline.
   */
  withCacheBuster(cacheBuster: CacheBuster): ResiliencePipeBuilder {
    this.decorators.push(cacheBuster);
    return this;
  }

  /**
   * Add a CircuitBreaker to the pipeline.
   */
  withCircuitBreaker(circuitBreaker: CircuitBreaker): ResiliencePipeBuilder {
    this.decorators.push(circuitBreaker);
    return this;
  }

  /**
   * Add a Fallback to the pipeline.
   */
  withFallback<Action extends Json>(fallback: Fallback<Action>): ResiliencePipeBuilder {
    this.decorators.push(fallback);
    return this;
  }

  /**
   * Add a Hedge to the pipeline.
   */
  withHedge(hedge: Hedge): ResiliencePipeBuilder {
    this.decorators.push(hedge);
    return this;
  }

  /**
   * Add a ConcurrentLock to the pipeline.
   */
  withLock(lock: ConcurrentLock): ResiliencePipeBuilder {
    this.decorators.push(lock);
    return this;
  }

  /**
   * Add a ConcurrentQueue to the pipeline.
   */
  withQueue(queue: ConcurrentQueue): ResiliencePipeBuilder {
    this.decorators.push(queue);
    return this;
  }

  /**
   * Add a RateLimiter to the pipeline.
   */
  withRateLimiter(rateLimiter: RateLimiter): ResiliencePipeBuilder {
    this.decorators.push(rateLimiter);
    return this;
  }

  /**
   * Add a RequestScopedCache to the pipeline.
   */
  withRequestScopedCache(cache: RequestScopedCache): ResiliencePipeBuilder {
    this.decorators.push(cache);
    return this;
  }

  /**
   * Add a Retry to the pipeline.
   */
  withRetry(retry: Retry): ResiliencePipeBuilder {
    this.decorators.push(retry);
    return this;
  }

  /**
   * Add a Timeout to the pipeline.
   */
  withTimeout(timeout: Timeout): ResiliencePipeBuilder {
    this.decorators.push(timeout);
    return this;
  }

  /**
   * Add any ResilienceDecorator or list of ResilienceDecorators to the pipeline.
   */
  with(...providers: ResilienceDecorator[]): ResiliencePipeBuilder {
    this.decorators.push(...providers);
    return this;
  }

  /**
   * Apply the pipeline to the given function.
   */
  on<Args, Return>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
  ): ResiliencePipe<Args, Return> {
    const pipe = ResiliencePipe.of(fn);
    pipe.with(...this.decorators);
    return pipe;
  }
}
