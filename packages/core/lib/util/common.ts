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

export function unwrap<T>(value?: T): T {
  if (!value) {
    throw new Error(`Failed to unwrap nullish value: ${value}`);
  }

  return value;
}

export const isEmpty = <T extends Array<unknown> | Record<string, unknown>>(value: T): boolean => {
  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return Object.keys(value).length === 0;
};
