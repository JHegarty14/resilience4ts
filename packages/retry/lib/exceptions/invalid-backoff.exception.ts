import { RetryBackoff } from '../types';

export class InvalidBackoffException extends Error {
  readonly name = 'InvalidBackoffException';
  constructor(backoff: number, strategy: RetryBackoff) {
    super(`Invalid backoff value ${backoff} for selected strategy: ${strategy}`);
  }
}
