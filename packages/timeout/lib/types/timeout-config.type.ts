export type TimeoutConfig = {
  timeout: number;
};

export type TimeoutOptions<Args extends unknown[]> = {
  signal: AbortSignal;
  onTimeout?: (...args: Args) => void;
};
