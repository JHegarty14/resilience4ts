export class RequestContextHost<TData = any, TContext = any> {
  constructor(
    readonly pattern: string | Record<string, any>,
    readonly data: TData,
    readonly context: TContext
  ) {}

  static create<TData, TContext>(
    pattern: string | Record<string, any>,
    data: TData,
    context: TContext
  ) {
    return new RequestContextHost(pattern, data, context);
  }

  getData(): TData {
    return this.data;
  }

  getPattern(): string | Record<string, any> {
    return this.pattern;
  }

  getContext(): TContext {
    return this.context;
  }
}
