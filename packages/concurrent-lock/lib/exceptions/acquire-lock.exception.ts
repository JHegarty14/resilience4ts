export class AcquireLockException extends Error {
  constructor(
    readonly name: string,
    readonly uniqueId: string,
    readonly cause?: Error,
  ) {
    super(`Unable to acquire lock ${name} for resource ${uniqueId}`, { cause });
  }
}
