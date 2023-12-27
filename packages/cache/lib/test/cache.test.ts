import { ResilienceProviderService } from '@forts/resilience4ts-core';
import { RedisMemoryServer } from 'redis-memory-server';
import { setTimeout } from 'timers/promises';
import { Cache } from '../cache';

jest.setTimeout(60000);

let svc: ResilienceProviderService;
let cache: Cache;
let redisServer: RedisMemoryServer;
let redisHost: string;
let redisPort: number;

describe('Cache', () => {
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

    const decorated = jest.fn().mockResolvedValue('OK');

    cache = Cache.of('test', {
      expiration: 10000,
      extractKey: () => 'cache_key',
    });

    const decoratedCache = cache.on(decorated);

    const result = await decoratedCache();

    expect(listener).toHaveBeenCalledTimes(1);

    expect(result).toEqual('OK');
  });

  it('should cache the result of the decorated function', async () => {
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

    const decorated = jest.fn().mockResolvedValue('OK');

    cache = Cache.of('test', {
      expiration: 10000,
      extractKey: () => 'cache_key',
    });

    const decoratedCache = cache.on(decorated);

    const result = await decoratedCache();

    const cachedValue = await svc.cache.get('cache_key');

    expect(JSON.parse(cachedValue || '')).toEqual(result);
  });

  it('should cache value with expiration', async () => {
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

    const decorated = jest.fn().mockResolvedValue('OK');

    cache = Cache.of('test', {
      expiration: 1,
      extractKey: () => 'cache_key_2',
    });

    const decoratedCache = cache.on(decorated);

    const result = await decoratedCache();

    expect(result).toEqual('OK');

    await setTimeout(2000);

    const cachedValue = await svc.cache.get('cache_key_2');

    expect(cachedValue).toBeNull();
  });
});
