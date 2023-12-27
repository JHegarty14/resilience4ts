import { InvalidArgumentException } from '../exceptions';

export class Guard {
  static throwIfNullOrEmpty<TParam>(value: TParam, name: string): void {
    if (!value) {
      throw new InvalidArgumentException(`Parameter ${name} is null or empty.`, name);
    }
  }

  static throwIfNullOrNegative(value: number, name: string): void {
    if (value <= 0) {
      throw new InvalidArgumentException(`Parameter ${name} is null or negative.`, name);
    }
  }

  static throwIfNotPositive(value: number, name: string): void {
    if (typeof value !== 'number' || value < 1 || !Number.isSafeInteger(value)) {
      throw new InvalidArgumentException(
        `Parameter ${name} must be a positive, safe integer. Got ${value}`,
        name
      );
    }
  }

  static throwIfExistsAndNotString(value: unknown, name: string): void {
    if (
      (value !== null || value !== undefined) &&
      typeof value !== 'string' &&
      (value as string)?.length < 1
    ) {
      throw new InvalidArgumentException(
        `Parameter ${name} must be a string with length greater than 1.`,
        name
      );
    }
  }

  static throwIfExistsAndNotNumber(value: unknown, name: string): void {
    if ((value !== null || value !== undefined) && typeof value !== 'number') {
      throw new InvalidArgumentException(`Parameter ${name} must be a number.`, name);
    }
  }

  static throwIfExistsAndNotBoolean(value: unknown, name: string): void {
    if ((value !== null || value !== undefined) && typeof value !== 'boolean') {
      throw new InvalidArgumentException(`Parameter ${name} must be a boolean.`, name);
    }
  }
}
