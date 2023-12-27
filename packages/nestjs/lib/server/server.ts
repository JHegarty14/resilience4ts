import { type PacketIn } from '@forts/resilience4ts-core';
import { connectable, isObservable, Subject } from 'rxjs';
import { ConsumerHandler } from '../types';

export abstract class Server {
  protected readonly consumerHandlers = new Map<string, ConsumerHandler>();

  addHandler(pattern: string, callback: ConsumerHandler, extras?: Record<string, any>) {
    callback.extras = extras;

    const head = this.consumerHandlers.get(pattern);
    if (head) {
      const getTail = (handler: ConsumerHandler) =>
        handler.next ? getTail(handler.next) : handler;

      const tail = getTail(head);
      tail.next = callback;
    } else {
      this.consumerHandlers.set(pattern, callback);
    }
  }

  getHandlers() {
    return this.consumerHandlers;
  }

  getHandlerByPattern(pattern: string): ConsumerHandler | null {
    const route = this.getRouteFromPattern(pattern);
    return this.consumerHandlers.get(route) ?? null;
  }

  async handleEvent(patten: string, packet: PacketIn, context: any) {
    const handler = this.getHandlerByPattern(patten);
    if (!handler) {
      return;
    }

    const resultOrStream = await handler(packet.data, context);
    if (isObservable(resultOrStream)) {
      const connectableSrc = connectable(resultOrStream, {
        connector: () => new Subject(),
        resetOnDisconnect: false,
      });
      connectableSrc.connect();
    }
  }

  protected getRouteFromPattern(pattern: string) {
    let validPattern: string;
    try {
      validPattern = JSON.parse(pattern);
    } catch {
      validPattern = pattern;
    }

    return validPattern;
  }
}
