export class InvalidArgumentException extends Error {
  constructor(argument: string) {
    super(`Invalid argument: ${argument}`);
  }
}
