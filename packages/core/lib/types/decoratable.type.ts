import { Result, Option } from 'oxide.ts';
import { AnonymousMonad } from './monad.type';

export type Decoratable<A> = A extends (...args: infer Args) => Promise<infer R>
  ? (...args: Args) => Promise<R>
  : never;

export type CheckedDecoratable<A> = A extends (...args: infer Args) => Promise<infer R>
  ? (...args: Args) => Promise<Result<R, unknown>>
  : never;

export type WrappedDecoratable<A> = A extends (
  ...args: infer Args
) => Promise<Result<infer R, infer E>>
  ? (...args: Args) => Promise<Result<R, E>>
  : never;

export type OptionDecoratable<A> = A extends (...args: infer Args) => Promise<Option<infer R>>
  ? (...args: Args) => Promise<Option<R>>
  : never;

export type MonadDecoratable<A> = A extends (...args: unknown[]) => Promise<AnonymousMonad>
  ? WrappedDecoratable<A> | OptionDecoratable<A>
  : never;

export type BaseDecoratable<A> = Decoratable<A> | CheckedDecoratable<A> | MonadDecoratable<A>;

export type DecoratableReturn<A> = A extends (...args: unknown[]) => Promise<infer R> ? R : never;

export type CheckedDecoratableReturn<A> = A extends (...args: unknown[]) => Promise<infer R>
  ? Result<R, unknown>
  : never;

export type WrappedDecoratableReturn<A> = A extends (
  ...args: unknown[]
) => Promise<Result<infer R, infer E>>
  ? Result<R, E>
  : never;

export type OptionDecoratableReturn<A> = A extends (...args: unknown[]) => Promise<Option<infer R>>
  ? Option<R>
  : never;

export type DecoratableArgs<A> = A extends (...args: infer Args) => Promise<unknown> ? Args : never;

export type TDecoratable = <Args, Return>(...args: any[]) => any;
