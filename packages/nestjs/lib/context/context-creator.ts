import { isEmpty } from '@forts/resilience4ts-core/lib/util';
import { Provider } from '@nestjs/common';
import { CUSTOM_ROUTE_ARGS_METADATA, PARAMTYPES_METADATA } from '@nestjs/common/constants';
import { ContextType, Controller, PipeTransform } from '@nestjs/common/interfaces';
import { ContextId } from '@nestjs/core';
import { GuardsContextCreator, GuardsConsumer, FORBIDDEN_MESSAGE } from '@nestjs/core/guards';
import { ContextUtils, ParamProperties } from '@nestjs/core/helpers/context-utils';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { HandlerMetadataStorage } from '@nestjs/core/helpers/handler-metadata-storage';
import { ParamsMetadata } from '@nestjs/core/helpers/interfaces/params-metadata.interface';
import { InterceptorsContextCreator, InterceptorsConsumer } from '@nestjs/core/interceptors';
import { PipesContextCreator, PipesConsumer } from '@nestjs/core/pipes';
import { Observable } from 'rxjs';
import { ExceptionFiltersContext } from '../exceptions/exception-filters-context';
import { RpcParamsFactory } from './params-factory';
import { RpcProxy } from './rpc-proxy';

type RpcParamProperties = ParamProperties & { metatype?: any };
export interface RpcHandlerMetadata {
  argsLength: number;
  paramtypes: any[];
  getParamsMetadata: (moduleKey: string) => RpcParamProperties[];
}

export class ContextCreator {
  private readonly contextUtils = new ContextUtils();
  private readonly paramsFactory = new RpcParamsFactory();
  private readonly handlerMetadataStorage = new HandlerMetadataStorage<RpcHandlerMetadata>();

  constructor(
    private readonly rpcProxy: RpcProxy,
    private readonly exceptionFilterContext: ExceptionFiltersContext,
    private readonly pipesContextCreator: PipesContextCreator,
    private readonly pipesConsumer: PipesConsumer,
    private readonly guardsContextCreator: GuardsContextCreator,
    private readonly guardsConsumer: GuardsConsumer,
    private readonly interceptorsContextCreator: InterceptorsContextCreator,
    private readonly interceptorsConsumer: InterceptorsConsumer
  ) {}

  create<T extends ParamsMetadata = ParamsMetadata>(
    instance: Controller | Provider,
    callback: (...args: unknown[]) => Observable<any>,
    moduleKey: string,
    methodName: string,
    contextId: ContextId = {} as ContextId,
    inquirerId?: string,
    defaultCbMetadata: Record<string, any> = {}
  ): (...args: any[]) => Promise<Observable<any>> {
    const contextType: ContextType = 'rpc';
    const { argsLength, paramtypes, getParamsMetadata } = this.getMetadata<T>(
      instance,
      methodName,
      defaultCbMetadata,
      contextType
    );

    const exceptionHandler = this.exceptionFilterContext.create(
      instance,
      callback,
      moduleKey,
      contextId,
      inquirerId
    );
    const pipes = this.pipesContextCreator.create(
      instance,
      callback,
      moduleKey,
      contextId,
      inquirerId
    );
    const guards = this.guardsContextCreator.create(
      instance,
      callback,
      moduleKey,
      contextId,
      inquirerId
    );
    const interceptors = this.interceptorsContextCreator.create(
      instance,
      callback,
      moduleKey,
      contextId,
      inquirerId
    );

    const paramsMetadata = getParamsMetadata(moduleKey);
    const paramsOptions = paramsMetadata
      ? this.contextUtils.mergeParamsMetatypes(paramsMetadata, paramtypes)
      : [];
    const fnApplyPipes = this.createPipesFn(pipes, paramsOptions);

    const fnCanActivate = this.createGuardsFn(guards, instance, callback, contextType);

    const handler = (initialArgs: unknown[], args: unknown[]) => async () => {
      if (fnApplyPipes) {
        await fnApplyPipes(initialArgs, ...args);
        return callback.apply(instance, initialArgs);
      }
      return callback.apply(instance, args);
    };

    return this.rpcProxy.create(async (...args: unknown[]) => {
      const initialArgs = this.contextUtils.createNullArray(argsLength);
      fnCanActivate && (await fnCanActivate(args));

      return this.interceptorsConsumer.intercept(
        interceptors,
        args,
        instance,
        callback,
        handler(initialArgs, args),
        contextType
      ) as Promise<Observable<unknown>>;
    }, exceptionHandler);
  }

