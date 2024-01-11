import { ResilienceProviderService } from '@forts/resilience4ts-core';
import { Retry } from '../retry';

jest.setTimeout(10000);

let svc: ResilienceProviderService;
let retry: Retry;
let redisHost: string;
let redisPort: number;

describe('Retry', () => {
  beforeAll(async () => {
    redisHost = '127.0.0.1';
    redisPort = 6379;
    svc = ResilienceProviderService.forRoot({
      resilience: {
        serviceName: 'r4t-test',
      },
      redis: {
        redisHost,
        redisPort,
        redisPrefix: 'r4t-test',
      },
    });
    await svc.start();
  });

  it('should initialize retry', async () => {
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
    const decorated = jest.fn().mockRejectedValueOnce(new Error('test')).mockResolvedValue('OK');

    retry = Retry.of('test', {
      maxAttempts: 3,
      maxInterval: 1000,
    });

    const result = await retry.on(decorated)();

    expect(result).toBe('OK');

    expect(decorated).toBeCalledTimes(2);
  });
});
