import { Option, Result } from 'oxide.ts';

export type UnknownMonad<Ok = unknown, Err = unknown> = Result<Ok, Err> | Option<Ok>;

export type AnonymousMonad = Result<any, any> | Option<any>;

export type ResolveReturn<TReturn, Err> = Awaited<TReturn> extends UnknownMonad<
  infer TOk,
  infer TErr
>
  ? Awaited<TReturn> extends Option<unknown>
    ? Option<NonNullable<TOk>>
    : Result<TOk, TErr>
  : Result<Awaited<TReturn>, Err>;

export type ResolveResult<TReturn, TErr> = TReturn extends Result<
  infer InferredOk,
  infer InferredErr
>
  ? Result<InferredOk, InferredErr | TErr>
  : Result<TReturn, TErr>;
