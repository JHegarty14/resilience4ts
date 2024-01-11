export class BaseResilienceException extends Error {
  constructor(
    readonly __type: string,
    readonly message: string,
  ) {
    super(message);
  }
}
