export type SchedulerConfig = {
  name?: string;
  defaultInterval: number;
  runConsumer?: boolean;
};

export const DefaultSchedulerOptions = {
  name: 'r4t-scheduler',
  defaultInterval: 60 * 1000,
  runConsumer: false,
};
