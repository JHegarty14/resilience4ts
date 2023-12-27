import { assertUnreachable } from '@forts/resilience4ts-core';
import { setTimeout } from 'timers/promises';
import { InvalidBackoffException } from './exceptions';
import { RetryBackoff } from './types';

const MAX_DURATION = 60 * 60 * 1000;

export class Backoff {
  static async wait(strategy: RetryBackoff, attempt: number, maxAttempts: number, delay: number) {
    let backoff: number;
    switch (strategy) {
      case RetryBackoff.Linear:
        backoff = delay + attempt * delay;
        break;
      case RetryBackoff.Exponential:
        backoff = delay * 2 ** attempt;
        break;
      case RetryBackoff.Jitter:
        backoff = delay + Math.random() * attempt * delay;
        break;
      case RetryBackoff.Constant:
        backoff = delay;
        break;
      case RetryBackoff.Immediate:
        backoff = 0;
        break;
      case RetryBackoff.Scheduled:
        backoff = -1;
        break;
      default:
        assertUnreachable(strategy);
    }

    Backoff.validate(strategy, maxAttempts, delay, backoff);

    await setTimeout(backoff);
  }

  private static validate(
    strategy: RetryBackoff,
    maxAttempts: number,
    interval: number,
    wait: number
  ) {
    const calculatedMax = Array(maxAttempts)
      .fill(interval)
      .reduce<number>((acc, curr, idx) => acc + curr * (idx + 1), 0);
    const max = Math.min(calculatedMax, MAX_DURATION);

    if (wait <= 0 && strategy !== RetryBackoff.Immediate && strategy !== RetryBackoff.Scheduled) {
      throw new InvalidBackoffException(wait, strategy);
    }

    if (wait > max) {
      throw new InvalidBackoffException(wait, strategy);
    }
  }
}
