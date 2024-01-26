export type TDecoratable = <Args, Return>(...args: any[]) => any;

export type Decoratable<Args, Return> = (
  ...args: Args extends unknown[] ? Args : [Args]
) => Promise<Return>;
