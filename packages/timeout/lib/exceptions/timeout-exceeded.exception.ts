export class TimeoutExceededException extends Error {
  constructor(
    readonly name: string,
    readonly timeout: number,
  ) {
    super(`Timeout exceeded for ${name} after ${timeout}ms`);
  }
}
