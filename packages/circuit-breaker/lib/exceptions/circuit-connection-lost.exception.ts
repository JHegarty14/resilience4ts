export class CircuitConnectionLost extends Error {
  constructor(readonly retries: number) {
    super(
      `Unable to process request, connection to Redis was lost after ${retries} retry attempts`
    );
  }
}
