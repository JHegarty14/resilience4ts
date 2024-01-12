import { EventConsumer } from './event-consumer';
import { EventPublisher } from './event-publisher';

export abstract class AbstractEventProcessor<T> implements EventPublisher<T> {
  abstract hasConsumers(): boolean;
  abstract registerConsumer<E>(
    name: string,
    eventConsumer: E extends T ? EventConsumer<E> : never,
  ): void;
  abstract processEvent<E extends T>(event: E): Promise<boolean>;
  abstract onEvent(onEventConsumer: EventConsumer<T>): void;
}
