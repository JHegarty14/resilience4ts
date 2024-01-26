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

import { ResiliencePipeBuilder } from '../resilience-pipe';

jest.setTimeout(10000);

let svc: ResilienceProviderService;
let pipe: ResiliencePipeBuilder;
let redisHost: string;
let redisPort: number;

describe('ResiliencePipeBuilder', () => {
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

  it('should initialize ResliencePipe via Builder', async () => {
    const decorated = jest.fn().mockResolvedValue('OK');

    const bulkhead = Bulkhead.of('init-pipe-builder-test', {
      getUniqueId: () => 'bulkhead_uid',
    });

    const cache = Cache.of('init-pipe-builder-test', {
      expiration: 10000,
      extractKey: () => 'cache_key',
    });

    const circuit = CircuitBreaker.of('init-pipe-builder-test', {
      strategy: CircuitBreakerStrategy.Percentage,
      threshold: 0.5,
    });

    const lock = ConcurrentLock.of('init-pipe-builder-test', {
      withKey: () => 'init-pipe-builder-test',
    });

    const rateLimiter = RateLimiter.of('init-pipe-builder-test', {
      permitLimit: 1,
      window: 1000,
      scope: RateLimiterScope.Distributed,
    });

    const retry = Retry.of('init-pipe-builder-test', {
      maxAttempts: 3,
      maxInterval: 1000,
    });

    const timeout = Timeout.of('init-pipe-builder-test', {
      timeout: 7000,
    });

    pipe = new ResiliencePipeBuilder()
      .withBulkhead(bulkhead)
      .withCache(cache)
      .withCircuitBreaker(circuit)
      .withLock(lock)
      .withRateLimiter(rateLimiter)
      .withRetry(retry)
      .withTimeout(timeout);

    const decoratedPipe = pipe.on(decorated);

    const result = await decoratedPipe.execute();

    expect(result).toEqual('OK');
  });

  it('should decorate a function with a Bulkhead', async () => {
    const decorated = jest.fn().mockResolvedValue('OK');

    const bulkhead = Bulkhead.of('bulkhead', {
      getUniqueId: () => 'bulkhead_uid',
    });

    pipe = new ResiliencePipeBuilder().withBulkhead(bulkhead);

    const decoratedPipe = pipe.on(decorated);

    const result = await decoratedPipe.execute();

    expect(result).toEqual('OK');
  });

  it('should decorate a function with a Cache', async () => {
    const decorated = jest.fn().mockResolvedValue('OK');

    const cache = Cache.of('cache', {
      expiration: 10000,
      extractKey: () => 'cache_key',
    });

    pipe = new ResiliencePipeBuilder().withCache(cache);

    const decoratedPipe = pipe.on(decorated);

    const result = await decoratedPipe.execute();

    expect(result).toEqual('OK');
  });

  it('should decorate a function with a RequestScopedCache', async () => {
    const decorated = jest.fn().mockResolvedValue('OK');

    const scope = {
      id: crypto.randomUUID(),
    };

    const cache = RequestScopedCache.of('request-scoped-cache', {
      extractKey: () => 'cache_key',
      extractScope: () => scope,
      type: RequestScopedCacheType.Local,
    });

    pipe = new ResiliencePipeBuilder().withRequestScopedCache(cache);

    const decoratedPipe = pipe.on(decorated);

    const result = await decoratedPipe.execute();

    expect(result).toEqual('OK');
  });

  it('should decorate a function with a CircuitBreaker', async () => {
    const decorated = jest.fn().mockResolvedValue('OK');

    const circuit = CircuitBreaker.of('circuit-breaker', {
      strategy: CircuitBreakerStrategy.Percentage,
      threshold: 0.5,
    });

    pipe = new ResiliencePipeBuilder().withCircuitBreaker(circuit);

    const decoratedPipe = pipe.on(decorated);

    const result = await decoratedPipe.execute();

    expect(result).toEqual('OK');
  });

  it('should decorate a function with a ConcurrentLock', async () => {
    const decorated = jest.fn().mockResolvedValue('OK');

    const lock = ConcurrentLock.of('concurrent-lock', {
      withKey: () => 'concurrent-lock',
    });

    pipe = new ResiliencePipeBuilder().withLock(lock);

    const decoratedPipe = pipe.on(decorated);

    const result = await decoratedPipe.execute();

    expect(result).toEqual('OK');
  });

  it('should decorate a function with a RateLimiter', async () => {
    const decorated = jest.fn().mockResolvedValue('OK');

    const rateLimiter = RateLimiter.of('rate-limiter', {
      permitLimit: 1,
      window: 1000,
      scope: RateLimiterScope.Distributed,
    });

    pipe = new ResiliencePipeBuilder().withRateLimiter(rateLimiter);

    const decoratedPipe = pipe.on(decorated);

    const result = await decoratedPipe.execute();

    expect(result).toEqual('OK');
  });

  it('should decorate a function with a Retry', async () => {
    const decorated = jest.fn().mockResolvedValue('OK');

    const retry = Retry.of('retry', {
      maxAttempts: 3,
      maxInterval: 1000,
    });

    pipe = new ResiliencePipeBuilder().withRetry(retry);

    const decoratedPipe = pipe.on(decorated);

    const result = await decoratedPipe.execute();

    expect(result).toEqual('OK');
  });

  it('should decorate a function with a Timeout', async () => {
    const decorated = jest.fn().mockResolvedValue('OK');

    const timeout = Timeout.of('timeout', {
      timeout: 1000,
    });

    pipe = new ResiliencePipeBuilder().withTimeout(timeout);

    const decoratedPipe = pipe.on(decorated);

    const result = await decoratedPipe.execute();

    expect(result).toEqual('OK');
  });
});
