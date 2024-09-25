import { Result, Option } from 'oxide.ts';
import type { UnknownMonad } from '@forts/resilience4ts-core';

export type RetryReturn<Fn, Strict extends 'true' | 'false'> = Fn extends (
  ...args: unknown[]
) => infer R
  ? Strict extends 'true'
    ? Awaited<R> extends UnknownMonad<infer TOk, infer TErr>
      ? TErr extends void
        ? Option<NonNullable<TOk>>
        : Result<unknown, unknown>
      : Result<Awaited<R>, unknown>
    : Awaited<R>
  : never;

export type ResolveReturn<TReturn, Strict extends 0 | 1 | undefined> = `${Strict}` extends `${1}`
  ? Awaited<TReturn> extends UnknownMonad<infer TOk, infer TErr>
    ? Awaited<TReturn> extends Option<unknown>
      ? Option<NonNullable<TOk>>
      : Result<TOk, TErr>
    : Result<Awaited<TReturn>, unknown>
  : Awaited<TReturn>;

export type ExtractRetryReturn<TReturn> =
  Awaited<TReturn> extends UnknownMonad<infer TOk, infer TErr>
    ? TErr extends void
      ? NonNullable<TOk>
      : TOk
    : Awaited<TReturn>;
