import { BaseResilienceException } from './base-resilience.exception';

export class OperationCancelledException extends BaseResilienceException {
  constructor(message?: string) {
    super('OperationCancelledException', message || 'Operation cancelled');
  }
}
