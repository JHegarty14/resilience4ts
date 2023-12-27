import { isEmpty } from '@forts/resilience4ts-core/lib/util';
import { EXCEPTION_FILTERS_METADATA } from '@nestjs/common/constants';
import { Controller, Provider } from '@nestjs/common/interfaces';
import { ApplicationConfig, NestContainer } from '@nestjs/core';
import { BaseExceptionFilterContext } from '@nestjs/core/exceptions/base-exception-filter-context';
import { STATIC_CONTEXT } from '@nestjs/core/injector/constants';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Observable } from 'rxjs';
import { ExceptionHandler } from './exception-handler';

export class ExceptionFiltersContext extends BaseExceptionFilterContext {
  constructor(container: NestContainer, private readonly config: ApplicationConfig) {
    super(container);
  }

  create(
    instance: Controller | Provider,
    callback: <T = any>(data: T) => Observable<any>,
    module: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string
  ): any {
    this.moduleContext = module;

    const exceptionHandler = new ExceptionHandler();
    const filters = this.createContext(
      instance,
      callback,
      EXCEPTION_FILTERS_METADATA,
      contextId,
      inquirerId
    );
    if (isEmpty(filters)) {
      return exceptionHandler;
    }
    exceptionHandler.setCustomFilters(filters.reverse());
    return exceptionHandler;
  }

  getGlobalMetadata<T extends any[]>(contextId = STATIC_CONTEXT, inquirerId?: string): T {
    const globalFilters = this.config.getGlobalFilters() as T;
    if (contextId === STATIC_CONTEXT && !inquirerId) {
      return globalFilters;
    }
    const scopedFilterWrappers = this.config.getGlobalRequestFilters() as InstanceWrapper[];
    const scopedFilters = scopedFilterWrappers
      .map((wrapper) =>
        wrapper.getInstanceByContextId(this.getContextId(contextId, wrapper), inquirerId)
      )
      .filter((host) => !!host)
      .map((host) => host.instance);

    return globalFilters.concat(scopedFilters) as T;
  }
}
