import { DiscoveryService } from '@golevelup/nestjs-discovery';
import { Inject } from '@nestjs/common';
import { Controller, Injectable } from '@nestjs/common/interfaces';
import { ContextIdFactory, GraphInspector, MetadataScanner, NestContainer } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { STATIC_CONTEXT } from '@nestjs/core/injector/constants';
import { Injector } from '@nestjs/core/injector/injector';
import { ContextId, InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Module } from '@nestjs/core/injector/module';
import { REQUEST_CONTEXT_ID } from '@nestjs/core/router/request/request-constants';
import { Observable, ObservedValueOf, isObservable, of, from, forkJoin } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { RESILIENCE_CONSUMER, RESILIENCE_DISCOVERABLE } from '../constants';
import { ContextCreator, RequestContextHost } from '../context';
import { ExceptionFiltersContext } from '../exceptions/exception-filters-context';
import { Server } from '../server';

type ConsumerDefinition = {
  methodKey: string;
  patterns: string[];
  targetCallback: (...args: unknown[]) => Observable<any>;
};

export class ConsumerController {
  private readonly metadataScanner = new MetadataScanner();
  private readonly exceptionFiltersCache = new WeakMap();
  constructor(
    private readonly container: NestContainer,
    private readonly contextCreator: ContextCreator,
    private readonly injector: Injector,
    private readonly exceptionFiltersContext: ExceptionFiltersContext,
    private readonly graphInspector: GraphInspector,
  ) {}

  registerConsumerHandler(
    instanceWrapper: InstanceWrapper<Controller | Injectable>,
    server: Server,
    moduleKey: string,
  ) {
    const prototype = Object.getPrototypeOf(instanceWrapper);
    const isStatic = instanceWrapper.isDependencyTreeStatic();
    const handlers = this.metadataScanner.getAllMethodNames(prototype);
    const defaultCallMetadata = {} as Record<string, any>;
    const consumerDefinition: ConsumerDefinition[] = this.metadataScanner
      .getAllMethodNames(prototype)
      .map((methodKey) => {
        const targetCallback = prototype[methodKey];
        const handlerType = Reflect.getMetadata(RESILIENCE_DISCOVERABLE, targetCallback);
        const patterns = Reflect.getMetadata(RESILIENCE_CONSUMER, targetCallback);
        if (handlerType === undefined) {
          return;
        }
        return {
          methodKey,
          patterns,
          targetCallback,
        };
      })
      .filter((metadata) => metadata) as ConsumerDefinition[];
    const moduleRef = this.container.getModuleByKey(moduleKey);

    consumerDefinition
      .reduce<ConsumerDefinition[]>((acc, handler) => {
        handler.patterns.forEach((pattern) => acc.push({ ...handler, patterns: [pattern] }));
        return acc;
      }, [])
      .forEach((def) => {
        const {
          patterns: [pattern],
          targetCallback,
          methodKey,
        } = def;

        this.insertEntrypointDefinition(instanceWrapper, def);

        if (isStatic) {
          const proxy = this.contextCreator.create(
            instanceWrapper.instance as object,
            targetCallback,
            moduleKey,
            methodKey,
            STATIC_CONTEXT,
            undefined,
            defaultCallMetadata,
          );
          const eventHandler = async (...args: unknown[]) => {
            const originalArgs = args;
            const [dataOrContextHost] = originalArgs;
            if (dataOrContextHost instanceof RequestContextHost) {
              args = args.slice(1, args.length);
            }
            const returnValue = proxy(...args);
            return this.forkJoinHandlersIfAttached(returnValue, originalArgs, eventHandler);
          };
          return server.addHandler(pattern, eventHandler);
        } else {
          const asyncHandler = this.createRequestScopedHandler(
            instanceWrapper,
            pattern,
            moduleRef,
            moduleKey,
            methodKey,
            defaultCallMetadata,
          );
          server.addHandler(pattern, asyncHandler);
        }
      });
  }

