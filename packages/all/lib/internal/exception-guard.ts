import { BulkheadFullException } from '@forts/resilience4ts-bulkhead';
import { CircuitOpenException } from '@forts/resilience4ts-circuit-breaker';
import { OperationCancelledException } from '@forts/resilience4ts-core';
import { RateLimitViolationException } from '@forts/resilience4ts-rate-limiter';
import { TimeoutExceededException } from '@forts/resilience4ts-timeout';

export class ExceptionGuard {
  static isTimeoutExceptionVariant(e: unknown) {
    return e instanceof TimeoutExceededException;
  }

  static isCancelledOpExceptionVariant(e: unknown) {
    return e instanceof OperationCancelledException;
  }

  static isNotPermittedExceptionVariant(e: unknown) {
    return (
      e instanceof CircuitOpenException ||
      e instanceof BulkheadFullException ||
      e instanceof RateLimitViolationException
    );
  }
}
