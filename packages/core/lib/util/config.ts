import { readFileSync } from 'fs';
import toml from 'toml';
import { ConfigFileExtensions, ResilienceConfig } from '../types';
import { assertUnreachable } from './common';

const validExtensions = new Set(['json', 'toml']);

export class ConfigLoader {
  static getFileType(path: string): ConfigFileExtensions {
    const fileType = path.split('.').pop();
    if (!fileType || !validExtensions.has(fileType.toLocaleLowerCase())) {
      throw new Error('Invalid file type');
    }

    return fileType as ConfigFileExtensions;
  }

  static loadConfig(path: string): ResilienceConfig {
    const fileType = ConfigLoader.getFileType(path);
    switch (fileType) {
      case ConfigFileExtensions.Json:
        return ConfigLoader.loadJsonConfig(path);
      case ConfigFileExtensions.Toml:
        return ConfigLoader.loadTomlConfig(path);
      default:
        assertUnreachable(fileType);
    }
  }

  private static loadJsonConfig(path: string): ResilienceConfig {
    const config = JSON.parse(readFileSync(path, 'utf-8'));
    return config as ResilienceConfig;
  }

  private static loadTomlConfig(path: string): ResilienceConfig {
    const config = toml.parse(readFileSync(path, 'utf-8'));
    return config as ResilienceConfig;
  }
}
