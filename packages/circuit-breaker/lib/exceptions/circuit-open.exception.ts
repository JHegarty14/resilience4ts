export class CircuitOpenException extends Error {
  constructor(public readonly name: string) {
    super(`Unable to process request, circuit ${name} is open`);
  }
}
