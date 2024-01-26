import { ResilienceProviderService } from '@forts/resilience4ts-core';
import { setTimeout } from 'timers/promises';
import { Cache } from '../cache';

jest.setTimeout(10000);

let svc: ResilienceProviderService;
let cache: Cache;
let redisHost: string;
let redisPort: number;

describe('Cache', () => {
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

  it('should initialize cache', async () => {
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

  it('onBound - should initialize cache', async () => {
    const listener = jest.fn();
    svc.emitter.addListener('r4t-cache-ready', listener);

    const decorated = jest.fn().mockResolvedValue('OK');

    cache = Cache.of('test', {
      expiration: 10000,
      extractKey: () => 'cache_key',
    });

    const self = {};

    const decoratedCache = cache.onBound(decorated, self);

    const result = await decoratedCache();

    expect(listener).toHaveBeenCalledTimes(1);

    expect(result).toEqual('OK');
  });

  it('onBound - should cache the result of the decorated function', async () => {
    const listener = jest.fn();
    svc.emitter.addListener('r4t-cache-ready', listener);

    const decorated = jest.fn().mockResolvedValue('OK');

    cache = Cache.of('test', {
      expiration: 10000,
      extractKey: () => 'cache_key',
    });

    const self = {};

    const decoratedCache = cache.onBound(decorated, self);

    const result = await decoratedCache();

    const cachedValue = await svc.cache.get('cache_key');

    expect(JSON.parse(cachedValue || '')).toEqual(result);
  });

  it('onBound - should cache value with expiration', async () => {
    const listener = jest.fn();
    svc.emitter.addListener('r4t-cache-ready', listener);

    const decorated = jest.fn().mockResolvedValue('OK');

    cache = Cache.of('test', {
      expiration: 1,
      extractKey: () => 'cache_key_2',
    });

    const self = {};

    const decoratedCache = cache.onBound(decorated, self);

    const result = await decoratedCache();

    expect(result).toEqual('OK');

    await setTimeout(2000);

    const cachedValue = await svc.cache.get('cache_key_2');

    expect(cachedValue).toBeNull();
  });
});
