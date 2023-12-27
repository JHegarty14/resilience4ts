export enum WorkerState {
  Starting = 'starting',
  Running = 'running',
  Stopping = 'stopping',
  Terminated = 'terminated',
  Paused = 'paused',
  Recovering = 'recovering',
}

export const shouldRun = (state: WorkerState) => {
  return (
    state === WorkerState.Running ||
    state === WorkerState.Starting ||
    state === WorkerState.Recovering
  );
};

export const shouldExit = (state: WorkerState) => {
  return state === WorkerState.Stopping || state === WorkerState.Terminated;
};
