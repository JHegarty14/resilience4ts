// Load the config which holds the path aliases.
import { baseConfig } from '../../jest.config';

const config = {
  ...baseConfig,
  testTimeout: 60000,
};

export default config;
