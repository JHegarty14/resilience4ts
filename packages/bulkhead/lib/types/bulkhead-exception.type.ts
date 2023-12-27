import { Json } from '@forts/resilience4ts-core';
import { BulkheadFullException } from '../exceptions';

export type BulkheadException = BulkheadFullException | Error | Json;
