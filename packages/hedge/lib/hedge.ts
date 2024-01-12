import { ResilienceProviderService, SafePromise } from '@forts/resilience4ts-core';
import type { ResilienceDecorator } from '@forts/resilience4ts-core';
import { HedgeExecutor, KeyBuilder } from './internal';
import { type HedgeConfig, HedgeConfigImpl, type HedgedResult } from './types';
import { HedgeEvent, HedgeEventType } from './event';

/**
 * Hedge Decorator
 * ---------------
 *
 * The hedging strategy enables the re-execution of a user-defined callback if the previous
 * execution takes too long. This approach gives you the option to either run the original
 * callback again or specify a new callback for subsequent hedged attempts. Implementing a
 * hedging strategy can boost the overall responsiveness of the system. However, it's
 * essential to note that this improvement comes at the cost of increased resource utilization.
 * If low latency is not a critical requirement, you may find the `@Retry` decorator is
 * more appropriate.
 */
export class Hedge implements ResilienceDecorator {
  private static core: ResilienceProviderService;
  private readonly initialized!: Promise<void>;
  private readonly hedgeExecutor: HedgeExecutor;

  private constructor(
    private readonly name: string,
    private readonly config: HedgeConfigImpl,
    private readonly tags: Map<string, string>,
  ) {
    this.hedgeExecutor = HedgeExecutor.new().corePoolSize(config.maxHedgedAttempts).build();
    Hedge.core = ResilienceProviderService.forRoot();
    this.initialized = this.init();
  }

  /**
   * Creates a new Hedge decorator.
   */
  static of(name: string, config: HedgeConfig): Hedge;
  static of(name: string, config: HedgeConfig, tags?: Map<string, string>) {
    return new Hedge(name, new HedgeConfigImpl(config), tags ?? new Map());
  }

  private async init() {
    await Hedge.core.start();

    Hedge.core.emitter.emit('r4t-hedge-ready', this.name, this.tags);
  }

  /**
   * Decorates the given function with a hedge contingency.
   */
  on<Args, Return>(fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;

      const controller = new AbortController();

      const { actionGenerator } = this.config;

      const hedged = (): Promise<Return> =>
        actionGenerator ? actionGenerator(...(args as any[])) : fn(...args);

      const sf = this.hedgeExecutor.schedule<Return>(hedged, this.config.delay, controller);

      const start = Date.now();
      let result: HedgedResult<Return>;
      try {
        result = await SafePromise.race<HedgedResult<Return>>([
          fn(...args).then((r) => ({ value: r, fromPrimary: true, ok: true })),
          sf,
        ]);
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(JSON.stringify(err));
        result = { value: error, fromPrimary: false, ok: false };
      }

      const duration = Date.now() - start;

      const { fromPrimary, value } = result;

      if (fromPrimary) {
        this.hedgeExecutor.cancel();
        if (result.ok === false) {
          this.onPrimaryFailure(duration, value as Error);
          throw value;
        } else {
          this.onPrimarySuccess(duration);
        }
      } else {
        if (result.ok === false) {
          this.onHedgeFailure(duration, value as Error);
          throw value;
        } else {
          this.onHedgeSuccess(duration);
        }
      }

      return value as Return;
    };
  }

  /**
   * Decorates the given function with a hedge contingency. This variant of the
   * decorator is used when the function is bound to a class.
   */
  onBound<Args, Return>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    self: unknown,
  ) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;

      const controller = new AbortController();

      const { actionGenerator } = this.config;

      const hedged = (): Promise<Return> =>
        actionGenerator
          ? actionGenerator.call<unknown, any[], Promise<Return>>(self, ...args)
          : fn.call<unknown, Args extends unknown[] ? Args : [Args], Promise<Return>>(
              self,
              ...args,
            );

      const sf = this.hedgeExecutor.schedule<Return>(hedged, this.config.delay, controller);

      const start = Date.now();
      let result: HedgedResult<Return>;
      try {
        result = await SafePromise.race<HedgedResult<Return>>([
          fn.call(self, ...args).then((r) => ({ value: r, fromPrimary: true, ok: true })),
          sf,
        ]);
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(JSON.stringify(err));
        result = { value: error, fromPrimary: false, ok: false };
      }

      const duration = Date.now() - start;

      const { fromPrimary, value } = result;

      if (fromPrimary) {
        this.hedgeExecutor.cancel();
        if (result.ok === false) {
          this.onPrimaryFailure(duration, value as Error);
          throw value;
        } else {
          this.onPrimarySuccess(duration);
        }
      } else {
        if (result.ok === false) {
          this.onHedgeFailure(duration, value as Error);
          throw value;
        } else {
          this.onHedgeSuccess(duration);
        }
      }

      return value as Return;
    };
  }

  onHedging(
    listener: (event: { name: string; cacheKey: string }, tags: Map<string, string>) => void,
  ) {
    Hedge.core.emitter.on(KeyBuilder.hedgeKey(this.name), listener);
  }

  private onPrimaryFailure(duration: number, err: Error) {
    const event = HedgeEvent.fromError(this.name, err, duration, HedgeEventType.PrimaryFailure);
    Hedge.core.emitter.emit(event.eventName, event);
  }

  private onPrimarySuccess(duration: number) {
    const event = new HedgeEvent(this.name, { type: HedgeEventType.PrimarySuccess, duration });
    Hedge.core.emitter.emit(event.eventName, event);
  }

  private onHedgeFailure(duration: number, err: Error) {
    const event = HedgeEvent.fromError(this.name, err, duration, HedgeEventType.SecondaryFailure);
    Hedge.core.emitter.emit(event.eventName, event);
  }

  private onHedgeSuccess(duration: number) {
    const event = new HedgeEvent(this.name, { type: HedgeEventType.SecondarySuccess, duration });
    Hedge.core.emitter.emit(event.eventName, event);
  }

  getName() {
    return this.name;
  }
}
