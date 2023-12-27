import { TaskManager } from '../task-manager.service';

export abstract class AbstractResilienceConsumer {
  protected static instance: AbstractResilienceConsumer;
  protected abstract initialized: Promise<void>;
  protected abstract taskManager: TaskManager;

  protected abstract init(): Promise<void>;

  abstract start(): Promise<void>;
}

export const workerPath = (workerName: string) => {
  const corePath = __dirname.split('/').slice(0, -4).join('/');
  const returning =
    process.env.R4T_ENV !== 'test'
      ? `./node_modules/@forts/resilience4ts-core/dist/lib/scheduler/workers/${workerName}.worker.js`
      : `${corePath}/lib/scheduler/workers/worker.js`;
  return returning;
};
