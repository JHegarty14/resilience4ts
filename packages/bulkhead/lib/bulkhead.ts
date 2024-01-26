import {
  type ResilienceDecorator,
  ResilienceProviderService,
  Decoratable,
} from '@forts/resilience4ts-core';
import { BulkheadFullException } from './exceptions';
import { BaseBulkheadStrategy, BulkheadStrategyFactory, KeyBuilder } from './internal';
import { type BulkheadConfig, BulkheadConfigImpl } from './types';

/**
 * Bulkhead Decorator
 * ------------------
 *
 * The Bulkhead decorator limits the number of concurrent calls to the decorated function. A bulkhead
 * can be configured to cap the number of concurrent calls to a function across all instances of the
 * application, or to cap the number of concurrent calls to a function per instance of the application.
 *
 * If the bulkhead is full, the decorated function will throw a {@link BulkheadFullException}.
 */
export class Bulkhead implements ResilienceDecorator {
  protected static core: ResilienceProviderService;
  private readonly initialized: Promise<void>;
  protected strategy!: BaseBulkheadStrategy;

  private constructor(
    private readonly name: string,
    private readonly config: BulkheadConfigImpl,
    private readonly tags: Map<string, string>,
  ) {
    Bulkhead.core = ResilienceProviderService.forRoot();
    this.initialized = this.init();
  }

  protected static getDefaultConfig(): BulkheadConfig {
    return Bulkhead.core.config['bulkhead'];
  }

  static of(name: string, config: BulkheadConfig): Bulkhead;
  static of(name: string, config: BulkheadConfig, tags?: Map<string, string>): Bulkhead {
    return new Bulkhead(name, new BulkheadConfigImpl(name, config), tags || new Map());
  }

  private async init(): Promise<void> {
    await Bulkhead.core.start();
    const registered = await Bulkhead.core.cache.sIsMember(
      KeyBuilder.bulkheadRegistryKey(),
      this.name,
    );
    if (!registered) {
      await Bulkhead.core.cache.sAdd(KeyBuilder.bulkheadRegistryKey(), [this.name]);
    }

    this.strategy = BulkheadStrategyFactory.resolve(Bulkhead.core.cache, this.config);

    Bulkhead.core.emitter.emit('r4t-bulkhead-ready', this.name, this.tags);

    return;
  }

  /**
   * Decorates the given function with a bulkhead.
   */
  on<Args, Return>(fn: Decoratable<Args, Return>) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;

      Bulkhead.core.emitter.emit('r4t-bulkhead-request', this.name, this.tags);

      const uniqueId = this.config.getUniqueId(...args);

      const acquired = await this.strategy.tryEnterBulkhead(uniqueId);

      if (!acquired) {
        Bulkhead.core.emitter.emit('r4t-bulkhead-full', this.name, this.tags);
        throw new BulkheadFullException(this.name);
      }

      try {
        return await fn(...args);
      } finally {
        await this.strategy.releaseBulkhead(uniqueId);
      }
    };
  }

  /**
   * Decorates the given function with a bulkhead. This varient of the decorator is
   * useful when the decorated function is a method on a class.
   */
  onBound<Args, Return>(fn: Decoratable<Args, Return>, self: unknown) {
    return async (...args: Args extends unknown[] ? Args : [Args]): Promise<Return> => {
      await this.initialized;

      Bulkhead.core.emitter.emit('r4t-bulkhead-request', this.name, this.tags);

      const uniqueId = this.config.getUniqueId(...args);

      const acquired = await this.strategy.tryEnterBulkhead(uniqueId);

      if (!acquired) {
        Bulkhead.core.emitter.emit('r4t-bulkhead-full', this.name, this.tags);
        throw new BulkheadFullException(this.name);
      }

      try {
        return await fn.call(self, ...args);
      } finally {
        await this.strategy.releaseBulkhead(uniqueId);
      }
    };
  }

  getName() {
    return this.name;
  }
}
