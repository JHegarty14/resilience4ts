export class RetryValidationException extends Error {
  readonly name = 'RetryValidationException';
  constructor(message: string, rest?: { cause: unknown }) {
    super(message, rest);
  }
}
