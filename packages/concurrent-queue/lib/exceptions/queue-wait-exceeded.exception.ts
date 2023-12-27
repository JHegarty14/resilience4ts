export class QueueWaitExceeded extends Error {
  constructor(name: string, uniqueId: string) {
    super(`Exceeded max wait time for queue ${name} with unique id ${uniqueId}`);
  }
}
