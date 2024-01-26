import type { UniqueId } from '@forts/resilience4ts-core';

export type BulkheadConfig = {
  getUniqueId: (...args: any[]) => UniqueId;
  readonly maxConcurrent?: number;
  readonly maxWait?: number;
  readonly executionTimeout?: number;
  readonly kind?: BulkheadStrategy;
};

export class BulkheadConfigImpl {
  name: string;
  maxConcurrent: number;
  maxWait: number;
  executionTimeout: number;
  kind: BulkheadStrategy;
  getUniqueId: (...args: any[]) => UniqueId;

  constructor(name: string, { maxConcurrent, maxWait, kind, getUniqueId }: BulkheadConfig) {
    this.name = name;
    this.maxConcurrent = maxConcurrent ?? 10;
    this.maxWait = maxWait ?? 1000;
    this.executionTimeout = 1000;
    this.kind = kind ?? BulkheadStrategy.Distributed;
    this.getUniqueId = getUniqueId;
  }
  withMaxConcurrent(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
    return this;
  }
  withMaxWait(maxWait: number) {
    this.maxWait = maxWait;
    return this;
  }
  withKind(kind: BulkheadStrategy) {
    this.kind = kind;
    return this;
  }
  withUniqueId(getUniqueId: (...args: any[]) => UniqueId) {
    this.getUniqueId = getUniqueId;
    return this;
  }
  withExecutionTimeout(executionTimeout: number) {
    this.executionTimeout = executionTimeout;
    return this;
  }
  build() {
    return {
      name: this.name,
      maxConcurrent: this.maxConcurrent,
      maxWait: this.maxWait,
    };
  }
}

export enum BulkheadStrategy {
  Distributed,
  Instance,
}
