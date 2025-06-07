export type ResilienceEvent<TContext> = {
  readonly type: string;
  readonly name: string;
  readonly context: TContext;
}
