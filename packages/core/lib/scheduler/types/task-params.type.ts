export type ResilientTask<T = any> = {
  readonly taskUid: string;
  readonly taskName: string;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly data: T;
} & (
  | { readonly _type: 'run_at'; readonly runAt: number }
  | { readonly _type: 'run_in'; readonly runIn: number }
  | { readonly _type: 'immediate' }
);

export type BaseResilientTask<T = any> = {
  readonly taskUid?: string;
  readonly taskName: string;
  readonly data: T;
};
