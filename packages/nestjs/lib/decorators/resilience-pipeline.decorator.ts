import {
  ResiliencePipe as Pipeline,
  ResiliencePipeBuilder as PipelineBuilder,
} from '@forts/resilience4ts-all';
import type { ResilienceDecorator, TDecoratable } from '@forts/resilience4ts-core';
import { MethodDecorator } from '../types';

/**
 * ResiliencePipeline Decorator
 * ------------------------
 *
 * The ResiliencePipeline decorator is used to create a pipeline of resilience decorators
 * that will be applied to the decorated method. The decorators will be applied in the
 * order they are added to the pipeline. The ResiliencePipeline decorator can take either
 * a {@link PipelineBuilder} or a list of instantiated {@link ResilienceDecorators}.
 *
 * The ResiliencePipe decorator is useful for creating reusable pipelines of resilience
 * decorators that can be applied to multiple methods.
 */
export function ResiliencePipeline(...pipe: [PipelineBuilder]): MethodDecorator;
export function ResiliencePipeline(...decorators: ResilienceDecorator[]): MethodDecorator;
export function ResiliencePipeline(
  ...pipeOrDecorators: [PipelineBuilder] | ResilienceDecorator[]
): MethodDecorator {
  return <T extends TDecoratable>(
    _: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) => {
    if (!descriptor.value) {
      return descriptor;
    }

    const originalMethod = descriptor.value;
    if (pipeOrDecorators[0] instanceof Pipeline) {
      const pipe = pipeOrDecorators[0] as PipelineBuilder;

      descriptor.value = function (this: unknown, ...args: Parameters<T>) {
        return pipe.on(originalMethod).executeBound(this, args);
      } as T;
    } else {
      const pipe = Pipeline.of(propertyKey, originalMethod);

      descriptor.value = function (this: unknown, ...args: Parameters<T>) {
        return pipe.with(...(pipeOrDecorators as ResilienceDecorator[])).executeBound(this, args);
      } as T;
    }

    return descriptor;
  };
}
