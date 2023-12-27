import { RedisMemoryServer } from 'redis-memory-server';

import { ResilienceProviderService } from '../';
import { ResilienceConfig } from '../types';

jest.setTimeout(60000);

let svc: ResilienceProviderService;
let redisServer: RedisMemoryServer;
let redisHost: string;
let redisPort: number;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('ResilienceProviderService', () => {
  beforeAll(async () => {
    redisServer = new RedisMemoryServer();
    redisHost = await redisServer.getHost();
    redisPort = await redisServer.getPort();
  });

  afterAll(async () => {
    await redisServer.stop();
  });

  it('should initialize ResilienceProviderService', async () => {
    const config: ResilienceConfig = {
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
    };

    svc = ResilienceProviderService.forRoot(config);
    await svc.start();

    expect(svc.cache).toBeDefined();
    expect(svc.scheduler).toBeDefined();

    const listener = jest.fn();

    svc.scheduler.addListener('test', listener);
    await svc.scheduler.schedule(1000, ['test'], {
      taskName: 'test',
      data: {
        args: ['hello', 'world'],
      },
    });

    await sleep(5000);

    expect(listener).toBeCalledTimes(1);
  });
});
