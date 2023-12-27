import type { ResilientTask } from './types/task-params.type';
import { assertUnreachable, ResilienceKeyBuilder } from '../util';
import { RedisClientInstance } from '../cache/cache.service';

/**
 * @class
 */
export class TaskManager {
  constructor(private readonly cache: RedisClientInstance) {}

  async getTaskDataById<T = Record<string, any>>(taskUid: string) {
    return this.cache.hGetAll(getTaskKey(taskUid)) as T;
  }

  async removeTask(taskUid: string): Promise<void> {
    await this.cache.del(getTaskKey(taskUid));
  }

  async scheduleTask(task: ResilientTask) {
    const { taskUid, ...data } = task;
    const score = this.getScore(task);

    const serialized = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, JSON.stringify(value)])
    );

    await this.cache
      .multi()
      .zAdd(getScheduleQueueName(), { score, value: taskUid })
      .hSet(getTaskKey(taskUid), serialized)
      .exec();
  }

  async scheduleImmediate(task: ResilientTask) {
    const { taskUid, ...data } = task;

    const serialized = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, JSON.stringify(value)])
    );

    await this.cache
      .multi()
      .rPush(getTaskQueueName(), [taskUid])
      .hSet(getTaskKey(taskUid), serialized)
      .exec();
  }

  async consumeNextTask(): Promise<ResilientTask | null> {
    const nextTaskUid = await this.cache.lMove(
      getTaskQueueName(),
      getProcessingQueueName(),
      'RIGHT',
      'LEFT'
    );

    if (!nextTaskUid) {
      return null;
    }

    const task = await this.cache.hGetAll(getTaskKey(nextTaskUid));
    const deserialized = Object.fromEntries(
      Object.entries(task).map(([key, value]) => [key, JSON.parse(value)])
    );
    return deserialized as unknown as ResilientTask | null;
  }

  async markScheduledTaskAsReady() {
    await this.cache.executeIsolated(async (iso) => {
      await iso.watch(getScheduleQueueName());
      const range = Date.now();
      const [task] = await this.cache.zRangeByScore(getScheduleQueueName(), 0, range, {
        LIMIT: { offset: 0, count: 1 },
      });

      if (!task) {
        await iso.unwatch();
        return null;
      }

      await this.cache
        .multi()
        .rPush(getTaskQueueName(), [task])
        .zRem(getScheduleQueueName(), [task])
        .exec();
    });
  }

  async onSuccess(taskUid: string) {
    await this.cache
      .multi()
      .sRem(getProcessingQueueName(), [taskUid])
      .del(getTaskKey(taskUid))
      .exec();
  }

  async onFailure(task: ResilientTask) {
    const { taskUid, maxAttempts, attempts } = task;
    const score = this.getScore(task);
    if (maxAttempts >= attempts) {
      await this.cache.del(getTaskKey(taskUid));
      return;
    }

    await this.cache
      .multi()
      .sRem(getProcessingQueueName(), [taskUid])
      .zAdd(getTaskQueueName(), { score, value: taskUid })
      .hIncrBy(getTaskKey(taskUid), 'attempts', 1)
      .exec();
  }

  private getScore(task: ResilientTask) {
    switch (task._type) {
      case 'run_at':
        return task.runAt;
      case 'run_in':
        return Date.now() + task.runIn;
      case 'immediate':
        return Date.now();
      default:
        assertUnreachable(task);
    }
  }
}

const getTaskQueueName = () => {
  return ResilienceKeyBuilder.build('scheduler', 'queue');
};

const getScheduleQueueName = () => {
  return ResilienceKeyBuilder.build('scheduler', 'schedule');
};

const getProcessingQueueName = () => {
  return ResilienceKeyBuilder.build('scheduler', 'processing');
};

const getTaskKey = (taskUid: string) => {
  return ResilienceKeyBuilder.build('scheduler', 'task', taskUid);
};
