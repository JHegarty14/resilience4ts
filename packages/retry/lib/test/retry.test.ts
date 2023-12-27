import { ResilienceProviderService } from '@forts/resilience4ts-core';
import { Retry } from '../retry';

import { RedisMemoryServer } from 'redis-memory-server';
import { ScheduledRetry } from '../internal/scheduled-retry';
import { sleep } from '@forts/resilience4ts-core';
import { KeyBuilder } from '../internal';
import { FailedWithScheduledRetryException } from '../exceptions';

jest.setTimeout(60000);

let svc: ResilienceProviderService;
let retry: Retry;
let redisServer: RedisMemoryServer;
let redisHost: string;
let redisPort: number;

describe('Retry', () => {
  beforeAll(async () => {
    redisServer = new RedisMemoryServer();
    redisHost = await redisServer.getHost();
    redisPort = await redisServer.getPort();
  });

  afterAll(async () => {
    await redisServer.stop();
  });

  it('should initialize retry', async () => {
    svc = ResilienceProviderService.forRoot({
      resilience: {
        serviceName: 'r4t-test',
      },
      redis: {
        redisHost,
        redisPort,
        redisPrefix: 'r4t-test',
      },
      scheduler: {
        defaultInterval: 1000,
        recoveryInterval: 1000,
        runConsumer: true,
      },
    });
    await svc.start();
    const listener = jest.fn();
    svc.emitter.addListener('r4t-retry-ready', listener);

    const decorated: () => Promise<'OK'> = jest.fn().mockResolvedValue('OK');

    retry = Retry.of('test', {
      maxAttempts: 3,
    });

    const result = await retry.on(decorated)();

    expect(listener).toHaveBeenCalledTimes(1);

    expect(result).toBe('OK');
  });

  it('should retry on error', async () => {
    svc = ResilienceProviderService.forRoot({
      resilience: {
        serviceName: 'r4t-test',
      },
      redis: {
        redisHost,
        redisPort,
        redisPrefix: 'r4t-test',
      },
      scheduler: {
        defaultInterval: 1000,
        recoveryInterval: 1000,
        runConsumer: true,
      },
    });
    await svc.start();

    const decorated = jest.fn().mockRejectedValueOnce(new Error('test')).mockResolvedValue('OK');

    retry = Retry.of('test', {
      maxAttempts: 3,
      maxInterval: 1000,
    });

    const result = await retry.on(decorated)();

    expect(result).toBe('OK');

    expect(decorated).toBeCalledTimes(2);
  });

  it('should schedule retry if time is provided', async () => {
    svc = ResilienceProviderService.forRoot({
      resilience: {
        serviceName: 'r4t-test',
      },
      redis: {
        redisHost,
        redisPort,
        redisPrefix: 'r4t-test',
      },
      scheduler: {
        defaultInterval: 1000,
        recoveryInterval: 1000,
        runConsumer: true,
      },
    });
    await svc.start();

    const decorated = jest.fn().mockRejectedValueOnce(new Error('test')).mockResolvedValue('OK');

    retry = Retry.of('test', {
      maxAttempts: 3,
      maxInterval: 1000,
    });

    try {
      await retry.on(decorated, new Date(Date.now() + 10000))();
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(FailedWithScheduledRetryException);
      expect((e as FailedWithScheduledRetryException<any>).retryContext).toBeInstanceOf(
        ScheduledRetry
      );
    }
  });

  it('should schedule consume retry', async () => {
    svc = ResilienceProviderService.forRoot({
      resilience: {
        serviceName: 'r4t-test',
      },
      redis: {
        redisHost,
        redisPort,
        redisPrefix: 'r4t-test',
      },
      scheduler: {
        defaultInterval: 1000,
        recoveryInterval: 1000,
        runConsumer: true,
      },
    });
    await svc.start();

    const taskName = 'test';
    const r4tTaskName = KeyBuilder.retryEventKey(taskName);

    const listener = jest.fn();
    svc.scheduler.addListener(r4tTaskName, listener);

    const decorated = jest.fn().mockRejectedValueOnce(new Error('test')).mockResolvedValue('OK');

    retry = Retry.of(taskName, {
      maxAttempts: 3,
      maxInterval: 1000,
    });

    try {
      await retry.on(decorated, new Date(Date.now() + 1000))();
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(FailedWithScheduledRetryException);
      expect((e as FailedWithScheduledRetryException<any>).retryContext).toBeInstanceOf(
        ScheduledRetry
      );
    }

    await sleep(5000);

    expect(listener).toHaveBeenCalledWith({
      _type: 'run_at',
      attempts: 0,
      maxAttempts: 3,
      runAt: expect.any(Number),
      taskName: r4tTaskName,
      data: {
        attempts: 0,
        data: [],
        taskUid: 'test-ec784925b52067bce01fd820f554a34a',
      },
    });
  });
});