  createRequestScopedHandler(
    wrapper: InstanceWrapper,
    pattern: string | Record<string, any>,
    moduleRef: Module,
    moduleKey: string,
    methodKey: string,
    defaultCallMetadata: Record<string, any> = {},
  ) {
    const collection = moduleRef.controllers;
    const { instance } = wrapper;

    const isTreeDurable = wrapper.isDependencyTreeDurable();

    const handler = async (...args: unknown[]) => {
      try {
        let contextId: ContextId;
        let [dataOrContextHost] = args;
        if (dataOrContextHost instanceof RequestContextHost) {
          contextId = this.getContextId(dataOrContextHost, isTreeDurable);
          args.shift();
        } else {
          const [data, reqCtx] = args;
          const request = RequestContextHost.create(pattern, data, reqCtx);
          contextId = this.getContextId(request, isTreeDurable);
          dataOrContextHost = request;
        }

        const contextInstance = await this.injector.loadPerContext(
          instance,
          moduleRef,
          collection,
          contextId,
        );
        const proxy = this.contextCreator.create(
          contextInstance,
          contextInstance[methodKey],
          moduleKey,
          methodKey,
          contextId,
          wrapper.id,
          defaultCallMetadata,
        );

        return proxy(...args);
      } catch (e: unknown) {
        let exceptionFilter = this.exceptionFiltersCache.get(instance[methodKey]);
        if (!exceptionFilter) {
          exceptionFilter = this.exceptionFiltersContext.create(
            instance,
            instance[methodKey],
            moduleKey,
          );
          this.exceptionFiltersCache.set(instance[methodKey], exceptionFilter);
        }
        const host = new ExecutionContextHost(args);
        host.setType('rpc');
        return exceptionFilter.handle(e, host);
      }
    };
    return handler;
  }

  private getContextId<T extends Record<string, any>>(
    request: T,
    isTreeDurable: boolean,
  ): ContextId {
    const contextId = ContextIdFactory.getByRequest(request);
    if (!request[REQUEST_CONTEXT_ID as any]) {
      Object.defineProperty(request, REQUEST_CONTEXT_ID, {
        value: contextId,
        enumerable: false,
        writable: false,
        configurable: false,
      });

      const requestProviderValue = isTreeDurable ? contextId.payload : request;
      this.container.registerRequestProvider(requestProviderValue, contextId);
    }
    return contextId;
  }

  transformToObservable<T>(resultOrDeferred: Observable<T> | Promise<T>): Observable<T>;
  transformToObservable<T>(
    resultOrDeferred: T,
  ): never extends Observable<ObservedValueOf<T>> ? Observable<T> : Observable<ObservedValueOf<T>>;
  transformToObservable(resultOrDeferred: any) {
    if (resultOrDeferred instanceof Promise) {
      return from(resultOrDeferred).pipe(mergeMap((val) => (isObservable(val) ? val : of(val))));
    }

    if (isObservable(resultOrDeferred)) {
      return resultOrDeferred;
    }

    return of(resultOrDeferred);
  }

  forkJoinHandlersIfAttached(
    currentReturnValue: Promise<unknown> | Observable<unknown>,
    originalArgs: unknown[],
    handlerRef: any,
  ) {
    if (handlerRef.next) {
      const returnedValueWrapper = handlerRef.next(...(originalArgs as Parameters<any>));
      return forkJoin({
        current: this.transformToObservable(currentReturnValue),
        next: this.transformToObservable(returnedValueWrapper),
      });
    }
    return currentReturnValue;
  }

  insertEntrypointDefinition(instanceWrapper: InstanceWrapper, definition: ConsumerDefinition) {
    this.graphInspector.insertEntrypointDefinition(
      {
        type: 'consumer',
        methodName: definition.methodKey,
        className: instanceWrapper.metatype?.name,
        classNodeId: instanceWrapper.id,
        metadata: {
          key: definition.patterns.toString(),
          patterns: definition.patterns,
          isEventHandler: true,
        },
      },
      instanceWrapper.id,
    );
  }
}
