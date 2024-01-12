import { ResilienceProviderService } from '@forts/resilience4ts-core';
import { ConcurrentQueue } from '../concurrent-queue';
import { setTimeout } from 'timers/promises';

jest.setTimeout(10000);

let svc: ResilienceProviderService;
let queue: ConcurrentQueue;
let redisHost: string;
let redisPort: number;

describe('ConcurrentQueue', () => {
  beforeAll(async () => {
    redisHost = '127.0.0.1';
    redisPort = 6379;
  });

  it('should initialize queue', async () => {
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

    queue = ConcurrentQueue.of('test', {
      withKey: () => 'test',
    });

    const result = await queue.on(decorated)();

    expect(result).toBe('OK');
  });

  it('should reject on max attempts exceeded', async () => {
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
      await setTimeout(1000);
      return 'OK';
    });

    queue = ConcurrentQueue.of('test', {
      withKey: () => 'test',
      maxAttempts: 3,
      backoff: 200,
    });

    const locked = queue.on(decorated);

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

  it('should allow execution after queue item expiration', async () => {
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
      await setTimeout(100);
      return 'OK';
    });

    queue = ConcurrentQueue.of('test', {
      withKey: () => 'test',
      maxAttempts: 5,
      backoff: 200,
    });

    const locked = queue.on(decorated);

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
      await setTimeout(100);
      return 'OK';
    });

    const lock1 = ConcurrentQueue.of('test', {
      withKey: () => 'test',
      maxAttempts: 5,
      backoff: 200,
    });

    const lock2 = ConcurrentQueue.of('test-2', {
      withKey: () => 'test-2',
      maxAttempts: 5,
      backoff: 200,
    });

    const locked1 = lock1.on(decorated);
    const locked2 = lock2.on(decorated);

    const result = await Promise.allSettled([locked1(), locked2()]);

    const success = result.filter((r) => r.status === 'fulfilled').length;
    const error = result.filter((r) => r.status === 'rejected').length;

    expect(success).toBe(2);
    expect(error).toBe(0);
  });
});
