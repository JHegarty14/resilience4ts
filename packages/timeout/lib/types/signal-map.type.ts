export type SignalMap = { ctrl: AbortController; cbs: ((...args: unknown[]) => void)[] };
