import { RESILIENCE_CONSUMER } from '../constants/metadata.constants';

export const Consumer = (eventName: string) => {
  return (target: object, propertyKey: string | symbol, descriptor: any): void => {
    Reflect.defineMetadata(RESILIENCE_CONSUMER, eventName, descriptor.value);
  };
};
