import { Result, Option, Ok, Err } from 'oxide.ts';
import { AsyncReturnType, Json, ResolveResult, UnknownMonad } from '../types';

export function assertUnreachable(_: never): never {
  throw new Error('Unreachable code reached');
}

export function isValidDate(date: unknown): date is Date {
  // An invalid date object returns NaN for getTime()
  return date !== null && Number.isNaN(new Date(date as string).getTime()) === false;
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isMonad(value: unknown): value is UnknownMonad {
  return Result.is(value) || Option.is(value);
}

export function returnOrThrow<T>(value?: T): T | undefined {
  if (value instanceof Error) {
    throw value;
  }

  return value;
}

export function unwrap<T>(value?: T): T {
  if (!value) {
    throw new Error(`Failed to unwrap nullish value: ${value}`);
  }

  return value;
}

/**
 * @description Wraps a function in a try/catch, and returns `Ok` if successful, `Err` if the function throws.
 * An optional error function can be passed to transform the error into a custom error type.
 *
 * ```
 * const test = () => {
 *   throw new Error('I am going to take down prod');
 * };
 *
 * const handled = fromThrowable(test, () => "no you won't")();
 *
 * expect(handled.isErr()).toBeTruthy();
 * expect(handled.unwrapErr()).toEqual("no you won't");
 * ```
 */
export const fromThrowable = <
  Args,
  ErrReturn extends Error | Json,
  E extends Error,
  Fn extends (...args: Args extends unknown[] ? Args : [Args]) => any
>(
  fn: Fn,
  errorFn?: (e: E) => ErrReturn
): ((...args: Args extends unknown[] ? Args : [Args]) => Result<ReturnType<Fn>, ErrReturn>) => {
  return (...args) => {
    try {
      const result = fn(...args);
      return Ok(result);
    } catch (e: unknown) {
      return Err(errorFn ? errorFn(e as E) : (e as ErrReturn));
    }
  };
};

/**
 * @description Wraps an async function in a try/catch and returns `Ok` if successful, `Err` if the function throws.
 * An optional error function can be passed to transform the error into a custom error type.
 *
 * ```
 * const test = async () => {
 *   throw new Error('I am going to take down prod');
 * };
 *
 * const handled = await fromAsyncThrowable(test, () => "no you won't")();
 *
 * expect(handled.isErr()).toBeTruthy();
 * expect(handled.unwrapErr()).toEqual("no you won't");
 * ```
 */
export const fromAsyncThrowable = <
  Args,
  ErrReturn extends Error | Json,
  E extends Error,
  Fn extends (...args: Args extends unknown[] ? Args : [Args]) => Promise<any>
>(
  fn: Fn,
  errorFn?: (e: E) => ErrReturn
): ((
  ...args: Args extends unknown[] ? Args : [Args]
) => Promise<Result<AsyncReturnType<Fn>, ErrReturn>>) => {
  return async (...args) => {
    try {
      const result = await fn(...args);
      return Ok(result);
    } catch (e: unknown) {
      return Err(errorFn ? errorFn(e as E) : (e as ErrReturn));
    }
  };
};

export const flattenResult = <T, E>(result: unknown): ResolveResult<T, E> => {
  if (!Result.is(result)) {
    return Ok(result) as unknown as ResolveResult<T, E>;
  }

  return result as ResolveResult<T, E>;
};

export const isEmpty = <T extends Array<unknown> | Record<string, unknown>>(value: T): boolean => {
  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return Object.keys(value).length === 0;
};
