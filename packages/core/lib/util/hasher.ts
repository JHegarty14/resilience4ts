import objectHash from 'object-hash';

export const valueHasher = (value: unknown): string => {
  return objectHash(value);
};
