import type { Json } from '@forts/resilience4ts-core';
import { AcquireLockException } from '../exceptions';

export type ConcurrentLockException = AcquireLockException | Error | Json;
