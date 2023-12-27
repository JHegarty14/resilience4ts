export type WorkerThreadRequest = {
  uid?: string;
  input: any;
};

export enum WorkerThreadRequestType {
  Init = 'init',
  Execute = 'execute',
  Terminate = 'terminate',
}

export type WorkerThreadInit = {
  type: WorkerThreadRequestType.Init;
  config: any;
};

export type BaseWorkerThreadOptions = {
  executionTimeout: number;
};
