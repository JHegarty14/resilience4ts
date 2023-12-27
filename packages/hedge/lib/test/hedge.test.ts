import { ResilienceProviderService } from '@forts/resilience4ts-core';
import { Hedge } from '../hedge';

import { RedisMemoryServer } from 'redis-memory-server';
import { setTimeout } from 'timers/promises';

jest.setTimeout(60000);

let svc: ResilienceProviderService;
let hedge: Hedge;
let redisServer: RedisMemoryServer;
let redisHost: string;
let redisPort: number;

describe('Hedge', () => {
  beforeAll(async () => {
    redisServer = new RedisMemoryServer();
    redisHost = await redisServer.getHost();
    redisPort = await redisServer.getPort();
  });

  afterAll(async () => {
    await redisServer.stop();
  });

  it('should initialize hedge', async () => {
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
    svc.emitter.addListener('r4t-hedge-ready', listener);

    const decorated = jest.fn().mockResolvedValue('OK');

    hedge = Hedge.of('test', {
      delay: 1000,
    });

    const result = await hedge.on(decorated)();

    expect(listener).toHaveBeenCalledTimes(1);

    expect(result).toBe('OK');
  });

  it('should hedge', async () => {
    const decorated = jest
      .fn()
      .mockImplementationOnce(async () => {
        await setTimeout(2000);
        return 'OK';
      })
      .mockResolvedValue('HEDGED');

    hedge = Hedge.of('test', {
      delay: 1000,
    });

    const result = await hedge.on(decorated)();

    expect(decorated).toHaveBeenCalledTimes(2);

    expect(result).toBe('HEDGED');
  });

  it('should hedge with custom action generator', async () => {
    const decorated = jest.fn().mockImplementationOnce(async () => {
      await setTimeout(2000);
      return 'OK';
    });

    const actionGenerator = jest.fn().mockResolvedValue('ACTION RESULT');

    hedge = Hedge.of('test', {
      delay: 1000,
      actionGenerator,
    });

    const result = await hedge.on(decorated)();

    expect(decorated).toHaveBeenCalledTimes(1);

    expect(result).toBe('ACTION RESULT');
  });

  it('should hedge with maxHedgedAttempts', async () => {
    const decorated = jest
      .fn()
      .mockImplementationOnce(async () => {
        await setTimeout(2000);
        return 'OK';
      })
      .mockImplementationOnce(async () => {
        await setTimeout(1500);
        return 'HEDGED 1';
      })
      .mockResolvedValue('HEDGED 2');

    hedge = Hedge.of('test', {
      delay: 1000,
      maxHedgedAttempts: 3,
    });

    const result = await hedge.on(decorated)();

    expect(decorated).toHaveBeenCalledTimes(4);

    expect(result).toBe('HEDGED 2');
  });
});
