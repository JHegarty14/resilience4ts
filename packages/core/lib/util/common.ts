import { Decoratable, isDecoratable } from "../types";

export function assertUnreachable(_: never, message?: string): never {
  throw new Error(message ?? 'Unreachable code reached');
}

export function isValidDate(date: unknown): date is Date {
  // An invalid date object returns NaN for getTime()
  return date !== null && Number.isNaN(new Date(date as string).getTime()) === false;
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function unwrap<T>(value?: T | null, message?: string): T {
  if (!value) {
    throw new Error(message ?? `Failed to unwrap nullish value: ${value}`);
  }

  return value;
}

export const isEmpty = <T extends Array<unknown> | Record<string, unknown>>(value: T): boolean => {
  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return Object.keys(value).length === 0;
};

export const wrapDecoratableFunction = <Args extends any, Return>(
  fnOrSelf: unknown,
  fn: Decoratable<Args, Return> | undefined | {},
  ...args: any
): () => Promise<Return> => {
  if (isDecoratable(fnOrSelf)) {
    return async () => await fnOrSelf(...args) as Promise<Return>;
  }

  if (isDecoratable(fn)) {
    return async () => unwrap(fn).call(fnOrSelf, ...args) as Promise<Return>;
  }

  throw new Error('No valid decoratable function provided.')
}
