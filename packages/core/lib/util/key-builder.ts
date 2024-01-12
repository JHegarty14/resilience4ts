export class ResilienceKeyBuilder {
  private static _prefix: string;
  private static _delimiter: string;

  private constructor(prefix: string, delimiter = '::') {
    ResilienceKeyBuilder._prefix = `_r4t_${prefix}`;
    ResilienceKeyBuilder._delimiter = delimiter;
  }

  static build(...parts: string[]) {
    return `${ResilienceKeyBuilder._prefix}${ResilienceKeyBuilder._delimiter}${parts.join(
      ResilienceKeyBuilder._delimiter,
    )}`;
  }

  static new(prefix: string, delimiter = '::') {
    if (ResilienceKeyBuilder._prefix && ResilienceKeyBuilder._delimiter) {
      return this;
    }

    return new ResilienceKeyBuilder(prefix, delimiter);
  }
}
