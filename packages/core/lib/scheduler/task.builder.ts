import crypto from 'crypto';
import { assertUnreachable } from '../util';
import { ResilientTask } from './types';

export class TaskBuilder {
  static build<Data extends Record<string, any>>(
    type: 'run_at' | 'run_in' | 'immediate',
    isoExecutionTime: number,
    names: string,
    data: Data,
  ): ResilientTask<Data> {
    switch (type) {
      case 'run_at':
        return {
          _type: 'run_at',
          runAt: isoExecutionTime,
          taskUid: crypto.randomUUID(),
          taskName: names,
          data,
          attempts: data.attempts ?? 0,
          maxAttempts: data.maxAttempts ?? 3,
        };
      case 'run_in':
        return {
          _type: 'run_in',
          runIn: isoExecutionTime,
          taskUid: crypto.randomUUID(),
          taskName: names,
          data,
          attempts: data.attempts ?? 0,
          maxAttempts: data.maxAttempts ?? 3,
        };
      case 'immediate':
        return {
          _type: 'immediate',
          taskUid: crypto.randomUUID(),
          taskName: names,
          data,
          attempts: data.attempts ?? 0,
          maxAttempts: data.maxAttempts ?? 3,
        };
      default:
        assertUnreachable(type);
    }
  }

  static buildBatch<Data extends Record<string, any>>(
    type: 'run_at' | 'run_in' | 'immediate',
    isoExecutionTime: number,
    names: string[],
    data: Data,
  ): ResilientTask<Data>[] {
    return names.map((name) => TaskBuilder.build<Data>(type, isoExecutionTime, name, data));
  }
}
