import { Decoratable, ResilienceProviderService } from '@forts/resilience4ts-core';
import type { Json, ResilienceDecorator } from '@forts/resilience4ts-core';
import { FallbackAction, FallbackConfig, FallbackConfigImpl } from './types';

/**
 * Fallback Decorator
 * ------------------
 *
 * This decorator executes the fallback action if the decorated function throws an error.
 * The fallback action can be either a synchronous function or a promise. If the fallback
 * action is a promise, the decorator will wait for the promise to resolve before returning
 * the result. If the fallback action is a synchronous function, the decorator will return
 * the result immediately. If the fallback action is not defined, the decorator will rethrow
 * the error.
 */
export class Fallback<Action extends Json> implements ResilienceDecorator {
  private static core: ResilienceProviderService;
  private initialized!: Promise<void>;

  private constructor(
    private readonly name: string,
    private readonly config: FallbackConfigImpl<Action>,
    private readonly tags: Map<string, string>,
  ) {
    Fallback.core = ResilienceProviderService.forRoot();
    this.initialized = this.init();
  }

  /**
   * Creates a new Fallback decorator.
   */
  static of(name: string, config: FallbackConfig): Fallback<FallbackAction<FallbackConfig>>;
  static of(name: string, config: FallbackConfig, tags?: Map<string, string>) {
    return new Fallback(name, new FallbackConfigImpl(config), tags ?? new Map());
  }

  private async init() {
    await Fallback.core.start();

    Fallback.core.emitter.emit('r4t-fallback-ready', this.name, this.tags);
  }

  /**
   * Decorates the given function with fallback.
   */
  on<Args, Return>(fn: Decoratable<Args, Return>) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;

      try {
        return await fn(...args);
      } catch (err: unknown) {
        const shouldHandle = this.config.shouldHandle.eval(err);

        if (shouldHandle && this.config.fallbackAction) {
          Fallback.core.emitter.emit('r4t-fallback', this.name, this.tags);
          const promiseOrAction = this.config.fallbackAction(...args);
          if (promiseOrAction instanceof Promise) {
            return (await promiseOrAction) as unknown as Return;
          }
          return promiseOrAction as unknown as Return;
        }

        throw err;
      }
    };
  }

  /**
   * Decorates the given function with fallback. This varient of the decorator is
   * useful when the decorated function is a method on a class.
   */
  onBound<Args, Return>(fn: Decoratable<Args, Return>, self: unknown) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;

      try {
        return await fn.call(self, ...args);
      } catch (err: unknown) {
        const shouldHandle = this.config.shouldHandle.eval(err);

        if (shouldHandle && this.config.fallbackAction) {
          Fallback.core.emitter.emit('r4t-fallback', this.name, this.tags);
          const promiseOrAction = this.config.fallbackAction(...args);
          if (promiseOrAction instanceof Promise) {
            return (await promiseOrAction) as unknown as Return;
          }
          return promiseOrAction as unknown as Return;
        }

        throw err;
      }
    };
  }

  getName() {
    return this.name;
  }
}
