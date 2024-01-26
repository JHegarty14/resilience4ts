import {
  Json,
  OperationCancelledException,
  PredicateBuilder,
  ResilienceProviderService,
} from '@forts/resilience4ts-core';
import { Fallback } from '../fallback';

jest.setTimeout(10000);

let svc: ResilienceProviderService;
let fallback: Fallback<Json>;
let redisHost: string;
let redisPort: number;

describe('Fallback', () => {
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
        redisPassword: '',
        redisUser: '',
        redisPrefix: 'r4t-test',
      },
    });
    await svc.start();
  });

  it('should initialize fallback', async () => {
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

  it('onBound - should initialize fallback', async () => {
    const listener = jest.fn();
    svc.emitter.addListener('r4t-fallback-ready', listener);

    const decorated = jest.fn().mockResolvedValue('OK');

    fallback = Fallback.of('test', {
      fallbackAction: async () => 'falling back',
    });

    const self = {};

    const result = await fallback.onBound(decorated, self)();

    expect(listener).toHaveBeenCalledTimes(1);

    expect(result).toBe('OK');
  });

  it('onBound - should use fallback action on error', async () => {
    const decorated = jest.fn().mockRejectedValue('ERR');

    fallback = Fallback.of('test', {
      fallbackAction: async () => 'falling back',
      shouldHandle: new PredicateBuilder((value: string) => value === 'ERR').or(
        OperationCancelledException,
      ),
    });

    const self = {};

    try {
      await fallback.onBound(decorated, self)();
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(Error);
    }
  });

  it('onBound - should return error if rejected value does not match shouldHandle predicate', async () => {
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

    const decorated = jest.fn().mockRejectedValue('ERR');

    fallback = Fallback.of('test', {
      fallbackAction: async () => 'falling back',
    });

    const self = {};

    try {
      await fallback.onBound(decorated, self)();
    } catch (err: unknown) {
      expect(err).toEqual('ERR');
    }
  });
});
