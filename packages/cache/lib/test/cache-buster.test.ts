import { PredicateBuilder, ResilienceProviderService } from '@forts/resilience4ts-core';
import { CacheBuster } from '../cache-buster';

jest.setTimeout(10000);

let svc: ResilienceProviderService;
let cacheBuster: CacheBuster;
let redisHost: string;
let redisPort: number;

describe('CacheBuster', () => {
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

  it('should initialize cache buster', async () => {
    const listener = jest.fn();
    svc.emitter.addListener('r4t-cache-ready', listener);

    const decorated = jest.fn().mockResolvedValue('OK');

    cacheBuster = CacheBuster.of('test', {
      invalidatesKeys: (...args: string[]) => args.join(':'),
    });

    const decoratedCache = cacheBuster.on(decorated);

    const result = await decoratedCache();

    expect(listener).toHaveBeenCalledTimes(1);

    expect(result).toEqual('OK');
  });

  it('should invalidate the cache when the decorated function resolves', async () => {
    await svc.cache.set('a:b:c', 'OLD');

    const decorated: (...args: string[]) => Promise<'OK'> = jest
      .fn()
      .mockImplementation(() => 'OK');

    const decoratedCache = cacheBuster.on(decorated);

    const result = await decoratedCache('a', 'b', 'c');

    expect(result).toEqual('OK');

    const result2 = await decoratedCache('d', 'e', 'f');

    expect(result2).toEqual('OK');

    expect(decorated).toHaveBeenCalledTimes(2);

    const cached = await svc.cache.get('a:b:c');

    expect(cached).toBeNull();
  });

  it('should invalidate the cache when the decorated function rejects if invalidateOnException is true', async () => {
    await svc.cache.set('a:b:c', 'OLD');

    const decorated: (...args: string[]) => Promise<'OK'> = jest.fn().mockImplementation(() => {
      throw new Error('BOOM');
    });

    const decoratedCache = CacheBuster.of('test', {
      invalidatesKeys: (...args: string[]) => args.join(':'),
      invalidateOnException: true,
    }).on(decorated);

    await expect(decoratedCache('a', 'b', 'c')).rejects.toThrow('BOOM');

    const cached = await svc.cache.get('a:b:c');

    expect(cached).toBeNull();
  });

  it('should not invalidate the cache when the decorated function rejects if invalidateOnException is false', async () => {
    await svc.cache.set('a:b:c', 'OLD');

    const decorated: (...args: string[]) => Promise<'OK'> = jest.fn().mockImplementation(() => {
      throw new Error('BOOM');
    });

    const decoratedCache = CacheBuster.of('test', {
      invalidatesKeys: (...args: string[]) => args.join(':'),
      invalidateOnException: false,
    }).on(decorated);

    await expect(decoratedCache('a', 'b', 'c')).rejects.toThrow('BOOM');

    const cached = await svc.cache.get('a:b:c');

    expect(cached).toEqual('OLD');
  });

  it('should invalidate the cache when the decorated function resolves if result matches shouldInvalidate predicate', async () => {
    await svc.cache.set('a:b:c', 'OLD');

    const decorated: (...args: string[]) => Promise<'OK'> = jest
      .fn()
      .mockImplementation(() => 'OK');

    const decoratedCache = CacheBuster.of('test', {
      invalidatesKeys: (...args: string[]) => args.join(':'),
      shouldInvalidate: new PredicateBuilder((x: unknown) => x === 'OK'),
    }).on(decorated);

    const result = await decoratedCache('a', 'b', 'c');

    expect(result).toEqual('OK');

    const result2 = await decoratedCache('d', 'e', 'f');

    expect(result2).toEqual('OK');

    expect(decorated).toHaveBeenCalledTimes(2);

    const cached = await svc.cache.get('a:b:c');

    expect(cached).toBeNull();
  });

  it('should not invalidate the cache when the decorated function resolves if result does not match shouldInvalidate predicate', async () => {
    await svc.cache.set('a:b:c', 'OLD');

    const decorated: (...args: string[]) => Promise<'OK'> = jest
      .fn()
      .mockImplementation(() => 'OK');

    const decoratedCache = CacheBuster.of('test', {
      invalidatesKeys: (...args: string[]) => args.join(':'),
      shouldInvalidate: new PredicateBuilder((x: unknown) => x === 'MISMATCH'),
    }).on(decorated);

    const result = await decoratedCache('a', 'b', 'c');

    expect(result).toEqual('OK');

    const result2 = await decoratedCache('d', 'e', 'f');

    expect(result2).toEqual('OK');

    expect(decorated).toHaveBeenCalledTimes(2);

    const cached = await svc.cache.get('a:b:c');

    expect(cached).toEqual('OLD');
  });

  it('onBound - should initialize cache buster', async () => {
    const listener = jest.fn();
    svc.emitter.addListener('r4t-cache-ready', listener);

    const decorated = jest.fn().mockResolvedValue('OK');

    cacheBuster = CacheBuster.of('test', {
      invalidatesKeys: (...args: string[]) => args.join(':'),
    });

    const self = {};

    const decoratedCache = cacheBuster.onBound(decorated, self);

    const result = await decoratedCache();

    expect(listener).toHaveBeenCalledTimes(1);

    expect(result).toEqual('OK');
  });

  it('onBound - should invalidate the cache when the decorated function resolves', async () => {
    await svc.cache.set('a:b:c', 'OLD');

    const decorated: (...args: string[]) => Promise<'OK'> = jest
      .fn()
      .mockImplementation(() => 'OK');

    const self = {};

    const decoratedCache = cacheBuster.onBound(decorated, self);

    const result = await decoratedCache('a', 'b', 'c');

    expect(result).toEqual('OK');

    const result2 = await decoratedCache('d', 'e', 'f');

    expect(result2).toEqual('OK');

    expect(decorated).toHaveBeenCalledTimes(2);

    const cached = await svc.cache.get('a:b:c');

    expect(cached).toBeNull();
  });

  it('onBound - should invalidate the cache when the decorated function rejects if invalidateOnException is true', async () => {
    await svc.cache.set('a:b:c', 'OLD');

    const decorated: (...args: string[]) => Promise<'OK'> = jest.fn().mockImplementation(() => {
      throw new Error('BOOM');
    });

    const self = {};

    const decoratedCache = CacheBuster.of('test', {
      invalidatesKeys: (...args: string[]) => args.join(':'),
      invalidateOnException: true,
    }).onBound(decorated, self);

    await expect(decoratedCache('a', 'b', 'c')).rejects.toThrow('BOOM');

    const cached = await svc.cache.get('a:b:c');

    expect(cached).toBeNull();
  });

  it('onBound - should not invalidate the cache when the decorated function rejects if invalidateOnException is false', async () => {
    await svc.cache.set('a:b:c', 'OLD');

    const decorated: (...args: string[]) => Promise<'OK'> = jest.fn().mockImplementation(() => {
      throw new Error('BOOM');
    });

    const self = {};

    const decoratedCache = CacheBuster.of('test', {
      invalidatesKeys: (...args: string[]) => args.join(':'),
      invalidateOnException: false,
    }).onBound(decorated, self);

    await expect(decoratedCache('a', 'b', 'c')).rejects.toThrow('BOOM');

    const cached = await svc.cache.get('a:b:c');

    expect(cached).toEqual('OLD');
  });

  it('onBound - should invalidate the cache when the decorated function resolves if result matches shouldInvalidate predicate', async () => {
    await svc.cache.set('a:b:c', 'OLD');

    const decorated: (...args: string[]) => Promise<'OK'> = jest
      .fn()
      .mockImplementation(() => 'OK');

    const self = {};

    const decoratedCache = CacheBuster.of('test', {
      invalidatesKeys: (...args: string[]) => args.join(':'),
      shouldInvalidate: new PredicateBuilder((x: unknown) => x === 'OK'),
    }).onBound(decorated, self);

    const result = await decoratedCache('a', 'b', 'c');

    expect(result).toEqual('OK');

    const result2 = await decoratedCache('d', 'e', 'f');

    expect(result2).toEqual('OK');

    expect(decorated).toHaveBeenCalledTimes(2);

    const cached = await svc.cache.get('a:b:c');

    expect(cached).toBeNull();
  });

  it('onBound - should not invalidate the cache when the decorated function resolves if result does not match shouldInvalidate predicate', async () => {
    await svc.cache.set('a:b:c', 'OLD');

    const decorated: (...args: string[]) => Promise<'OK'> = jest
      .fn()
      .mockImplementation(() => 'OK');

    const self = {};

    const decoratedCache = CacheBuster.of('test', {
      invalidatesKeys: (...args: string[]) => args.join(':'),
      shouldInvalidate: new PredicateBuilder((x: unknown) => x === 'MISMATCH'),
    }).onBound(decorated, self);

    const result = await decoratedCache('a', 'b', 'c');

    expect(result).toEqual('OK');

    const result2 = await decoratedCache('d', 'e', 'f');

    expect(result2).toEqual('OK');

    expect(decorated).toHaveBeenCalledTimes(2);

    const cached = await svc.cache.get('a:b:c');

    expect(cached).toEqual('OLD');
  });
});
