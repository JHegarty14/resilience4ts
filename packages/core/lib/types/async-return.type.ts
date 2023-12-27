export type AsyncReturnType<T> = T extends (...args: any[]) => Promise<infer R> ? R : never;
