import { RetryException } from '../types';

export class RetryBudgetExhausted extends Error {
  constructor(name: string, cause?: RetryException) {
    super(`Retry budget exhausted for ${name}`, { cause });
  }
}
