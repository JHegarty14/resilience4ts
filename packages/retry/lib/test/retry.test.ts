import { ResilienceProviderService, sleep } from '@forts/resilience4ts-core';
import { Retry } from '../retry';
import { RetryStrategy } from '../types';

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

    retry = Retry.of('test-1', {
      maxAttempts: 3,
    });

    const result = await retry.on(decorated)();

    expect(listener).toHaveBeenCalledTimes(1);

    expect(result).toBe('OK');
  });

  it('should retry on error', async () => {
    const decorated = jest.fn().mockRejectedValueOnce(new Error('test')).mockResolvedValue('OK');

    retry = Retry.of('test-2', {
      maxAttempts: 3,
      maxInterval: 1000,
    });

    const result = await retry.on(decorated)();

    expect(result).toBe('OK');

    expect(decorated).toBeCalledTimes(2);
  });

  it('onBound - should initialize retry', async () => {
    const listener = jest.fn();
    svc.emitter.addListener('r4t-retry-ready', listener);

    const decorated: () => Promise<'OK'> = jest.fn().mockResolvedValue('OK');

    retry = Retry.of('test-1', {
      maxAttempts: 3,
    });

    const self = {};

    const result = await retry.onBound(decorated, self)();

    expect(listener).toHaveBeenCalledTimes(1);

    expect(result).toBe('OK');
  });

  it('onBound - should retry on error', async () => {
    const decorated = jest.fn().mockRejectedValueOnce(new Error('test')).mockResolvedValue('OK');

    retry = Retry.of('test-2', {
      maxAttempts: 3,
      maxInterval: 1000,
    });

    const self = {};

    const result = await retry.onBound(decorated, self)();

    expect(result).toBe('OK');

    expect(decorated).toBeCalledTimes(2);
  });

  it('should initialize retry with budgeted mode', async () => {
    const listener = jest.fn();
    svc.emitter.addListener('r4t-retry-ready', listener);

    const decorated: () => Promise<'OK'> = jest.fn().mockResolvedValue('OK');

    retry = Retry.of('test-budgeted-1', {
      maxAttempts: 3,
      wait: 1000,
      retryStrategy: RetryStrategy.Budgeted,
      windowBudget: 5,
      windowSize: 60000
    });

    const result = await retry.on(decorated)();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(result).toBe('OK');
  });

  it('should throw error when retry budget is exhausted', async () => {
    const decorated = jest.fn().mockRejectedValue(new Error('test'));

    retry = Retry.of('test-budgeted-2', {
      maxAttempts: 5,
      wait: 50,
      retryStrategy: RetryStrategy.Budgeted,
      windowBudget: 2,
      windowSize: 10000,
    });

    await expect(retry.on(decorated)()).rejects.toThrow('Retry budget exhausted for test-budgeted-2');
    expect(decorated).toBeCalledTimes(2);
  })

  it('should retry within budget', async () => {
    const decorated = jest.fn().mockRejectedValueOnce(new Error('test')).mockResolvedValue('OK');
  
    retry = Retry.of('test-budgeted-3', {
      maxAttempts: 3,
      wait: 1000,
      retryStrategy: RetryStrategy.Budgeted,
      windowBudget: 500,
      windowSize: 60000
    });
    const result = await retry.on(decorated)();
    expect(result).toBe('OK');
    expect(decorated).toBeCalledTimes(2);
  });

  it('should retry successfully after window expires', async () => {
    const decorated = jest.fn().mockRejectedValueOnce(new Error('test')).mockResolvedValue('OK');

    retry = Retry.of('test-budgeted-4', {
      maxAttempts: 3,
      wait: 50,
      retryStrategy: RetryStrategy.Budgeted,
      windowBudget: 1,
      windowSize: 2000,
    });

    await expect(retry.on(decorated)()).rejects.toThrow('Retry budget exhausted for test-budgeted-4');
    expect(decorated).toHaveBeenCalledTimes(1);

    await sleep(2500);

    const result = await retry.on(decorated)();
    expect(result).toBe('OK');
    expect(decorated).toHaveBeenCalledTimes(2);
  })
});
