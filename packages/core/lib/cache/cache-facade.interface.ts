export interface ICacheFacade {
  registerResilienceComponent(registeryKey: string, name: string): Promise<void>;
  acquireLock(key: string, duration: number): Promise<string | null>;
  extendLock(key: string, duration: number): Promise<boolean>;
  releaseLock(key: string): Promise<number>;
  acquireSemaphore(
    key: string,
    uniqId: string,
    maxWait: number,
    execTimeout: number,
    maxConcurrent: number,
  ): Promise<boolean>;
  releaseSemaphore(key: string, uniqId: string): Promise<void>;
  acquireQueueLock(key: string, uniqId: string, maxDuration: number): Promise<boolean>;
  enqueue(key: string, uniqId: string, score: number): Promise<number>;
  dequeue(key: string, uniqId: string): Promise<number>;
  incrementCounter(key: string, counter: string): Promise<number>;
  decrementCounter(key: string, counter: string): Promise<number>;
  registerCircuit(
    key: string,
    name: string,
    defaultCircuitBucket: () => Record<string, number>,
    initialState: number,
  ): Promise<string[]>;

  zAdd(key: string, value: { score: number; value: string }): Promise<number>;
}
