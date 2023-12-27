import { ResilienceProviderService } from '@forts/resilience4ts-core';
import { ConcurrentLock } from '../concurrent-lock';
import { RedisMemoryServer } from 'redis-memory-server';
import { setTimeout } from 'timers/promises';
import { ConcurrentLockException } from '../types';
import { Result } from 'oxide.ts';

jest.setTimeout(60000);

let svc: ResilienceProviderService;
let lock: ConcurrentLock;
let redisServer: RedisMemoryServer;
let redisHost: string;
let redisPort: number;

describe('ConcurrentLock', () => {
  beforeAll(async () => {
    redisServer = new RedisMemoryServer();
    redisHost = await redisServer.getHost();
    redisPort = await redisServer.getPort();
  });

  afterAll(async () => {
    await redisServer.stop();
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
      scheduler: {
        defaultInterval: 1000,
        recoveryInterval: 1000,
        runConsumer: true,
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
      scheduler: {
        defaultInterval: 1000,
        recoveryInterval: 1000,
        runConsumer: false,
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

    const resolved = result.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<
      Result<string, ConcurrentLockException>
    >[];
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
      scheduler: {
        defaultInterval: 1000,
        recoveryInterval: 1000,
        runConsumer: true,
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
      scheduler: {
        defaultInterval: 1000,
        recoveryInterval: 1000,
        runConsumer: true,
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

    const resolved = result.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<
      Result<string, ConcurrentLockException>
    >[];

    const rejected = result.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    expect(resolved.length).toBe(2);
    expect(rejected.length).toBe(0);
  });
});
