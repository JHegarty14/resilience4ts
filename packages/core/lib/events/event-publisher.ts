import { EventConsumer } from './event-consumer';

export interface EventPublisher<T> {
  onEvent(onEventConsumer: EventConsumer<T>): void;
}
