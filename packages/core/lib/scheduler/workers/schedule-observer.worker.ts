import { setTimeout } from 'timers/promises';
import { parentPort, workerData } from 'worker_threads';
import { PersistenceFactory } from '../../cache';
import { ResilienceConfig } from '../../types';
import { ResilienceKeyBuilder } from '../../util';
import { TaskManager } from '../task-manager.service';
import { AbstractResilienceConsumer } from './abstract-resilience-consumer';

class ScheduleObserver extends AbstractResilienceConsumer {
  protected static instance: ScheduleObserver;
  protected initialized: Promise<void>;
  protected running = false;
  protected taskManager!: TaskManager;

  private constructor(private readonly config: ResilienceConfig) {
    super();
    ResilienceKeyBuilder.new(config.resilience.serviceName, config.resilience.delimiter);
    this.initialized = this.init();
  }

  static new(config: ResilienceConfig) {
    if (!ScheduleObserver.instance) {
      ScheduleObserver.instance = new ScheduleObserver(config);
    }
    return ScheduleObserver.instance;
  }

  protected async init() {
    const cache = await PersistenceFactory(this.config.redis);

    this.taskManager = new TaskManager(cache);

    this.running = true;

    return;
  }

  async start() {
    await this.initialized;

    parentPort?.postMessage('_@_schedule_worker_ready_@_');

    // start consuming
    while (this.running) {
      // consume
      await this.taskManager.markScheduledTaskAsReady();
      await setTimeout(this.config.scheduler.defaultInterval);
    }
  }

  static stop() {
    ScheduleObserver.instance.running = false;
  }
}

async function observeSchedule(config: ResilienceConfig) {
  await ScheduleObserver.new(config).start();
}

observeSchedule(workerData);

parentPort?.on('message', (value: string) => {
  if (value === 'stop') {
    ScheduleObserver.stop();
  }
});
