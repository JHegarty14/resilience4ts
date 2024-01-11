import { setTimeout } from 'timers/promises';
import { parentPort, workerData } from 'worker_threads';
import { PersistenceFactory } from '../../cache';
import { ResilienceConfig } from '../../types';
import { ResilienceKeyBuilder } from '../../util';
import { TaskManager } from '../task-manager.service';
import { AbstractResilienceConsumer } from './abstract-resilience-consumer';
import { shouldExit, shouldRun, WorkerState } from './worker-state';

class QueueConsumer extends AbstractResilienceConsumer {
  protected static override instance: QueueConsumer;
  protected initialized: Promise<void>;
  protected state: WorkerState;
  protected taskManager!: TaskManager;

  private constructor(private readonly config: ResilienceConfig) {
    super();
    this.state = WorkerState.Starting;
    ResilienceKeyBuilder.new(config.resilience.serviceName, config.resilience.delimiter);
    this.initialized = this.init();
  }

  static new(config: ResilienceConfig) {
    if (!QueueConsumer.instance) {
      QueueConsumer.instance = new QueueConsumer(config);
    }

    return QueueConsumer.instance;
  }

  protected async init() {
    const cache = await PersistenceFactory(this.config.redis);
    this.taskManager = new TaskManager(cache);

    this.state = WorkerState.Running;

    return;
  }

  async start() {
    await this.initialized;

    parentPort?.postMessage('_@_consumer_worker_ready_@_');

    // start consuming
    let noResultCount = 0;
    let errors = 0;

    while (!shouldExit(this.state)) {
      if (shouldRun(this.state)) {
        // consume
        try {
          const task = await this.taskManager.consumeNextTask();
          if (task) {
            parentPort?.postMessage(task);
          } else {
            noResultCount++;
            if (this.state === WorkerState.Recovering) {
              await setTimeout(
                Math.max(
                  this.config.scheduler.recoveryInterval,
                  this.config.scheduler.defaultInterval * noResultCount,
                ),
              );
            } else if (noResultCount >= (this.config.scheduler.consumer?.startBackoffAt ?? 3)) {
              await setTimeout(this.config.scheduler.defaultInterval * noResultCount);
            } else {
              await setTimeout(this.config.scheduler.defaultInterval);
            }
          }
        } catch (error: unknown) {
          errors++;
          if (errors >= (this.config.scheduler.consumer?.maxErrors ?? 25)) {
            QueueConsumer.stop();
          }
        }
      }
    }
  }

  static pause() {
    if (shouldRun(QueueConsumer.instance.state)) {
      QueueConsumer.instance.state = WorkerState.Paused;
    }
  }

  static unpause() {
    if (QueueConsumer.instance.state === WorkerState.Paused) {
      QueueConsumer.instance.state = WorkerState.Running;
    }
  }

  static recover() {
    QueueConsumer.instance.state = WorkerState.Recovering;
  }

  static stop() {
    QueueConsumer.instance.state = WorkerState.Stopping;
    // TODO: cleanup
    QueueConsumer.instance.state = WorkerState.Terminated;
  }
}

async function consumeNext(config: ResilienceConfig) {
  await QueueConsumer.new(config).start();
}

consumeNext(workerData);

parentPort?.on('message', (value: WorkerState) => {
  if (value === WorkerState.Stopping) {
    QueueConsumer.stop();
  } else if (value === WorkerState.Running) {
    QueueConsumer.unpause();
  } else if (value === WorkerState.Paused) {
    QueueConsumer.pause();
  }
});
