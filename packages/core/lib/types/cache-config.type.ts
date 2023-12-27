export type PersistenceConfig = {
  REDIS_PREFIX: `r4t-${string}`;
  REDIS_HOST: string;
  REDIS_PORT?: number;
  REDIS_USER: string;
  REDIS_PASSWORD: string;
  REDIS_MAX_ATTEMPTS?: number;
  REDIS_MAX_BACKOFF?: number;
  REDIS_BACKOFF_INCREMENT?: number;
};
