export interface EventConsumer<T> {
  consumeEvent(event: T): Promise<void>;
}
