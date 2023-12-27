export class MaxRetriesExceeded extends Error {
  constructor(message?: string) {
    super(message);
  }
}
