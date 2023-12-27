import type { Json } from '@forts/resilience4ts-core';
import { CircuitConnectionLost, CircuitOpenException } from '../exceptions';

export type CircuitBreakerException = CircuitConnectionLost | CircuitOpenException | Error | Json;
