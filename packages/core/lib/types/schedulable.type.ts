import { Bucketable } from './bucketable.type';

export type Schedulable = {
  priority: number;
  runAt: number;
  lockedAt: number;
  lastFinishedAt?: number;
  failCount?: number;
  failReason?: string;
  updatedAt?: number;
  repeatInterval?: string | number;
  inFlight: number;
  unique?: boolean;
} & Bucketable;
