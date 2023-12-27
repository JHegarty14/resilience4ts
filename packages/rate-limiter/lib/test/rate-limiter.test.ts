import { ResilienceProviderService } from '@forts/resilience4ts-core';
import { RateLimiter } from '../rate-limiter';

import { RedisMemoryServer } from 'redis-memory-server';
import { RateLimitViolationException } from '../exceptions';
import { RateLimiterScope } from '../types';
import { Ok } from 'oxide.ts';

jest.setTimeout(60000);

let svc: ResilienceProviderService;
let rateLimiter: RateLimiter;
let redisServer: RedisMemoryServer;
let redisHost: string;
let redisPort: number;

describe('RateLimiter', () => {
  beforeAll(async () => {
    redisServer = new RedisMemoryServer();
    redisHost = await redisServer.getHost();
    redisPort = await redisServer.getPort();
  });

  afterAll(async () => {
    await redisServer.stop();
  });

  it('should initialize rate limiter', async () => {
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

    const decorated = jest.fn().mockResolvedValue('OK');

    rateLimiter = RateLimiter.of('test', {
      permitLimit: 1,
      window: 1000,
      scope: RateLimiterScope.Global,
    });

    const result = await rateLimiter.on(decorated)();

    expect(result).toBe('OK');
  });

  it('should enforce provided rate limit', async () => {
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

    const decorated = jest.fn().mockResolvedValue('OK');

    rateLimiter = RateLimiter.of('test-2', {
      permitLimit: 1,
      window: 1000,
      scope: RateLimiterScope.Global,
    });

    const rateLimited = rateLimiter.on(decorated);

    const result = await Promise.allSettled([rateLimited(), rateLimited(), rateLimited()]);

    const allowed = result.filter((r) => r.status === 'fulfilled');
    const rejected = result.filter((r) => r.status === 'rejected');

    expect(allowed).toHaveLength(1);
    expect(rejected).toHaveLength(2);
  });

  it('should differentiate between scopes', async () => {
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

    const globalDecorated = jest.fn().mockResolvedValue('OK - GLOBAL');
    const clientDecorated = jest.fn().mockResolvedValue('OK - CLIENT');

    const globalLimiter = RateLimiter.of('test-3', {
      permitLimit: 5,
      window: 1000,
      scope: RateLimiterScope.Global,
    });

    const clientLimiter = RateLimiter.of('test-3', {
      permitLimit: 1,
      window: 2000,
      scope: RateLimiterScope.Client,
      requestIdentifier: () => 'same-client',
    });

    const globalLimited = globalLimiter.on(globalDecorated);
    const clientLimited = clientLimiter.on(clientDecorated);

    const result = await Promise.allSettled([
      globalLimited(),
      globalLimited(),
      globalLimited(),
      clientLimited(),
      clientLimited(),
      clientLimited(),
    ]);

    const allowed = result.filter((r) => r.status === 'fulfilled');
    const rejected = result.filter((r) => r.status === 'rejected');

    expect(allowed).toHaveLength(4);
    expect(rejected).toHaveLength(2);

    const globalResults = allowed.filter(
      (r) => (r as PromiseFulfilledResult<string>).value === 'OK - GLOBAL'
    );
    const reasons = rejected.map((r) => (r as PromiseRejectedResult).reason);

    expect(globalResults).toHaveLength(3);
    expect(reasons.every((r) => r instanceof RateLimitViolationException)).toBe(true);
  });
});
