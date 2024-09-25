import {
  ResilienceDecorator,
  ResilienceProviderService,
  assertUnreachable,
  unwrap,
  Decoratable,
  Stopwatch,
} from '@forts/resilience4ts-core';
import crypto from 'node:crypto';
import { BaseStrategy, CircuitBreakerStrategyFactory } from './internal/circuit-breaker-strategy';
import { CircuitConnectionLost, CircuitOpenException } from './exceptions';
import {
  type CircuitBreakerConfig,
  CircuitBreakerConfigImpl,
  CircuitEvents,
  type Incrementable,
} from './types';
import {
  CircuitBreakerState,
  defaultCircuitBucket,
  recordToCircuitBucket,
} from './types/circuit-breaker-model.type';
import { KeyBuilder } from './internal';
import { CircuitBreakerMetricsImpl } from './internal/circuit-breaker-metrics';

/**
 * CircuitBreaker Decorator
 * ------------------------
 *
 * The CircuitBreaker decorator is used to prevent a method from executing if the
 * error rate exceeds a certain threshold. A circuit breaker can be configured to
 * measure errors against a percentage or volume threshold. If the error rate exceeds
 * the threshold, the circuit is opened and the exeuction of the decorated method will
 * not be allowed until the circuit is closed.
 *
 * If the circuit is open, the decorated method will throw a {@link CircuitOpenException}.
 */
export class CircuitBreaker implements ResilienceDecorator {
  private static core: ResilienceProviderService;
  private readonly whitelist: Error[] = [];
  private readonly strategy: BaseStrategy;
  private readonly initialized: Promise<void>;

  private constructor(
    readonly name: string,
    private readonly config: CircuitBreakerConfigImpl,
    private readonly tags: Map<string, string>,
  ) {
    CircuitBreaker.core = ResilienceProviderService.forRoot();
    this.strategy = CircuitBreakerStrategyFactory.resolve(config);
    this.Metrics = new CircuitBreakerMetricsImpl(
      config,
      CircuitBreaker.core.config.metrics?.captureInterval,
    );
    this.initialized = this.init();
  }

  /**
   * Create a new CircuitBreaker instance
   */
  static of(name: string, config: CircuitBreakerConfig): CircuitBreaker;
  static of(
    name: string,
    config: CircuitBreakerConfig,
    tags?: Map<string, string>,
  ): CircuitBreaker {
    return new CircuitBreaker(name, new CircuitBreakerConfigImpl(config), tags || new Map());
  }

  private async init(): Promise<void> {
    await CircuitBreaker.core.start();
    const registered = await CircuitBreaker.core.cache.zScore(
      KeyBuilder.circuitRegistryKey(),
      this.name,
    );

    if (!registered) {
      await this.registerCircuit();
    }

    CircuitBreaker.core.emitter.emit('r4t-circuit-ready', this.name, this.tags);

    return;
  }

  /**
   * Decorate a method with circuit breaker functionality
   */
  on<Args, Return>(fn: Decoratable<Args, Return>) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;
      CircuitBreaker.core.emitter.emit(CircuitEvents.request, this.name, this.tags);

      const circuitState = await this.getCircuitState();

      switch (circuitState) {
        case CircuitBreakerState.Closed:
          await this.onClosed();
          break;
        case CircuitBreakerState.HalfOpen:
          this.onHalfOpen();
          break;
        case CircuitBreakerState.Open:
          await this.onOpen();
          break;
        default:
          assertUnreachable(circuitState);
      }

      const stopwatch = Stopwatch.start();

