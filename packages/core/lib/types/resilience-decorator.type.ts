import type { Decoratable } from './decoratable.type';

export type ResilienceDecorator = {
  on<Args, Return>(fn: Decoratable<Args, Return>, ...rest: any[]): Decoratable<Args, Return>;

  onBound<Args, Return>(
    fn: Decoratable<Args, Return>,
    self: unknown,
    ...rest: any[]
  ): Decoratable<Args, Return>;

  getName(): string;
};
