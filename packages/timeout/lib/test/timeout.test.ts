import { OperationCancelledException, ResilienceProviderService } from '@forts/resilience4ts-core';
import { Timeout } from '../timeout';

import { RedisMemoryServer } from 'redis-memory-server';
import { setTimeout } from 'timers/promises';
import { TimeoutExceededException } from '../exceptions';

jest.setTimeout(60000);

let svc: ResilienceProviderService;
let timeout: Timeout;
let redisServer: RedisMemoryServer;
let redisHost: string;
let redisPort: number;

describe('Timeout', () => {
  beforeAll(async () => {
    redisServer = new RedisMemoryServer();
    redisHost = await redisServer.getHost();
    redisPort = await redisServer.getPort();
  });

  afterAll(async () => {
    await redisServer.stop();
  });

  it('should initialize timeout', async () => {
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
    svc.emitter.addListener('r4t-timeout-ready', listener);

    const decorated: () => Promise<'OK'> = jest.fn().mockResolvedValue('OK');

    timeout = Timeout.of('test', {
      timeout: 1000,
    });

    const result = await timeout.on(decorated)();

    expect(result).toBe('OK');
  });

  it('should timeout according to specified interval', async () => {
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
    svc.emitter.addListener('r4t-timeout-ready', listener);

    const decorated = jest.fn().mockImplementation(async () => {
      await setTimeout(2000);
      return 'OK';
    }) as jest.Mock<Promise<'OK'>, unknown[]>;

    timeout = Timeout.of('test', {
      timeout: 1000,
    });

    try {
      await timeout.on(decorated)();
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(TimeoutExceededException);
    }
  });

  it('should use passed signal to cancel the operation', async () => {
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

    const signalSpy = jest.fn();

    timeout = Timeout.of('test', {
      timeout: 1000,
    });

    try {
      await timeout.on(decorated, {
        signal: {
          onabort: signalSpy,
          aborted: true,
          reason: '',
          throwIfAborted: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        },
      })();
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(OperationCancelledException);
      expect((e as OperationCancelledException).message).toEqual('Operation aborted: test');
    }
  });
});
