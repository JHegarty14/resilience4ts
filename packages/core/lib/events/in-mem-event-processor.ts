import { AbstractEventProcessor } from './abstract-event-processor';
import { EventConsumer } from './event-consumer';

export class InMemoryEventProcessor<T> implements AbstractEventProcessor<T> {
  private readonly onEventConsumers = new Set<EventConsumer<T>>();
  private eventConsumerMap = new Map<string, Set<EventConsumer<T>>>();
  private consumerRegistered: boolean;

  constructor() {
    this.consumerRegistered = false;
  }

  hasConsumers() {
    return this.consumerRegistered;
  }

  registerConsumer<E>(name: string, eventConsumer: E extends T ? EventConsumer<E> : never): void {
    if (!eventConsumer) return;

    if (!this.eventConsumerMap.has(name)) {
      this.eventConsumerMap.set(name, new Set([eventConsumer]));
    } else {
      this.eventConsumerMap.get(name)?.add(eventConsumer);
    }
    this.consumerRegistered = true;
  }

  async processEvent<E extends T>(event: E): Promise<boolean> {
    let consumed = false;
    if (!(this.onEventConsumers.size < 1)) {
      for (const consumer of this.onEventConsumers) {
        await consumer.consumeEvent(event);
      }
      consumed = true;
    } else {
      const consumers = this.eventConsumerMap.get(getEventUid(event));
      if (consumers) {
        for (const consumer of consumers) {
          await consumer.consumeEvent(event);
        }
        consumed = true;
      }
      consumed = true;
    }

    return consumed;
  }

  onEvent(onEventConsumer: EventConsumer<T>) {
    this.onEventConsumers.add(onEventConsumer);
    this.consumerRegistered = true;
  }
}

export const getEventUid = (event: any) => `${event._type}-${event.pk}-${event.sk}`;