  reflectCallbackParamtypes(
    instance: Controller,
    callback: (...args: unknown[]) => unknown
  ): unknown[] {
    return Reflect.getMetadata(PARAMTYPES_METADATA, instance, callback.name);
  }

  createGuardsFn<TContext extends string = ContextType>(
    guards: any[],
    instance: Controller,
    callback: (...args: unknown[]) => unknown,
    contextType?: TContext
  ): ((...args: any[]) => void) | null {
    const canActivateFn = async (args: any[]) => {
      const canActivate = await this.guardsConsumer.tryActivate<TContext>(
        guards,
        args,
        instance,
        callback,
        contextType
      );
      if (!canActivate) {
        throw new Error(FORBIDDEN_MESSAGE);
      }
    };
    return guards.length ? canActivateFn : null;
  }

  getMetadata<TMetadata, TContext extends ContextType = ContextType>(
    instance: Controller | Provider,
    methodName: string,
    defaultCbMetadata: Record<string, any>,
    contextType: TContext
  ) {
    const cacheMetadata = this.handlerMetadataStorage.get(instance, methodName);
    if (cacheMetadata) {
      return cacheMetadata;
    }

    const metadata =
      this.contextUtils.reflectCallbackMetadata<TMetadata>(
        instance,
        methodName,
        'PARAM_ARGS_METADATA'
      ) || defaultCbMetadata;

    const keys = Object.keys(metadata);
    const argsLength = this.contextUtils.getArgumentsLength(keys, metadata);
    const paramtypes = this.contextUtils.reflectCallbackParamtypes(instance, methodName);
    const contextFactory = this.contextUtils.getContextFactory(
      contextType,
      instance,
      instance[methodName]
    );
    const getParamsMetadata = () =>
      this.exchangeKeysForValues(keys, metadata, this.paramsFactory, contextFactory);
    const handlerMetadata: RpcHandlerMetadata = {
      argsLength,
      paramtypes,
      getParamsMetadata,
    };
    this.handlerMetadataStorage.set(instance, methodName, handlerMetadata);
    return handlerMetadata;
  }

  exchangeKeysForValues<TMetadata = any>(
    keys: string[],
    metadata: TMetadata,
    paramsFactory: RpcParamsFactory,
    contextFactory: (args: unknown[]) => ExecutionContextHost
  ): ParamProperties[] {
    return keys.map((key) => {
      const { index, data, pipes } = metadata[key];
      const type = this.contextUtils.mapParamType(key);

      if (key.includes(CUSTOM_ROUTE_ARGS_METADATA)) {
        const { factory } = metadata[key];
        const customExtractValue = this.contextUtils.getCustomFactory(
          factory,
          data,
          contextFactory
        );
        return { index, extractValue: customExtractValue, type, data, pipes };
      }
      const numericType = Number(type);
      const extractValue = (...args: unknown[]) =>
        paramsFactory.exchangeKeyForValue(numericType, data, args);

      return { index, extractValue, type: numericType, data, pipes };
    });
  }

  createPipesFn(
    pipes: PipeTransform[],
    paramsOptions: (ParamProperties & { metatype?: unknown })[]
  ) {
    const pipesFn = async (args: unknown[], ...params: unknown[]) => {
      const resolveParamValue = async (param: ParamProperties & { metatype?: unknown }) => {
        const { index, extractValue, type, data, metatype, pipes: paramPipes } = param;
        const value = extractValue(...params);

        args[index] = await this.getParamValue(
          value,
          { metatype, type, data },
          pipes.concat(paramPipes)
        );
      };
      await Promise.all(paramsOptions.map(resolveParamValue));
    };
    return paramsOptions.length ? pipesFn : null;
  }

  public async getParamValue<T>(
    value: T,
    { metatype, type, data }: { metatype: any; type: any; data: any },
    pipes: PipeTransform[]
  ): Promise<any> {
    return isEmpty(pipes)
      ? value
      : this.pipesConsumer.apply(value, { metatype, type, data }, pipes);
  }
}
