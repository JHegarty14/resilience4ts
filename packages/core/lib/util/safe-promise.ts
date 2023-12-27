import { OperationCancelledException } from '../exceptions';

type Race = {
  resolve: (value: unknown | Promise<unknown>) => void;
  reject: (err: any) => void;
};

/**
 * Miscellaneous type-safe utility methods for working with promises. Based on an implementation
 * by Dan Bornstein (<https://github.com/danfuzz/lactoserv/blob/main/src/async/export/PromiseUtil.js>)
 */
export class SafePromise {
  /**
   * Weak map, which links contenders passed to {@link SafePromise.race} to all
   * the races those contenders are involved in, along with a `settled` flag
   * indicating the promise state of the contender. (Note: When an
   * already-settled contender is first added to the map, its `settled` flag
   * will be incorrect until the immediately-subsequent `await`.)
   */
  private static raceMap: WeakMap<Promise<unknown>, { races: Set<Race>; settled: boolean }> =
    new WeakMap();

  /**
   * Causes a rejected promise to be considered "handled." Can be passed
   * anything; this does nothing (other than waste a little time) when given a
   * non-promise or a fulfilled promise.
   */
  static handleRejection(maybePromise?: Promise<unknown>) {
    (async () => {
      try {
        await maybePromise;
      } catch {
        // Ignore it.
      }
    })();
  }

  /**
   * Constructs a promise which is rejected but which is considered "already
   * handled." Returns the appropriately-constructed pre-handled promise.
   */
  static rejectAndHandle<E extends Error>(reason: E) {
    if (!(reason instanceof Error)) {
      throw new TypeError('reason must be an Error');
    }

    const result = Promise.reject(reason);
    this.handleRejection(result);
    return result;
  }

  /**
   * Non-memory-leaking version of `Promise.race()`. The code here is based on
   * an implementation by Brian Kim (first link below). See these bugs for more
   * details:
   *
   * <https://github.com/nodejs/node/issues/17469#issuecomment-685216777>
   * <https://bugs.chromium.org/p/v8/issues/detail?id=9858>
   */
  static async race<T>(raceables: Iterable<Promise<T>>): Promise<T> {
    const isPrimitive = (value: unknown) => {
      return value === null || (typeof value !== 'object' && typeof value !== 'function');
    };

    // `Promise.race()` accepts an arbitrary iterable/generator; settle it into
    // a regular array, because we may have to iterate over it more than once.
    const contenders = [...raceables];

    // `Promise.race()` on an empty argument is specified to return a promise
    // which never resolves.
    if (contenders.length === 0) {
      return new Promise(() => null);
    } else if (contenders.length === 1) {
      // Just one contender, so it can't possibly be a race. Note:
      // `Promise.race()` is specified to always return a pending promise, even
      // if the argument(s) are already settled, which is why we `await` instead
      // of `return` directly.
      return await contenders[0];
    }

    // Set up each contender that hasn't ever been encountered before. While
    // doing so, also short-circuit the race if we can determine a winner.
    // Specifically, `Promise.race()` specifies that the first (earliest in
    // `contenders`) already-settled contender wins, so if we observe N (N >= 0)
    // definitely-unsettled values followed by a definitely-settled one, then
    // the definitely-settled one is de facto the winner of the race.
    for (const c of contenders) {
      if (isPrimitive(c)) {
        // Short circuit: This contender is the definite winner of the race.
        // We `await` for the same reason as the `length === 1` case above.
        return await c;
      } else {
        const record = this.raceMap.get(c);
        switch (record?.settled) {
          case false: {
            // Nothing to do. It's known-unsettled.
            break;
          }
          case true: {
            // Short circuit: This contender is the definite winner of the
            // race. We `await` for the same reason as the `length === 1` case
            // above.
            return await c;
          }
          case undefined: {
            // We've never encountered this contender before in any race. This
            // setup call happens once for the lifetime of the contender.
            const newRecord = this.addRaceContender(c);
            await null; // Ensure `settled === true` if `c` is already settled.
            if (newRecord.settled) {
              // Short circuit: This contender is the definite winner of the
              // race.
              return c;
            }
          }
        }
      }
    }

    // All contenders are pending promises.

    let raceSettler!: Race;
    const result = new Promise((resolve, reject) => {
      raceSettler = { resolve, reject };
    });

    for (const c of contenders) {
      const record = this.raceMap.get(c);
      if (record?.settled) {
        // Surprise! The contender got settled after it was checked during the
        // first pass. We can't just return here (well, ok, unless it happened
        // to be the first contender, but that's arguably more trouble than it's
        // worth to handle specially), because we may have polluted the
        // `raceMap` with our `raceSettler`. So, just resolve our `result`, and
        // let the `finally` below clean up the mess.
        raceSettler.resolve(c);
        break;
      }
      record?.races?.add?.(raceSettler);
    }

    try {
      return (await result) as Promise<T>;
    } finally {
      // Drop `raceSettler` (that is, the link to the `result` of the race
      // made by the call to this method) from any of the contenders that still
      // refer to it.
      for (const c of contenders) {
        const record = this.raceMap.get(c);
        record?.races?.delete?.(raceSettler);
      }
    }
  }

  /**
   * Helper for {@link race}, which adds a new race contender to the {@link raceMap}.
   * This method is called once ever per contender, even when that
   * contender is involved in multiple races.
   *
   * **Note:** This method (a) is separate from {@link race} (that is, the code
   * isn't just inlined at the sole call site) and (b) does not accept any
   * race-resolving functions as additional arguments (e.g. to conveniently add
   * the first race). This is done to prevent the closures created in this
   * method from possibly keeping any contenders GC-alive. (An earlier version
   * of this "safe race" code in fact had the implied problem.)
   */
  private static addRaceContender(contender: Promise<unknown>) {
    const races = new Set<Race>();
    const record = {
      races, // What races is this contender part of?
      settled: false, // Is this contender definitely settled?
    };

    this.raceMap.set(contender, record);

    (async () => {
      try {
        const value = await contender;
        for (const { resolve } of races) {
          resolve(value);
        }
      } catch (reason) {
        for (const { reject } of races) {
          reject(reason);
        }
      } finally {
        races.clear();
        record.settled = true;
      }
    })();

    return record;
  }

  // static appendRaceables(contender: Promise<unknown>, ...raceables: Promise<unknown>[]): void {
  //   for (const raceable of raceables) {
  //     const race = this.raceMap.get(contender);
  //     if (race?.settled) {
  //       return;
  //     }
  //     this.raceMap.get(contender)?.races.add()
  //   }
  // }

  static async cancel(contender: Promise<unknown>) {
    const record = this.raceMap.get(contender);
    if (!record || record?.settled) {
      return;
    }

    for (const race of record.races) {
      race.reject(new OperationCancelledException());
      record.races.delete(race);
    }
  }
}
