import { ResilienceProviderService } from '../';
import { ResilienceConfig } from '../types';

jest.setTimeout(10000);

let svc: ResilienceProviderService;
let redisHost: string;
let redisPort: number;

describe('ResilienceProviderService', () => {
  beforeAll(async () => {
    redisHost = '127.0.0.1';
    redisPort = 6379;
    const config: ResilienceConfig = {
      resilience: {
        serviceName: 'r4t-test',
      },
      redis: {
        redisHost,
        redisPort,
        redisPassword: '',
        redisUser: '',
        redisPrefix: 'r4t-test',
      },
    };
    svc = ResilienceProviderService.forRoot(config);
    await svc.start();
  });

  it('should initialize ResilienceProviderService', async () => {
    expect(svc.cache).toBeDefined();
  });
});
