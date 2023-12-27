export class RateLimitViolationException extends Error {
  constructor() {
    super('Maximum number of requests exceeded');
  }
}
