import { ArgumentsHost, RpcExceptionFilter } from '@nestjs/common/interfaces';
import { RpcExceptionFilterMetadata } from '@nestjs/common/interfaces/exceptions';
import { selectExceptionFilterMetadata } from '@nestjs/common/utils/select-exception-filter-metadata.util';
import { isObject } from '@nestjs/common/utils/shared.utils';
import { InvalidExceptionFilterException } from '@nestjs/core/errors/exceptions/invalid-exception-filter.exception';
import { Observable, throwError } from 'rxjs';
import { isEmpty } from '@forts/resilience4ts-core/lib/util';
import { MESSAGES } from '@nestjs/core/constants';
import { Logger } from '@nestjs/common';
import { BaseResilienceException } from '@forts/resilience4ts-core';

export class ExceptionHandler implements RpcExceptionFilter {
  private filters: RpcExceptionFilterMetadata[] = [];

  private static readonly logger = new Logger('ResilienceExceptionsHandler');

  catch(exception: Error | any) {
    const status = 'error';
    if (!(exception instanceof BaseResilienceException)) {
      return this.handleUnknownError(exception, status);
    }
    const res = exception.cause;
    const message = isObject(res) ? res : { status, message: res };
    return throwError(() => message);
  }

  handle(exception: Error | any, host: ArgumentsHost): Observable<any> {
    const filterResult$ = this.invokeCustomFilters(exception, host);
    if (filterResult$) {
      return filterResult$;
    }

    return this.catch(exception);
  }

  handleUnknownError<T>(exception: T, status: string) {
    const errorMessage = MESSAGES.UNKNOWN_EXCEPTION_MESSAGE;

    const loggerArgs = this.isError(exception) ? [exception.message, exception.stack] : [exception];
    const logger = ExceptionHandler.logger;
    logger.error(logger, loggerArgs as any);

    return throwError(() => ({ status, message: errorMessage }));
  }

  isError(exception: any): exception is Error {
    return !!(isObject(exception) && (exception as Error).message);
  }

  setCustomFilters(filters: RpcExceptionFilterMetadata[]) {
    if (!Array.isArray(filters)) {
      throw new InvalidExceptionFilterException();
    }
    this.filters = filters;
  }

  invokeCustomFilters<T = any>(exception: T, host: ArgumentsHost): Observable<any> | null {
    if (isEmpty(this.filters)) {
      return null;
    }

    const filter = selectExceptionFilterMetadata(this.filters, exception);
    return filter ? filter.func(exception, host) : null;
  }
}
