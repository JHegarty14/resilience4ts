export class ScheduledRetry<T> {
  constructor(
    readonly retryUid: string,
    readonly data: T,
    readonly scheduledFor: Date | string | number,
  ) {}
}
