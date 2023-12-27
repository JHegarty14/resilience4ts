export type RequestScopedCacheConfig = {
  extractScope: (...args: any[]) => Record<string, any>;
  extractKey: (...args: any[]) => string;
} & (
  | { readonly type: RequestScopedCacheType.Local }
  | { readonly type: RequestScopedCacheType.Distributed; clearOnRequestEnd: boolean }
);

export enum RequestScopedCacheType {
  Local = 'local',
  Distributed = 'distributed',
}
