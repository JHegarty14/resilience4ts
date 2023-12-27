export type HedgedResult<T> = {
  fromPrimary: boolean;
} & ({ ok: true; value: T } | { ok: false; value: Error });
