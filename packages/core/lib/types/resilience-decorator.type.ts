export type ResilienceDecorator = {
  on<Args, Return>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    ...rest: any[]
  ): (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>;

  onBound<Args, Return>(
    fn: (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>,
    self: unknown,
    ...rest: any[]
  ): (...args: Args extends unknown[] ? Args : [Args]) => Promise<Return>;

  getName(): string;
};
