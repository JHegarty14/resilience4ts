import { BaseLogger } from 'pino';
import { ICacheFacade } from './cache-facade.interface';
import { RedisClientInstance } from './cache.service';

export class RedisCmdFacade implements ICacheFacade {
  constructor(
    private readonly cache: RedisClientInstance,
    private readonly logger: BaseLogger,
  ) {}

  async registerResilienceComponent(registeryKey: string, name: string) {
    const registered = await this.cache.sIsMember(registeryKey, name);
    if (!registered) {
      await this.cache.sAdd(registeryKey, [name]);
    }
  }

  /**
   * LOCKS
   */
  acquireLock(key: string, duration: number): Promise<string | null> {
    return this.cache.set(key, Date.now(), {
      NX: true,
      PX: duration,
    });
  }

  extendLock(key: string, duration: number) {
    return this.cache.expire(key, duration);
  }

  releaseLock(key: string) {
    return this.cache.del(key);
  }

  /**
   * SEMAPHORES
   */
  async acquireSemaphore(
    key: string,
    uniqId: string,
    maxWait = 1000,
    execTimeout = 1000,
    maxConcurrent = 10,
  ): Promise<boolean> {
    const czSet = `${key}::owner`;
    const ctr = `${key}::counter`;
    try {
      const now = Date.now();
      const pipeline = this.cache.multi();
      pipeline
        .zRemRangeByScore(key, '-inf', now - (maxWait + execTimeout))
        .zInterStore(czSet, [czSet, key], { WEIGHTS: [1, 0] })
        .incr(ctr);

      const result = await pipeline.exec();
      const counter = result[result.length - 1]?.toString();

      if (!counter) {
        throw new Error('Unable to get current count');
      }

      const counterInt = parseInt(counter);

      pipeline.zAdd(key, { value: uniqId, score: now });
      pipeline.zAdd(czSet, { value: uniqId, score: counterInt });
      pipeline.zCard(czSet);
      pipeline.zRank(czSet, uniqId);
      const pipelineRes = await pipeline.execAsPipeline();
      const rank = pipelineRes[pipelineRes.length - 1]?.toString();
      const rankInt = rank ? parseInt(rank) : undefined;

      if (rankInt === undefined || rankInt >= maxConcurrent) {
        pipeline.zRem(key, uniqId);
        pipeline.zRem(czSet, uniqId);
        await pipeline.execAsPipeline();
        return false;
      }

      return true;
    } catch (err: unknown) {
      return false;
    }
  }

  async releaseSemaphore(key: string, uniqId: string) {
    const pipeline = this.cache.multi();
    pipeline.zRem(key, [uniqId]);
    pipeline.zRem(`${key}::owner`, [uniqId]);
    await pipeline.execAsPipeline();
  }

  /**
   * QUEUES
   */
  async acquireQueueLock(uniqId: string, uuid: string, maxDuration: number) {
    const expired: number[] = [];
    const queuedLocks = await this.cache.zRangeWithScores(uniqId, '-inf', maxDuration, {
      BY: 'SCORE',
      LIMIT: { offset: 0, count: 20 },
    });
    const now = Date.now();

    for (const lock of queuedLocks) {
      if (lock.score <= now) {
        expired.push(lock.score);
      } else if (lock.value === uuid) {
        await this.cache.zRemRangeByScore(uniqId, 0, Math.max(...expired));
        return true;
      } else {
        return false;
      }
    }

    return false;
  }

  async enqueue(key: string, uniqId: string, score: number) {
    return this.cache.zAdd(key, { value: uniqId, score });
  }

  async dequeue(key: string, uniqId: string) {
    return this.cache.zRem(key, uniqId);
  }

  /**
   * SETS
   */

  async getTimeseriesData(key: string, interval: number, count = 1, rev = true) {
    const now = Date.now();
    const start = now - interval;

    const buckets = await this.cache.zRange(key, now, start, {
      BY: 'SCORE',
      REV: rev || undefined,
      LIMIT: { offset: 0, count },
    });

    return buckets ?? [];
  }

  /**
   * HASHES
   */

  incrementCounter(key: string, counter: string) {
    return this.cache.hIncrBy(key, counter, 1);
  }

  decrementCounter(key: string, counter: string) {
    return this.cache.hIncrBy(key, counter, -1);
  }

  /**
   * CIRCUIT BREAKER
   */

  registerCircuit(
    key: string,
    name: string,
    defaultCircuitBucket: () => Record<string, number>,
    initialState: number,
  ) {
    const circuitUid = crypto.randomUUID();
    return this.cache
      .multi()
      .zAdd(key, {
        score: initialState,
        value: name,
      })
      .zAdd(`${key}::timeseries`, { score: Date.now(), value: circuitUid })
      .hSet(circuitUid, defaultCircuitBucket())
      .exec() as Promise<string[]>;
  }

  zAdd(key: string, value: { score: number; value: string }) {
    return this.cache.zAdd(key, value);
  }
}