      try {
        const result = await fn(...args);
        await this.onSuccess(stopwatch);
        return result;
      } catch (e) {
        await this.onError(stopwatch);
        throw e;
      } finally {
        const activeBucket = await this.getActiveBucket();
        await this.decrementCounter(activeBucket, 'inFlight');
      }
    };
  }

  /**
   * Decorate a method with circuit breaker functionality. This varient of the
   * decorator is useful when the decorated function is a method on a class.
   */
  onBound<Args, Return>(fn: Decoratable<Args, Return>, self: unknown) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;
      CircuitBreaker.core.emitter.emit(CircuitEvents.request, this.name, this.tags);

      const circuitState = await this.getCircuitState();

      switch (circuitState) {
        case CircuitBreakerState.Closed:
          await this.onClosed();
          break;
        case CircuitBreakerState.HalfOpen:
          this.onHalfOpen();
          break;
        case CircuitBreakerState.Open:
          await this.onOpen();
          break;
        default:
          assertUnreachable(circuitState);
      }

      const stopwatch = Stopwatch.start();

      try {
        const result = await fn.call(self, ...args);
        await this.onSuccess(stopwatch);
        return result;
      } catch (e) {
        await this.onError(stopwatch);
        throw e;
      } finally {
        const activeBucket = await this.getActiveBucket();
        await this.decrementCounter(activeBucket, 'inFlight');
      }
    };
  }

  private async onError(stopwatch: Stopwatch) {
    const activeBucket = await this.getActiveBucket();

    const pipeline = CircuitBreaker.core.cache.multi();
    const result = await pipeline
      .hIncrBy(activeBucket, 'failure', 1)
      .hSet(activeBucket, 'lastFailure', Date.now())
      .hGetAll(activeBucket)
      .exec();
    const hash = unwrap(result[2]) as unknown as Record<string, string>;
    const bucketDetails = recordToCircuitBucket(hash);

    const isThresholdExceeded = this.strategy.isThresholdExceeded(
      bucketDetails.failure,
      bucketDetails.success,
    );

    this.Metrics.onCallFailure(stopwatch.getElapsedMilliseconds());

    if (isThresholdExceeded) {
      CircuitBreaker.core.emitter.emit(CircuitEvents.open, this.name, this.tags);
      await CircuitBreaker.core.cache.zAdd(KeyBuilder.circuitRegistryKey(), {
        score: CircuitBreakerState.Open,
        value: this.name,
      });
      throw new CircuitOpenException(this.name);
    }
  }

  private async onSuccess(stopwatch: Stopwatch) {
    const activeBucket = await this.getActiveBucket();

    await CircuitBreaker.core.cache
      .multi()
      .hIncrBy(activeBucket, 'success', 1)
      .zAdd(KeyBuilder.circuitRegistryKey(), {
        score: CircuitBreakerState.Closed,
        value: this.name,
      })
      .exec();

    CircuitBreaker.core.emitter.emit(CircuitEvents.closed, this.name);

    this.Metrics.onCallSuccess(stopwatch.getElapsedMilliseconds());
  }

  withWhitelist(...errors: Error[]): CircuitBreaker {
    this.whitelist.push(...errors);
    return this;
  }

  private async onClosed() {
    const activeBucket = await this.getActiveBucket();

    await this.incrementCounter(activeBucket, 'inFlight');
  }

  private async onHalfOpen() {
    const activeBucket = await this.getActiveBucket();

    const hash = await CircuitBreaker.core.cache.hGetAll(activeBucket);
    const bucketDetails = recordToCircuitBucket(hash);

    const inFlight = await this.incrementCounter(activeBucket, 'inFlight');

    const allow = this.strategy.allowCanary(inFlight, bucketDetails.lastFailure);

    if (!allow) {
      await Promise.allSettled([
        this.decrementCounter(activeBucket, 'inFlight'),
        this.incrementCounter(activeBucket, 'rejection'),
      ]);
      CircuitBreaker.core.emitter.emit(CircuitEvents.halfOpen, this.name, this.tags);
      throw new CircuitOpenException(this.name);
    }
  }

  private async onOpen() {
    const [activeBucket] = await this.getTimeseriesData();

    if (!activeBucket) {
      await CircuitBreaker.core.cache.zAdd(KeyBuilder.circuitRegistryKey(), {
        score: CircuitBreakerState.HalfOpen,
        value: this.name,
      });

      return await this.onHalfOpen();
    }

    await this.incrementCounter(activeBucket, 'rejection');
    this.Metrics.onCallNotPermitted();
    throw new CircuitOpenException(this.name);
  }

  private async onExpired() {
    const circuitUid = crypto.randomUUID();
    await CircuitBreaker.core.cache
      .multi()
      .zAdd(KeyBuilder.timeseriesKey(this.name), { score: Date.now(), value: circuitUid })
      .hSet(circuitUid, defaultCircuitBucket())
      .exec();
  }

  private async getActiveBucket(attempt = 0): Promise<string> {
    if (attempt >= this.config.circuitConnectionRetries) {
      throw new CircuitConnectionLost(attempt);
    }

    const [activeBucket] = await this.getTimeseriesData();

    if (!activeBucket) {
      await this.onExpired();
      return await this.getActiveBucket(attempt + 1);
    }

    return activeBucket;
  }

  private async getCircuitState(): Promise<CircuitBreakerState> {
    return (await CircuitBreaker.core.cache.zScore(
      KeyBuilder.circuitRegistryKey(),
      this.name,
    )) as CircuitBreakerState;
  }

  private async registerCircuit() {
    const circuitUid = crypto.randomUUID();
    await CircuitBreaker.core.cache
      .multi()
      .zAdd(KeyBuilder.circuitRegistryKey(), {
        score: CircuitBreakerState.Closed,
        value: this.name,
      })
      .zAdd(KeyBuilder.timeseriesKey(this.name), { score: Date.now(), value: circuitUid })
      .hSet(circuitUid, defaultCircuitBucket())
      .exec();
  }

  private async decrementCounter(circuitUid: string, counter: Incrementable) {
    return await CircuitBreaker.core.cache.hIncrBy(circuitUid, counter, -1);
  }

  private async incrementCounter(circuitUid: string, counter: Incrementable) {
    return await CircuitBreaker.core.cache.hIncrBy(circuitUid, counter, 1);
  }

  private async getTimeseriesData(count = 1, rev = true) {
    const interval = this.config.interval;
    const now = Date.now();
    const start = now - interval;

    const buckets = await CircuitBreaker.core.cache.zRange(
      KeyBuilder.timeseriesKey(this.name),
      now,
      start,
      {
        BY: 'SCORE',
        REV: rev || undefined,
        LIMIT: { offset: 0, count },
      },
    );

    return buckets ?? [];
  }

  getName() {
    return this.name;
  }

  readonly Metrics: CircuitBreakerMetricsImpl;
}
