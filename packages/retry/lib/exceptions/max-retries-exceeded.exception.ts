import { RetryException } from '../types';

export class MaxRetriesExceeded extends Error {
  constructor(message?: string, cause?: RetryException | Error) {
    super(message, { cause });
  }
}
