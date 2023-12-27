export class CreateQueueLockException extends Error {
  constructor(name: string, uniqueId: string, cause?: Error) {
    super(`Failed to create queue lock for queue ${name} with id ${uniqueId}`, { cause });
  }
}
