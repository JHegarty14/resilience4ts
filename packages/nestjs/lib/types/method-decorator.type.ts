import { Decoratable } from '@forts/resilience4ts-core';

export type MethodDecorator = <T extends Decoratable>(
  _: object,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<T>,
) => TypedPropertyDescriptor<T>;
