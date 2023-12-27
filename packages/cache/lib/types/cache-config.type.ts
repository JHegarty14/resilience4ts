export type CacheConfig = {
  /**
   * Key builder function that extracts a key from the arguments passed to the
   * decorated method.
   */
  readonly extractKey: (...args: any[]) => string;

  /**
   * TTL in seconds. Defaults to 60 * 15 (or, 15 minutes).
   */
  readonly expiration: number;
};

export class CacheConfigImpl implements CacheConfig {
  extractKey: (...args: any[]) => string;
  expiration: number;

  constructor({ extractKey, expiration }: CacheConfig) {
    this.extractKey = extractKey;
    this.expiration = expiration ?? 60 * 15;
  }
  withExpiration(expiration: number) {
    this.expiration = expiration;
    return this;
  }
  withKey(withKey: (...args: any[]) => string) {
    this.extractKey = withKey;
    return this;
  }
}
