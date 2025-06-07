export type Decoratable<Args = any, Return = any> = (
  ...args: Args extends unknown[] ? Args : [Args]
) => Promise<Return>;

export const isDecoratable = <Return>(fn: unknown): fn is Decoratable<unknown[], Return> =>
   typeof fn === 'function';