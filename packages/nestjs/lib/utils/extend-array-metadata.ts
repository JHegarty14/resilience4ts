export function extendArrayMetadata<T extends Array<unknown>>(
  key: string,
  metadata: T,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  target: Function,
) {
  const previousValue = Reflect.getMetadata(key, target) || [];
  const value = [...previousValue, ...metadata];
  Reflect.defineMetadata(key, value, target);
}
