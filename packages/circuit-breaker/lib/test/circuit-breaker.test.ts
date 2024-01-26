import { ResilienceProviderService } from '@forts/resilience4ts-core';
import { setTimeout } from 'node:timers/promises';

import { CircuitBreaker } from '../circuit-breaker';
import { CircuitBreakerStrategy } from '../types';

jest.setTimeout(60000);

let svc: ResilienceProviderService;
let circuit: CircuitBreaker;
let redisHost: string;
let redisPort: number;

describe('CircuitBreaker', () => {
  beforeAll(async () => {
    redisHost = '127.0.0.1';
    redisPort = 6379;
  });

  it('should initialize CircuitBreaker', async () => {
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

    const decorated = jest.fn().mockResolvedValue('OK');

    circuit = CircuitBreaker.of('test', {
      strategy: CircuitBreakerStrategy.Percentage,
      threshold: 0.5,
    });

    const decoratedCircuit = circuit.on(decorated);

    const result = await decoratedCircuit();

    expect(result).toBe('OK');
  });

  it('should close the CircuitBreaker once the threshold is breached', async () => {
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

    const decorated = jest
      .fn()
      .mockResolvedValueOnce('OK')
      .mockResolvedValueOnce('OK')
      .mockResolvedValueOnce('OK')
      .mockRejectedValueOnce('NOK')
      .mockRejectedValueOnce('NOK')
      .mockRejectedValueOnce('NOK')
      .mockRejectedValueOnce('NOK')
      .mockResolvedValueOnce('OK')
      .mockRejectedValueOnce('NOK')
      .mockResolvedValueOnce('NOK')
      .mockImplementationOnce(async () => {
        await setTimeout(8000);
        return 'OK';
      })
      .mockResolvedValueOnce('OK')
      .mockResolvedValueOnce('OK')
      .mockResolvedValueOnce('OK')
      .mockResolvedValueOnce('OK')
      .mockResolvedValueOnce('OK');

    circuit = CircuitBreaker.of('test', {
      strategy: CircuitBreakerStrategy.Percentage,
      threshold: 0.5,
      minimumFailures: 5,
      interval: 1000,
      halfOpenLimit: 1,
    });

    const decoratedCircuit = circuit.on(decorated);

    await Promise.allSettled([
      decoratedCircuit(1),
      decoratedCircuit(2),
      decoratedCircuit(3),
      decoratedCircuit(4),
      decoratedCircuit(5),
    ]);
    await Promise.allSettled([
      decoratedCircuit(6),
      decoratedCircuit(7),
      decoratedCircuit(8),
      decoratedCircuit(9),
      decoratedCircuit(10),
    ]);
    await Promise.allSettled([
      decoratedCircuit(11),
      decoratedCircuit(12),
      decoratedCircuit(13),
      decoratedCircuit(14),
      decoratedCircuit(15),
      decoratedCircuit(16),
      decoratedCircuit(17),
      decoratedCircuit(18),
      decoratedCircuit(19),
      decoratedCircuit(20),
      decoratedCircuit(21),
      decoratedCircuit(22),
      decoratedCircuit(23),
      decoratedCircuit(24),
      decoratedCircuit(25),
      decoratedCircuit(26),
    ]);

    await setTimeout(3000);
    await Promise.allSettled([decoratedCircuit(27)]);

    await Promise.allSettled([
      decoratedCircuit(28),
      decoratedCircuit(29),
      decoratedCircuit(30),
      decoratedCircuit(31),
    ]);

    await setTimeout(3000);

    const lastTest = await decoratedCircuit(32);

    expect(lastTest).toBe('OK');
  });

  it('onBound - should initialize CircuitBreaker', async () => {
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

    const decorated = jest.fn().mockResolvedValue('OK');

    circuit = CircuitBreaker.of('test', {
      strategy: CircuitBreakerStrategy.Percentage,
      threshold: 0.5,
    });

    const self = {};

    const decoratedCircuit = circuit.onBound(decorated, self);

    const result = await decoratedCircuit();

    expect(result).toBe('OK');
  });

  it('onBound - should close the CircuitBreaker once the threshold is breached', async () => {
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

    const decorated = jest
      .fn()
      .mockResolvedValueOnce('OK')
      .mockResolvedValueOnce('OK')
      .mockResolvedValueOnce('OK')
      .mockRejectedValueOnce('NOK')
      .mockRejectedValueOnce('NOK')
      .mockRejectedValueOnce('NOK')
      .mockRejectedValueOnce('NOK')
      .mockResolvedValueOnce('OK')
      .mockRejectedValueOnce('NOK')
      .mockResolvedValueOnce('NOK')
      .mockImplementationOnce(async () => {
        await setTimeout(8000);
        return 'OK';
      })
      .mockResolvedValueOnce('OK')
      .mockResolvedValueOnce('OK')
      .mockResolvedValueOnce('OK')
      .mockResolvedValueOnce('OK')
      .mockResolvedValueOnce('OK');

    circuit = CircuitBreaker.of('test', {
      strategy: CircuitBreakerStrategy.Percentage,
      threshold: 0.5,
      minimumFailures: 5,
      interval: 1000,
      halfOpenLimit: 1,
    });

    const self = {};

    const decoratedCircuit = circuit.onBound(decorated, self);

    await Promise.allSettled([
      decoratedCircuit(1),
      decoratedCircuit(2),
      decoratedCircuit(3),
      decoratedCircuit(4),
      decoratedCircuit(5),
    ]);
    await Promise.allSettled([
      decoratedCircuit(6),
      decoratedCircuit(7),
      decoratedCircuit(8),
      decoratedCircuit(9),
      decoratedCircuit(10),
    ]);
    await Promise.allSettled([
      decoratedCircuit(11),
      decoratedCircuit(12),
      decoratedCircuit(13),
      decoratedCircuit(14),
      decoratedCircuit(15),
      decoratedCircuit(16),
      decoratedCircuit(17),
      decoratedCircuit(18),
      decoratedCircuit(19),
      decoratedCircuit(20),
      decoratedCircuit(21),
      decoratedCircuit(22),
      decoratedCircuit(23),
      decoratedCircuit(24),
      decoratedCircuit(25),
      decoratedCircuit(26),
    ]);

    await setTimeout(3000);
    await Promise.allSettled([decoratedCircuit(27)]);

    await Promise.allSettled([
      decoratedCircuit(28),
      decoratedCircuit(29),
      decoratedCircuit(30),
      decoratedCircuit(31),
    ]);

    await setTimeout(3000);

    const lastTest = await decoratedCircuit(32);

    expect(lastTest).toBe('OK');
  });
});
