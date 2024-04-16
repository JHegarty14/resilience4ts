import { BaseLogger } from 'pino';
import { ICacheFacade } from './cache-facade.interface';
import { RedisClientInstance } from './cache.service';

export class LuaCmdFacade implements ICacheFacade {
  constructor(
    private readonly cache: RedisClientInstance,
    private readonly logger: BaseLogger,
  ) {}
}
