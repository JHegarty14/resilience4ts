import {
  Json,
  OperationCancelledException,
  PredicateBuilder,
  ResilienceProviderService,
} from '@forts/resilience4ts-core';
import { Fallback } from '../fallback';

import { RedisMemoryServer } from 'redis-memory-server';

jest.setTimeout(60000);

let svc: ResilienceProviderService;
let fallback: Fallback<Json>;
let redisServer: RedisMemoryServer;
let redisHost: string;
let redisPort: number;

describe('Fallback', () => {
  beforeAll(async () => {
    redisServer = new RedisMemoryServer();
    redisHost = await redisServer.getHost();
    redisPort = await redisServer.getPort();
  });

  afterAll(async () => {
    await redisServer.stop();
  });

  it('should initialize fallback', async () => {
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
    const listener = jest.fn();
    svc.emitter.addListener('r4t-fallback-ready', listener);

    const decorated = jest.fn().mockResolvedValue('OK');

    fallback = Fallback.of('test', {
      fallbackAction: async () => 'falling back',
    });

    const result = await fallback.on(decorated)();

    expect(listener).toHaveBeenCalledTimes(1);

    expect(result).toBe('OK');
  });

  it('should use fallback action on error', async () => {
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

    const decorated = jest.fn().mockRejectedValue('ERR');

    fallback = Fallback.of('test', {
      fallbackAction: async () => 'falling back',
      shouldHandle: new PredicateBuilder((value: string) => value === 'ERR').or(
        OperationCancelledException,
      ),
    });

    try {
      await fallback.on(decorated)();
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(Error);
    }
  });

  it('should return error if rejected value does not match shouldHandle predicate', async () => {
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

    const decorated = jest.fn().mockRejectedValue('ERR');

    fallback = Fallback.of('test', {
      fallbackAction: async () => 'falling back',
    });

    try {
      await fallback.on(decorated)();
    } catch (err: unknown) {
      expect(err).toEqual('ERR');
    }
  });
});
