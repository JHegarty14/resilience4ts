import { SafePromise } from '@forts/resilience4ts-core';
import { setTimeout } from 'timers/promises';

import { HedgedResult } from '../types';

export class HedgeExecutor {
  private readonly ac: AbortController;

  constructor(private readonly config: HedgeExecutorConfig) {
    this.ac = new AbortController();
  }

  static new() {
    return new HedgeExecutorBuilder();
  }

  schedule<T>(
    scheduledFuture: () => Promise<T>,
    delay: number,
    primaryAc: AbortController,
  ): Promise<HedgedResult<T>> {
    return setTimeout(delay, undefined, { signal: this.ac.signal }).then(async () => {
      primaryAc.abort();
      const contenders = Array.from({ length: this.config.poolSize ?? 1 }).map(() =>
        scheduledFuture(),
      );
      try {
        const winner = await SafePromise.race(contenders);
        return {
          value: winner,
          fromPrimary: false,
          ok: true,
        };
      } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(JSON.stringify(e));
        return {
          value: err,
          fromPrimary: false,
          ok: false,
        };
      }
    });
  }

  cancel() {
    this.ac.abort();
  }
}

class HedgeExecutorBuilder {
  private poolSize?: number;
  private ctxPropagators?: any;

  corePoolSize(size: number) {
    this.poolSize = size;
    return this;
  }

  contextPropagators(propagators: any) {
    this.ctxPropagators = propagators;
    return this;
  }

  build() {
    return new HedgeExecutor({ poolSize: this.poolSize, ctxPropagators: this.ctxPropagators });
  }
}

type HedgeExecutorConfig = {
  readonly poolSize?: number;
  readonly ctxPropagators?: any;
};
