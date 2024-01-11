type QueueItem = {
  cmd: (...args: ArgsWithSignal) => Promise<unknown>;
  args: ArgsWithSignal;
};

type Deferred = {
  promise?: Promise<unknown>;
  resolve?: (value: unknown) => void;
  reject?: (err: unknown) => void;
};

type PriorityQueueConfig = {
  readonly maxConcurrency?: number;
};

type ArgsWithSignal = [{ [x: string]: any } & { signal: AbortSignal }, ...any[]];

export class PriorityQueue {
  private finished: boolean;
  private inFlight: number;
  private maxConcurrency: number;
  private queued: number;
  private queue: Record<number, QueueItem[]>;
  private currentQueue: QueueItem[];
  private currentPriority: null | number;
  private deferred: Deferred;

  constructor(config: PriorityQueueConfig) {
    this.finished = false;
    this.inFlight = 0;
    this.maxConcurrency = config.maxConcurrency ?? 1;
    this.queued = 0;
    this.queue = {};
    this.currentQueue = [];
    this.currentPriority = null;
    this.deferred = {};
  }

  async run() {
    const deferred = this.deferred;
    if (!deferred.promise) {
      deferred.promise = new Promise((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
        this.runQueue();
      });
    }
    return deferred.promise;
  }

  add(fn: (...args: unknown[]) => Promise<unknown>, args: ArgsWithSignal, priority = 0) {
    if (this.finished) {
      throw new Error('Cannot add to a finished queue');
    }

    if (Math.sign(priority) === -1) {
      throw new Error('Priority must be a positive number');
    }

    if (!this.queue[priority]) {
      this.queue[priority] = [];
    }

    this.queued++;
    this.queue[priority].push({ cmd: fn, args });

    if (this.currentPriority && this.currentPriority > priority) {
      this.currentQueue = this.queue[priority];
      this.currentPriority = priority;
    }
  }

  cancel() {
    this.finished = true;
    this.deferred.reject?.(new Error('Queue cancelled'));
  }

  private async runQueue() {
    while (this.inFlight < this.maxConcurrency && this.queued) {
      if (!this.currentQueue || this.currentQueue?.length === 0) {
        if (this.inFlight) return;
        const priorities = Object.keys(this.queue);
        for (const priority of priorities) {
          const priorityQueue = this.queue[priority];
          if (priorityQueue.length > 0) {
            this.currentQueue = priorityQueue;
            this.currentPriority = priorities[priority];
            break;
          }
        }
      }
    }

    --this.queued;
    ++this.inFlight;
    const next = this.currentQueue.shift();

    if (!next) return;

    const args = next.args ?? [];

    const queueEntry = new Promise((resolve) => {
      resolve(next.cmd.apply(null, args));
    });

    queueEntry.then(
      () => {
        --this.inFlight;
        if (this.finished) return;

        if (this.queued <= 0 && this.inFlight <= 0) {
          this.finished = true;
          this.deferred.resolve?.(() => 'ok');
        }
        this.runQueue();
      },
      (err: unknown) => {
        this.finished = true;
        this.deferred.reject?.(err);
      },
    );
  }
}
