import crypto from 'crypto';

const hasher = (data: string) =>
  crypto.createHash('shake256', { outputLength: 16 }).update(data).digest('hex');

type NewRetry<T> = { name: string; attempts?: number; data: T };

export type RetryEventRecord = {
  taskUid: string;
  attempts: string;
  data: string;
};

export type RetryEvent<T> = {
  taskUid: string;
  attempts: number;
  data: T;
};

export class RetryEventImpl<T> {
  taskUid: string;
  attempts: string;
  data: string;

  constructor({ taskUid, attempts, data }: RetryEvent<T>);
  constructor({ name, attempts, data }: NewRetry<T>);
  constructor(input: RetryEventRecord & NewRetry<T>) {
    const { attempts, data } = input;
    this.taskUid = input.name ? `${input.name}-${hasher(JSON.stringify(data))}` : input.taskUid;
    this.attempts = `${attempts ?? 0}`;
    this.data = typeof data === 'string' ? data : JSON.stringify(data);
  }

  unwrap(): RetryEvent<T> {
    return {
      taskUid: this.taskUid,
      attempts: Number(this.attempts),
      data: JSON.parse(this.data),
    };
  }

  forInsert(): RetryEventRecord {
    return {
      taskUid: this.taskUid,
      attempts: this.attempts,
      data: this.data,
    };
  }

  static fromRecord<T>(record: { [x: string]: string }): RetryEventImpl<T> {
    return new RetryEventImpl(recordToRetryEvent(record));
  }
}

export function recordToRetryEvent<T>(record: { [x: string]: string }): RetryEvent<T> {
  console.log('RECORD DATA', record.data);
  return {
    taskUid: record.taskUid,
    attempts: Number(record.attempts),
    data: JSON.parse(record.data),
  };
}
