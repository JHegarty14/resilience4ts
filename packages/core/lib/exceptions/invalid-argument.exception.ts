export class InvalidArgumentException extends Error {
  readonly parameter?: string;

  constructor(message?: string, parameter?: string) {
    super(message);
    this.parameter = parameter;
  }
}
