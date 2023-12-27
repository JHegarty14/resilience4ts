export abstract class ResilienceEvent<TContext> {
  abstract readonly type: string;
  abstract readonly name: string;
  abstract readonly context: TContext;
}
