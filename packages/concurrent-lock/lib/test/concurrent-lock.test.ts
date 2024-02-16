import { ResilienceProviderService } from '@forts/resilience4ts-core';
import { ConcurrentLock } from '../concurrent-lock';
import { setTimeout } from 'timers/promises';
import { ConcurrentLockException } from '../types';

jest.setTimeout(10000);

let svc: ResilienceProviderService;
let lock: ConcurrentLock;
let redisHost: string;
let redisPort: number;

describe('ConcurrentLock', () => {
  beforeAll(async () => {
    redisHost = '127.0.0.1';
    redisPort = 6379;
  });

  it('should initialize lock', async () => {
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

    const decorated = jest.fn().mockResolvedValue('OK');

    lock = ConcurrentLock.of('test', {
      withKey: () => 'test',
    });

    const result = await lock.on(decorated)();

    expect(result).toBe('OK');
  });

  it('should reject on lock conflict', async () => {
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

    const decorated = jest.fn().mockImplementation(async () => {
      await setTimeout(2000);
      return 'OK';
    });

    lock = ConcurrentLock.of('test', {
      withKey: () => 'test',
    });

    const locked = lock.on(decorated);

    const result = await Promise.allSettled([
      locked(),
      locked(),
      locked(),
      locked(),
      locked(),
      locked(),
    ]);

    const resolved = result.filter(
      (r) => r.status === 'fulfilled',
    ) as PromiseFulfilledResult<string>[];
    const rejected = result.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    expect(resolved.length).toBe(1);
    expect(rejected.length).toBe(5);
  });

  it('should allow execution after lock expiration', async () => {
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

    const decorated = jest.fn().mockImplementation(async () => {
      await setTimeout(2000);
      return 'OK';
    });

    lock = ConcurrentLock.of('test', {
      withKey: () => 'test',
    });

    const locked = lock.on(decorated);

    const first = await locked();

    expect(first).toBe('OK');

    await setTimeout(2000);

    const second = await locked();

    expect(second).toBe('OK');
  });

  it('should allow concurrent execution with different keys', async () => {
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

    const decorated = jest.fn().mockImplementation(async () => {
      await setTimeout(2000);
      return 'OK';
    });

    const lock1 = ConcurrentLock.of('test', {
      withKey: () => 'test',
    });

    const lock2 = ConcurrentLock.of('test-2', {
      withKey: () => 'test-2',
    });

    const locked1 = lock1.on(decorated);
    const locked2 = lock2.on(decorated);

    const result = await Promise.allSettled([locked1(), locked2()]);

    const resolved = result.filter(
      (r) => r.status === 'fulfilled',
    ) as PromiseFulfilledResult<string>[];

    const rejected = result.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    expect(resolved.length).toBe(2);
    expect(rejected.length).toBe(0);
  });

  it('onBound - should initialize lock', async () => {
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

    const decorated = jest.fn().mockResolvedValue('OK');

    lock = ConcurrentLock.of('test', {
      withKey: () => 'test',
    });

    const self = {};

    const result = await lock.onBound(decorated, self)();

    expect(result).toBe('OK');
  });

  it('onBound - should reject on lock conflict', async () => {
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

    const decorated = jest.fn().mockImplementation(async () => {
      await setTimeout(2000);
      return 'OK';
    });

    lock = ConcurrentLock.of('test', {
      withKey: () => 'test',
    });

    const self = {};

    const locked = lock.onBound(decorated, self);

    const result = await Promise.allSettled([
      locked(),
      locked(),
      locked(),
      locked(),
      locked(),
      locked(),
    ]);

    const resolved = result.filter(
      (r) => r.status === 'fulfilled',
    ) as PromiseFulfilledResult<string>[];
    const rejected = result.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    expect(resolved.length).toBe(1);
    expect(rejected.length).toBe(5);
  });

  it('onBound - should allow execution after lock expiration', async () => {
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

    const decorated = jest.fn().mockImplementation(async () => {
      await setTimeout(2000);
      return 'OK';
    });

    lock = ConcurrentLock.of('test', {
      withKey: () => 'test',
    });

    const self = {};

    const locked = lock.onBound(decorated, self);

    const first = await locked();

    expect(first).toBe('OK');

    await setTimeout(2000);

    const second = await locked();

    expect(second).toBe('OK');
  });

  it('onBound - should allow concurrent execution with different keys', async () => {
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

    const decorated = jest.fn().mockImplementation(async () => {
      await setTimeout(2000);
      return 'OK';
    });

    const lock1 = ConcurrentLock.of('test', {
      withKey: () => 'test',
    });

    const lock2 = ConcurrentLock.of('test-2', {
      withKey: () => 'test-2',
    });

    const self = {};

    const locked1 = lock1.onBound(decorated, self);
    const locked2 = lock2.onBound(decorated, self);

    const result = await Promise.allSettled([locked1(), locked2()]);

    const resolved = result.filter(
      (r) => r.status === 'fulfilled',
    ) as PromiseFulfilledResult<string>[];

    const rejected = result.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    expect(resolved.length).toBe(2);
    expect(rejected.length).toBe(0);
  });
});
