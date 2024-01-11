import { EventEmitter } from 'events';
import { TaskManager } from './task-manager.service';
import { RedisClientInstance } from '../cache/cache.service';
import { ResilientTask } from './types';
import humanInterval from 'human-interval';
import { TaskBuilder } from './task.builder';
import { MessageChannel, Worker } from 'worker_threads';
import { ResilienceConfig } from '../types';
import { WorkerState } from './workers/worker-state';
import { ResourceUtilizationStrategy } from '../utilization';
import { BaseLogger } from 'pino';
import { workerPath } from './workers/abstract-resilience-consumer';

/**
 * @class
 */
export class Scheduler extends EventEmitter {
  private readonly manager: TaskManager;
  private running: boolean;
  private terminating?: Promise<void>;

  on(event: 'fail', listener: (error: Error, task: ResilientTask) => void): this;
  on(event: 'success', listener: (task: ResilientTask) => void): this;
  on(event: 'start', listener: (task: ResilientTask) => void): this;
  on(event: 'complete', listener: (task: ResilientTask) => void): this;
  on(event: string, listener: (task: ResilientTask) => void): this;
  on(event: string, listener: (error: Error, task: ResilientTask) => void): this;
  on(event: 'ready', listener: () => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: string, listener: (...args) => void): this {
    return super.on(event, listener);
  }

  private scheduleWorker!: Worker;
  private swPromise!: Promise<string>;
  private consumeWorker!: Worker;
  private cwPromise!: Promise<string>;
  private readonly messageChannel: MessageChannel;
  private readonly resourceUsage?: ResourceUtilizationStrategy;
  readonly definitions: {
    [name: string]: any;
  } = {};

  readonly ready: Promise<void>;

  /**
   * @param config - Scheduler Config
   * @param cb - Callback after Scheduler has started and connected to mongo
   */
  constructor(
    private readonly repository: RedisClientInstance,
    private readonly logger: BaseLogger,
    readonly config: ResilienceConfig,
    readonly emitter: EventEmitter,
    resourceUsage?: ResourceUtilizationStrategy,
    cb?: (error?: Error) => void,
  ) {
    super();

    this.running = false;

    this.messageChannel = new MessageChannel();

    this.manager = new TaskManager(this.repository);

    if (config.resilience.collectResourceUsage === true) {
      this.resourceUsage = resourceUsage ?? new ResourceUtilizationStrategy(this.config.resilience);
    }

    this.ready = new Promise((resolve) => {
      // this.once('ready', resolve);
      resolve();
    });

    if (cb) {
      this.ready.then(() => cb());
    }
  }

  /**
   * Cancel a task by taskUid
   * @param query
   */
  async cancelTask(taskUid: string) {
    try {
      await this.manager.removeTask(taskUid);
    } catch (error) {
      this.logger.error('error trying to delete task from registry');
      throw error;
    }
  }

  /**
   * Set default lock limit per task type
   * @param num
   */
  defaultInterval(num: number) {
    this.config.scheduler.defaultInterval = num;
    return this;
  }

  /**
   * Finds all tasks matching 'query'
   * @param query
   * @param limit
   * @param skip
   */
  async getTaskData<T = Record<string, any>>(taskUid: string) {
    return await this.manager.getTaskDataById<T>(taskUid);
  }

  /**
   * Internal helper method that uses createTask to create tasks for an array of names
   * @param interval run every X interval
   * @param names Strings of tasks to schedule
   * @param data data to run for task
   * @param options options to run task for
   * @returns array of tasks created
   */
  private async createTasks<Data extends Record<string, any>>(
    tasks: ResilientTask<Data>[],
  ): Promise<void> {
    try {
      await Promise.all(tasks.map((name) => this.manager.scheduleTask(name)));

      this.logger.info('createTasks() -> all tasks created successfully');
    } catch (error) {
      this.logger.error('createTasks() -> error creating one or more of the tasks', { error });
      throw error;
    }
  }

