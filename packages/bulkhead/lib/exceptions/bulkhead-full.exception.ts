export class BulkheadFullException extends Error {
  constructor(readonly name: string) {
    super(`Unable to process request, bulkhead ${name} is full`);
  }
}
