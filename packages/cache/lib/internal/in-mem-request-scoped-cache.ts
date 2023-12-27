export class RequestScopedCacheLocal<Scope extends Record<string, any>> {
  static readonly instance = new RequestScopedCacheLocal(
    new WeakMap<Record<string, any>, Map<string, any>>()
  );

  private constructor(private readonly cache: WeakMap<Scope, Map<string, any>>) {}

  async get<Return>(scope: Scope, key: string): Promise<Return | null> {
    return (RequestScopedCacheLocal.instance.cache.get(scope)?.get(key) ?? null) as Return | null;
  }

  async set<Value>(scope: Scope, key: string, value: Value) {
    if (!RequestScopedCacheLocal.instance.cache.has(scope)) {
      RequestScopedCacheLocal.instance.cache.set(scope, new Map());
    }

    RequestScopedCacheLocal.instance.cache.get(scope)?.set(key, value);
  }

  async del(scope: Scope): Promise<number> {
    try {
      RequestScopedCacheLocal.instance.cache.delete(scope);
      return 1;
    } catch {
      return 0;
    }
  }
}
