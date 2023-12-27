import { ResilienceProviderService } from '@forts/resilience4ts-core';
import { RedisMemoryServer } from 'redis-memory-server';
import crypto from 'node:crypto';
import { RequestScopedCache } from '../request-scoped-cache';
import { RequestScopedCacheType } from '../types';

jest.setTimeout(60000);

let svc: ResilienceProviderService;
let cache: RequestScopedCache;
let redisServer: RedisMemoryServer;
let redisHost: string;
let redisPort: number;

describe('RequestScopedCache', () => {
  beforeAll(async () => {
    redisServer = new RedisMemoryServer();
    redisHost = await redisServer.getHost();
    redisPort = await redisServer.getPort();
  });

  it('should initialize cache', async () => {
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
        runConsumer: false,
      },
    });
    await svc.start();
    const listener = jest.fn();
    svc.emitter.addListener('r4t-cache-ready', listener);

    const scope = {
      id: crypto.randomUUID(),
    };

    const decorated = jest.fn().mockResolvedValue('OK');

    cache = RequestScopedCache.of('test', {
      extractKey: () => 'cache_key',
      extractScope: () => scope,
      type: RequestScopedCacheType.Local,
    });

    const decoratedCache = cache.on(decorated);

    const result = await decoratedCache();

    expect(listener).toHaveBeenCalledTimes(1);

    expect(result).toEqual('OK');
  });

  it('should cache the result of the decorated function - Local Strategy', async () => {
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
        runConsumer: false,
      },
    });
    await svc.start();

    const scope = {
      id: crypto.randomUUID(),
    };

    const decorated = jest.fn().mockResolvedValue('OK');

    cache = RequestScopedCache.of('test', {
      extractKey: () => 'cache_key',
      extractScope: () => scope,
      type: RequestScopedCacheType.Local,
    });

    const decoratedCache = cache.on(decorated);

    const result = await decoratedCache();

    expect(result).toEqual('OK');

    const two = await decoratedCache();

    expect(two).toEqual('OK');

    expect(decorated).toHaveBeenCalledTimes(1);
  });

  it('should cache the result of the decorated function - Distributed Strategy', async () => {
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
        runConsumer: false,
      },
    });
    await svc.start();

    const scope = {
      id: crypto.randomUUID(),
    };

    const decorated = jest.fn().mockResolvedValue('OK');

    cache = RequestScopedCache.of('test', {
      extractKey: () => 'cache_key',
      extractScope: () => scope,
      type: RequestScopedCacheType.Distributed,
      clearOnRequestEnd: false,
    });

    const decoratedCache = cache.on(decorated);

    const result = await decoratedCache();

    expect(result).toEqual('OK');

    const two = await decoratedCache();

    expect(two).toEqual('OK');

    expect(decorated).toHaveBeenCalledTimes(1);
  });
});