  /**
   * Schedule a task or tasks at a specific time
   * @param when
   * @param names
   */
  async schedule<Data extends Record<string, any> = Record<string, any>>(
    when: string | Date,
    names: string[],
    data: Data,
  ): Promise<void>;
  async schedule<Data extends Record<string, any> = Record<string, any>>(
    when: string | Date,
    names: string,
    data: Data,
  ): Promise<void>;
  async schedule<Data extends Record<string, any> = Record<string, any>>(
    fromNow: number,
    names: string[],
    data: Data,
  ): Promise<void>;
  async schedule<Data extends Record<string, any> = Record<string, any>>(
    fromNow: number,
    names: string,
    data: Data,
  ): Promise<void>;
  async schedule<
    I extends string | Date | number,
    N extends string | string[],
    Data extends Record<string, any> = Record<string, any>,
  >(whenOrFromNow: I, names: N, data: Data): Promise<void>;
  async schedule<Data extends Record<string, any> = Record<string, any>>(
    whenOrFromNow: string | Date | number,
    names: string | string[],
    data: Data,
  ): Promise<void | void[]> {
    let _type: 'run_at' | 'run_in' = 'run_at';
    let isoExecutionTime: number;
    if (typeof whenOrFromNow === 'string') {
      const parsed = humanInterval(whenOrFromNow);
      if (!parsed) {
        throw new Error('Invalid date string');
      }
      isoExecutionTime = parsed;
    } else if (whenOrFromNow instanceof Date) {
      isoExecutionTime = whenOrFromNow.valueOf();
    } else {
      isoExecutionTime = whenOrFromNow;
      _type = 'run_in';
    }

    if (typeof names === 'string') {
      const task = TaskBuilder.build(_type, isoExecutionTime, names, data);
      return this.manager.scheduleTask(task);
    }

    const tasks = TaskBuilder.buildBatch(_type, isoExecutionTime, names, data);
    return this.createTasks(tasks);
  }

  /**
   * Create a task for this exact moment
   * @param name
   */
  async now<Data extends Record<string, any>>(name: string, data: Data): Promise<void> {
    try {
      const taskUid = crypto.randomUUID();
      const task: ResilientTask<Data> = {
        taskUid,
        taskName: name,
        attempts: 0,
        maxAttempts: 1,
        data,
        _type: 'immediate',
      };

      await this.manager.scheduleImmediate(task);
    } catch (error) {
      this.logger.error('error trying to create a task for this exact moment');
      throw error;
    }
  }

  async start() {
    if (this.running) {
      return;
    }

    try {
      this.running = true;

      if (this.config.scheduler.runConsumer) {
        this.initScheduleWorker();

        this.initConsumer();

        await Promise.allSettled([this.swPromise, this.cwPromise]);

        if (this.config.resilience.collectResourceUsage) {
          this.collectResourceUsage();
        }

        this.scheduleWorker.on('message', (message: ResilientTask) => {
          this.emitter.emit(message.taskName, ...message.data);
        });

        this.consumeWorker.on('message', (message: ResilientTask) => {
          this.emitter.emit(message.taskName, ...message.data.data);
        });
      }
    } catch (err: unknown) {
      this.running = false;
      throw err;
    }
  }

  async stop() {
    if (!this.terminating) {
      this.consumeWorker?.postMessage('stop');
      this.scheduleWorker?.postMessage('stop');
      this.terminating = this.repository.disconnect();
    }

    return this.terminating;
  }

  private initConsumer() {
    this.consumeWorker = new Worker(workerPath('consume-next'), {
      workerData: {
        path: './consume-next.worker.ts',
        ...this.config,
      },
    });

    // this.consumeWorker.postMessage({ loggerPort: this.messageChannel.port1 }, [
    //   this.messageChannel.port1,
    // ]);

    this.cwPromise = new Promise((resolve) => {
      this.consumeWorker?.once('message', (message: string) => {
        if (message === '_@_consumer_worker_ready_@_') {
          resolve('CONSUMER WORKER READY');
        }
      });
    });

    this.consumeWorker.on('error', (error) => {
      this.emit('error', error);
    });
  }

  private initScheduleWorker() {
    this.scheduleWorker = new Worker(workerPath('schedule-observer'), {
      workerData: {
        path: './schedule-observer.worker.ts',
        ...this.config,
      },
    });

    this.swPromise = new Promise((resolve) => {
      this.scheduleWorker.once('message', (message: string) => {
        if (message === '_@_schedule_worker_ready_@_') {
          resolve('SCHEDULE WORKER READY');
        }
      });
    });

    this.scheduleWorker.on('error', (error) => {
      this.emit('error', error);
    });
  }

  private collectResourceUsage() {
    if (!this.resourceUsage) {
      return;
    }

    setInterval(() => {
      const collection = this.resourceUsage!.collect();
      // console.log('COLLECTION', collection);
      if (collection.shouldPause()) {
        this.consumeWorker.postMessage(WorkerState.Paused);
      } else if (collection.shouldBackoff()) {
        this.consumeWorker.postMessage(WorkerState.Recovering);
      } else if (collection.shouldResume()) {
        this.consumeWorker.postMessage(WorkerState.Running);
      }
    }, this.resourceUsage.observationIntervalInMs).unref();
  }
}
