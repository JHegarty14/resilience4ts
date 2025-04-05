import type { Json } from '@forts/resilience4ts-core';
import { MaxRetriesExceeded } from '../exceptions';

export type RetryException = MaxRetriesExceeded | Error | Json;
