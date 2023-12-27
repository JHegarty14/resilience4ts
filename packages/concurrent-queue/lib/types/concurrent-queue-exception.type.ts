import type { Json } from '@forts/resilience4ts-core';
import { CreateQueueLockException, QueueWaitExceeded } from '../exceptions';

export type ConcurrentQueueException = CreateQueueLockException | QueueWaitExceeded | Error | Json;
