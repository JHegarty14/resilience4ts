import { TDecoratable } from '@forts/resilience4ts-core';

export type MethodDecorator = <T extends TDecoratable>(
  _: object,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<T>
) => TypedPropertyDescriptor<T>;
