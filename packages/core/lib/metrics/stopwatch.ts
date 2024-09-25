import { hrtime } from 'node:process';

const NS_PER_SEC = 1e9;

export class Stopwatch {
  private readonly start: [number, number];
  constructor() {
    this.start = hrtime();
  }

  static start() {
    return new Stopwatch();
  }

  static now() {
    const hrNow = hrtime();
    return hrNow[0] * 1000 + hrNow[1] / 1000000;
  }

  getElapsedNanoseconds() {
    const elapsed = hrtime(this.start);
    return elapsed[0] * NS_PER_SEC + elapsed[1];
  }

  getElapsedMilliseconds() {
    const elapsed = hrtime(this.start);
    return elapsed[0] * 1000 + elapsed[1] / 1000000;
  }

  getElapsedSeconds() {
    const elapsed = hrtime(this.start);
    return elapsed[0] + elapsed[1] / 1000000000;
  }
}
