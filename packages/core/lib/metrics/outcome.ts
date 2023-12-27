export enum Outcome {
  Success,
  Error,
  SlowSuccess,
  SlowError,
  NotPermitted,
}

export const OutcomeToMapKeys: Record<Outcome, string[]> = {
  [Outcome.Success]: ['num_calls'],
  [Outcome.Error]: ['num_calls', 'num_failed_calls'],
  [Outcome.SlowSuccess]: ['num_calls', 'num_slow_calls'],
  [Outcome.SlowError]: ['num_calls', 'num_slow_calls', 'num_failed_calls', 'num_slow_failed_calls'],
  [Outcome.NotPermitted]: ['num_not_permitted'],
};
