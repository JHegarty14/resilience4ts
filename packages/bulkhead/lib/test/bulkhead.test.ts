import { ResilienceProviderService, Stopwatch } from '@forts/resilience4ts-core';
import { Bulkhead } from '../bulkhead';

import { RedisMemoryServer } from 'redis-memory-server';
import { setTimeout } from 'timers/promises';
import crypto from 'node:crypto';
import { Result } from 'oxide.ts/dist';
import { BulkheadException } from '../types';

jest.setTimeout(60000);

let svc: ResilienceProviderService;
let bulkhead: Bulkhead;
let redisServer: RedisMemoryServer;
let redisHost: string;
let redisPort: number;

describe('Bulkhead', () => {
  beforeAll(async () => {
    redisServer = new RedisMemoryServer();
    redisHost = await redisServer.getHost();
    redisPort = await redisServer.getPort();
  });

  it('should initialize bulkhead', async () => {
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
      bulkhead: {
        name: 'test',
        getUniqueId: () => 'bulkhead_uid',
      },
    } as any);
    await svc.start();
    const listener = jest.fn();
    svc.emitter.addListener('r4t-bulkhead-ready', listener);

    const decorated = jest.fn().mockResolvedValue('OK');

    bulkhead = Bulkhead.of('test', {
      name: 'test',
      getUniqueId: () => 'bulkhead_uid',
    });

    const decoratedBulkhead = bulkhead.on(decorated);

    const result = await decoratedBulkhead();

    expect(listener).toHaveBeenCalledTimes(1);

    expect(result).toBe('OK');
  });

  it('should not allow more than the default max concurrent requests (10)', async () => {
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
      await setTimeout(3000);
      return 'OK';
    });

    bulkhead = Bulkhead.of('test', {
      name: 'test',
      maxWait: 1000,
      getUniqueId: () => crypto.randomUUID(),
    });

    const decoratedBulkhead = bulkhead.on(decorated);

    const result = await Promise.allSettled([
      decoratedBulkhead(),
      decoratedBulkhead(),
      decoratedBulkhead(),
      decoratedBulkhead(),
      decoratedBulkhead(),
      decoratedBulkhead(),
      decoratedBulkhead(),
      decoratedBulkhead(),
      decoratedBulkhead(),
      decoratedBulkhead(),
      decoratedBulkhead(),
    ]);

    const resolved = result.filter(
      (r) => r.status === 'fulfilled'
    ) as PromiseFulfilledResult<string>[];
    const rejected = result.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    expect(resolved.length).toBe(10);

    const success = resolved.length;
    const failed = rejected.length;

    expect(success).toBe(10);
    expect(failed).toBe(1);
  });

  it('should not allow more than the configured max concurrent requests', async () => {
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
      await setTimeout(3000);
      return 'OK';
    });

    bulkhead = Bulkhead.of('test', {
      name: 'test',
      maxWait: 1000,
      maxConcurrent: 5,
      getUniqueId: () => crypto.randomUUID(),
    });

    const decoratedBulkhead = bulkhead.on(decorated);

    const result = await Promise.allSettled([
      decoratedBulkhead(),
      decoratedBulkhead(),
      decoratedBulkhead(),
      decoratedBulkhead(),
      decoratedBulkhead(),
      decoratedBulkhead(),
      decoratedBulkhead(),
      decoratedBulkhead(),
      decoratedBulkhead(),
      decoratedBulkhead(),
      decoratedBulkhead(),
    ]);

    const resolved = result.filter(
      (r) => r.status === 'fulfilled'
    ) as PromiseFulfilledResult<string>[];
    const rejected = result.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    expect(resolved.length).toBe(5);

    const success = resolved.length;
    const failed = rejected.length;

    expect(success).toBe(5);
    expect(failed).toBe(6);
  });

  it('should create Bulkhead from defaults', async () => {
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
      bulkhead: {
        name: 'test',
        getUniqueId: () => 'bulkhead_uid',
      },
    } as any);
    await svc.start();
    const listener = jest.fn();
    svc.emitter.addListener('r4t-bulkhead-ready', listener);

    const decorated = jest.fn().mockResolvedValue('OK');

    bulkhead = Bulkhead.ofDefaults('test');

    const decoratedBulkhead = bulkhead.on(decorated);

    const result = await decoratedBulkhead();

    expect(listener).toHaveBeenCalledTimes(1);

    expect(result).toBe('OK');
  });
});
