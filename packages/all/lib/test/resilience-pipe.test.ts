import { ResilienceProviderService } from '@forts/resilience4ts-core';
import { Bulkhead } from '@forts/resilience4ts-bulkhead';
import { Cache, RequestScopedCache, RequestScopedCacheType } from '@forts/resilience4ts-cache';
import { CircuitBreaker, CircuitBreakerStrategy } from '@forts/resilience4ts-circuit-breaker';
import { ConcurrentLock } from '@forts/resilience4ts-concurrent-lock';
import { Fallback } from '@forts/resilience4ts-fallback';
import { Hedge } from '@forts/resilience4ts-hedge';
import { RateLimiter, RateLimiterScope } from '@forts/resilience4ts-rate-limiter';
import { Retry } from '@forts/resilience4ts-retry';
import { Timeout } from '@forts/resilience4ts-timeout';
import crypto from 'crypto';

import { ResiliencePipe } from '../resilience-pipe';

jest.setTimeout(10000);

let svc: ResilienceProviderService;
let pipe: ResiliencePipe<any, any>;
let redisHost: string;
let redisPort: number;

describe('ResiliencePipe', () => {
  beforeAll(async () => {
    redisHost = '127.0.0.1';
    redisPort = 6379;
    svc = ResilienceProviderService.forRoot({
      resilience: {
        serviceName: 'r4t-test',
      },
      redis: {
        redisHost,
        redisPort,
        redisPassword: '',
        redisUser: '',
        redisPrefix: 'r4t-test',
      },
    });
    await svc.start();
  });

  it('should initialize ResiliencePipe', async () => {
    const decorated = jest.fn().mockResolvedValue('OK');

    const bulkhead = Bulkhead.of('init-pipe-test', {
      getUniqueId: () => 'bulkhead_uid',
    });

    const cache = Cache.of('init-pipe-test', {
      expiration: 10000,
      extractKey: () => 'cache_key',
    });

    const circuit = CircuitBreaker.of('init-pipe-test', {
      strategy: CircuitBreakerStrategy.Percentage,
      threshold: 0.5,
    });

    const lock = ConcurrentLock.of('init-pipe-test', {
      withKey: () => 'init-pipe-test',
    });

    const rateLimiter = RateLimiter.of('init-pipe-test', {
      permitLimit: 1,
      window: 1000,
      scope: RateLimiterScope.Distributed,
    });

    const retry = Retry.of('init-pipe-test', {
      maxAttempts: 3,
      maxInterval: 1000,
    });

    const timeout = Timeout.of('init-pipe-test', {
      timeout: 7000,
    });

    pipe = ResiliencePipe.of(decorated)
      .withBulkhead(bulkhead)
      .withCache(cache)
      .withCircuitBreaker(circuit)
      .withLock(lock)
      .withRateLimiter(rateLimiter)
      .withRetry(retry)
      .withTimeout(timeout);

    const result = await pipe.execute();

    expect(result).toEqual('OK');
  });

  it('should decorate a function with a Bulkhead', async () => {
    const decorated = jest.fn().mockResolvedValue('OK');

    const bulkhead = Bulkhead.of('bulkhead', {
      getUniqueId: () => 'bulkhead_uid',
    });

    pipe = ResiliencePipe.of(decorated).withBulkhead(bulkhead);

    const result = await pipe.execute();

    expect(result).toEqual('OK');
  });

  it('should decorate a function with a Cache', async () => {
    const decorated = jest.fn().mockResolvedValue('OK');

    const cache = Cache.of('cache', {
      expiration: 10000,
      extractKey: () => 'cache_key_1',
    });

    pipe = ResiliencePipe.of(decorated).withCache(cache);

    const result = await pipe.execute();

    expect(result).toEqual('OK');

    const result2 = await pipe.execute();

    expect(result2).toEqual('OK');

    expect(decorated).toBeCalledTimes(1);
  });

  it('should decorate a function with a RequestScopedCache', async () => {
    const decorated = jest.fn().mockResolvedValue('OK');

    const scope = {
      id: crypto.randomUUID(),
    };

    const cache = RequestScopedCache.of('cache', {
      extractKey: () => 'cache_key_2',
      extractScope: () => scope,
      type: RequestScopedCacheType.Local,
    });

    pipe = ResiliencePipe.of(decorated).withRequestScopedCache(cache);

    const result = await pipe.execute();

    expect(result).toEqual('OK');

    const result2 = await pipe.execute();

    expect(result2).toEqual('OK');

    expect(decorated).toBeCalledTimes(1);
  });

  it('should decorate a function with a CircuitBreaker', async () => {
    const decorated = jest.fn().mockResolvedValue('OK');

    const circuit = CircuitBreaker.of('circuit', {
      strategy: CircuitBreakerStrategy.Percentage,
      threshold: 0.5,
    });

    pipe = ResiliencePipe.of(decorated).withCircuitBreaker(circuit);

    const result = await pipe.execute();

    expect(result).toEqual('OK');
  });

  it('should decorate a function with a ConcurrentLock', async () => {
    const decorated = jest.fn().mockResolvedValue('OK');

    const lock = ConcurrentLock.of('lock', {
      withKey: () => 'lock',
    });

    pipe = ResiliencePipe.of(decorated).withLock(lock);

    const result = await pipe.execute();

    expect(result).toEqual('OK');
  });

  it('should decorate a function with a Fallback', async () => {
    const decorated = jest.fn().mockResolvedValue('OK');

    const fallback = Fallback.of('fallback', {
      fallbackAction: () => new Promise((resolve) => resolve('fallback')),
    });

    pipe = ResiliencePipe.of(decorated).withFallback(fallback);

    const result = await pipe.execute();

    expect(result).toEqual('OK');
  });

  it('should decorate a function with a Hedge', async () => {
    const decorated = jest.fn().mockResolvedValue('OK');

    const hedge = Hedge.of('hedge', {
      delay: 1000,
    });

    pipe = ResiliencePipe.of(decorated).withHedge(hedge);

    const result = await pipe.execute();

    expect(result).toEqual('OK');
  });

  it('should decorate a function with a RateLimiter', async () => {
    const decorated = jest.fn().mockResolvedValue('OK');

    const rateLimiter = RateLimiter.of('rateLimiter', {
      permitLimit: 1,
      window: 1000,
      scope: RateLimiterScope.Distributed,
    });

    pipe = ResiliencePipe.of(decorated).withRateLimiter(rateLimiter);

    const result = await pipe.execute();

    expect(result).toEqual('OK');
  });

  it('should decorate a function with a Retry', async () => {
    const decorated = jest.fn().mockResolvedValue('OK');

    const retry = Retry.of('retry', {
      maxAttempts: 3,
      maxInterval: 1000,
    });

    pipe = ResiliencePipe.of(decorated).withRetry(retry);

    const result = await pipe.execute();

    expect(result).toEqual('OK');
  });

  it('should decorate a function with a Timeout', async () => {
    const decorated = jest.fn().mockResolvedValue('OK');

    const timeout = Timeout.of('timeout', {
      timeout: 1000,
    });

    pipe = ResiliencePipe.of(decorated).withTimeout(timeout);

    const result = await pipe.execute();

    expect(result).toEqual('OK');
  });
});
