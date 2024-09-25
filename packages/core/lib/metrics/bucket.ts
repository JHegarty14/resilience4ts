import { randomUUID } from 'crypto';
import { Constructable } from '../types';
import { SnapshotImpl } from './snapshot';

export type ISOValue = number;

export type ISOValueString = string;

export type RawMetricsBucket = string;

export type RawMetricsBucketsTimestamped = Map<ISOValueString, RawMetricsBucket>;

export type MetricsBucket<T extends string | number = string> = {
  kone: T;
  ktwo: T;
  kthree: T;
  kfour: T;
  kfive: T;
  ksix: T;
  kseven: T;
  keight: T;
  init_ts: T;
  interval: T;
};

export class MetricsBucketImpl<T extends string | number = string> {
  readonly kone: number;
  readonly ktwo: number;
  readonly kthree: number;
  readonly kfour: number;
  readonly kfive: number;
  readonly ksix: number;
  readonly kseven: number;
  readonly keight: number;
  readonly init_ts: number;
  readonly interval: number;

  constructor(props: MetricsBucket<T>) {
    this.kone = Number(props.kone);
    this.ktwo = Number(props.ktwo);
    this.kthree = Number(props.kthree);
    this.kfour = Number(props.kfour);
    this.kfive = Number(props.kfive);
    this.ksix = Number(props.ksix);
    this.kseven = Number(props.kseven);
    this.keight = Number(props.keight);
    this.init_ts = Number(props.init_ts);
    this.interval = Number(props.interval);
  }

  static fromRaw(raw: RawMetricsBucket): MetricsBucketImpl {
    return new MetricsBucketImpl(JSON.parse(raw) as MetricsBucket);
  }

  into<T = MetricsBucketImpl>(ctor?: Constructable<T>): T {
    switch (ctor?.name) {
      case 'SnapshotImpl':
        return new SnapshotImpl({
          kone: this.kone,
          ktwo: this.ktwo,
          kthree: this.kthree,
          kfour: this.kfour,
          kfive: this.kfive,
          ksix: this.ksix,
          kseven: this.kseven,
          keight: this.keight,
          init_ts: this.init_ts,
          interval: this.interval,
        }) as T;
      default:
        return this as unknown as T;
    }
  }
}

export enum BucketKey {
  KeyOne = 'kone',
  KeyTwo = 'ktwo',
  KeyThree = 'kthree',
  KeyFour = 'kfour',
  KeyFive = 'kfive',
  KeySix = 'ksix',
  KeySeven = 'kseven',
}

export class InMemoryMetricsBucket {
  private initTs: number;
  private readonly window: number;
  private readonly uuid: string;

  constructor(epochSecond: number, window = 0) {
    this.uuid = randomUUID();
    this[`${this.uuid}-kone`] = new Int32Array(1);
    this[`${this.uuid}-ktwo`] = new Int32Array(1);
    this[`${this.uuid}-kthree`] = new Int32Array(1);
    this[`${this.uuid}-kfour`] = new Int32Array(1);
    this[`${this.uuid}-kfive`] = new Int32Array(1);
    this[`${this.uuid}-ksix`] = new Int32Array(1);
    this[`${this.uuid}-kseven`] = new Int32Array(1);
    this[`${this.uuid}-keight`] = new Int32Array(1);
    this.initTs = epochSecond;
    this.window = window;
  }

  increment(key: AtomicValueKey) {
    const taggedKey = TaggedKey(this.uuid, key);
    Atomics.add(this[taggedKey], 0, 1);
  }

  decrement(key: AtomicValueKey) {
    const taggedKey = TaggedKey(this.uuid, key);
    Atomics.sub(this[taggedKey], 0, 1);
  }

  get(key: AtomicValueKey): number {
    const taggedKey = TaggedKey(this.uuid, key);
    return Atomics.load(this[taggedKey], 0) as unknown as number;
  }

  set(key: AtomicValueKey, value: number) {
    const taggedKey = TaggedKey(this.uuid, key);
    Atomics.store(this[taggedKey], 0, value);
  }

  compareAndSwap(key: AtomicValueKey) {
    const taggedKey = TaggedKey(this.uuid, key);
    const expected = this.get(key);
    Atomics.compareExchange(this[taggedKey], 0, expected, expected + 1);
  }

  getInitialTimestamp(): number {
    return this.initTs;
  }

  getWindow(): number {
    return this.window;
  }

  record(
    keysToIncrement: AtomicValueKey[],
    valuesForKeys?: Partial<Record<AtomicValueKey, number>>,
  ): void {
    for (const key of keysToIncrement) {
      this.compareAndSwap(key);
    }
    Object.entries(valuesForKeys ?? {}).forEach(([key, value]) => {
      this.set(key as AtomicValueKey, value);
    });
  }

  reset(epochMs: number) {
    this.initTs = epochMs;
    Atomics.store(this[TaggedKey(this.uuid, 'kone')], 0, 0);
    Atomics.store(this[TaggedKey(this.uuid, 'ktwo')], 0, 0);
    Atomics.store(this[TaggedKey(this.uuid, 'kthree')], 0, 0);
    Atomics.store(this[TaggedKey(this.uuid, 'kfour')], 0, 0);
    Atomics.store(this[TaggedKey(this.uuid, 'kfive')], 0, 0);
    Atomics.store(this[TaggedKey(this.uuid, 'ksix')], 0, 0);
    Atomics.store(this[TaggedKey(this.uuid, 'kseven')], 0, 0);
    Atomics.store(this[TaggedKey(this.uuid, 'keight')], 0, 0);
  }

  into<T = InMemoryMetricsBucket>(ctor?: Constructable<T>): T {
    switch (ctor?.name) {
      case 'MetricsBucketImpl':
        return new MetricsBucketImpl({
          kone: this.get('kone'),
          ktwo: this.get('ktwo'),
          kthree: this.get('kthree'),
          kfour: this.get('kfour'),
          kfive: this.get('kfive'),
          ksix: this.get('ksix'),
          kseven: this.get('kseven'),
          keight: this.get('keight'),
          init_ts: this.getInitialTimestamp(),
          interval: this.getWindow(),
        }) as T;
      case 'SnapshotImpl':
        return new SnapshotImpl({
          kone: this.get('kone'),
          ktwo: this.get('ktwo'),
          kthree: this.get('kthree'),
          kfour: this.get('kfour'),
          kfive: this.get('kfive'),
          ksix: this.get('ksix'),
          kseven: this.get('kseven'),
          keight: this.get('keight'),
          init_ts: this.getInitialTimestamp(),
          interval: this.getWindow(),
        }) as T;
      default:
        return this as unknown as T;
    }
  }
}

export type AtomicValueKey =
  | 'kone'
  | 'ktwo'
  | 'kthree'
  | 'kfour'
  | 'kfive'
  | 'ksix'
  | 'kseven'
  | 'keight';

export type TaggedAtomicValueKey = `${string}-${AtomicValueKey}`;

const TaggedKey = (uuid: string, key: AtomicValueKey): TaggedAtomicValueKey => {
  return `${uuid}-${key}` as TaggedAtomicValueKey;
};

export type AtomicValues = {
  [x: TaggedAtomicValueKey]: Int32Array;
};
