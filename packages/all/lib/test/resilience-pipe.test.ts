import { ResilienceProviderService } from '@forts/resilience4ts-core';
import { Bulkhead } from '@forts/resilience4ts-bulkhead';
import { Cache, RequestScopedCache, RequestScopedCacheType } from '@forts/resilience4ts-cache';
import { CircuitBreaker, CircuitBreakerStrategy } from '@forts/resilience4ts-circuit-breaker';
import { ConcurrentLock } from '@forts/resilience4ts-concurrent-lock';
import { RateLimiter, RateLimiterScope } from '@forts/resilience4ts-rate-limiter';
import { Retry } from '@forts/resilience4ts-retry';
import { Timeout } from '@forts/resilience4ts-timeout';

import crypto from 'crypto';

import { ResiliencePipe } from '../resilience-pipe';

import { RedisMemoryServer } from 'redis-memory-server';
import { Fallback } from '@forts/resilience4ts-fallback';
import { Hedge } from '@forts/resilience4ts-hedge';

jest.setTimeout(60000);

let svc: ResilienceProviderService;
let pipe: ResiliencePipe<any, any>;
let redisServer: RedisMemoryServer;
let redisHost: string;
let redisPort: number;

describe('ResiliencePipe', () => {
  beforeAll(async () => {
    redisServer = new RedisMemoryServer();
    redisHost = await redisServer.getHost();
    redisPort = await redisServer.getPort();
  });

  afterAll(async () => {
    await redisServer.stop();
  });

  it('should initialize ResiliencePipe', async () => {
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
      scheduler: {
        defaultInterval: 1000,
        recoveryInterval: 1000,
        runConsumer: true,
      },
    });
    await svc.start();

    const decorated = jest.fn().mockResolvedValue('OK');

    const bulkhead = Bulkhead.of('test', {
      name: 'test',
      getUniqueId: () => 'bulkhead_uid',
    });

    const cache = Cache.of('test', {
      expiration: 10000,
      extractKey: () => 'cache_key',
    });

    const circuit = CircuitBreaker.of('test', {
      strategy: CircuitBreakerStrategy.Percentage,
      threshold: 0.5,
    });

    const lock = ConcurrentLock.of('test', {
      withKey: () => 'test',
    });

    const rateLimiter = RateLimiter.of('test', {
      permitLimit: 1,
      window: 1000,
      scope: RateLimiterScope.Global,
    });

    const retry = Retry.of('test', {
      maxAttempts: 3,
      maxInterval: 1000,
    });

    const timeout = Timeout.of('test', {
      timeout: 1000,
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
      name: 'bulkhead',
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
      scope: RateLimiterScope.Global,
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
