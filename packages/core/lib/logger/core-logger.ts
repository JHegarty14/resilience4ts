import { parentPort } from 'worker_threads';
import { ILogger, LogEntry } from './logger.contract';

type LogEvent = {
  message: string;
  meta?: any[];
  level: keyof ILogger;
};

export class CoreLogger implements ILogger {
  private static impl: CoreLogger;
  private constructor(private readonly loggerImpl: ILogger) {}

  static new(loggerImpl: ILogger) {
    if (!CoreLogger.impl) {
      CoreLogger.impl = new CoreLogger(loggerImpl);
    }

    return CoreLogger.impl;
  }

  static get instance() {
    if (!CoreLogger.impl) {
      throw new Error('CoreLogger cannot be used prior to initialization!');
    }

    return CoreLogger.impl;
  }

  log(level: string, message: string): ILogger;
  log(level: string, message: string, meta: any): ILogger;
  log(level: string, message: string, ...meta: any[]): ILogger;
  log(entry: LogEntry): ILogger;
  log(level: string, message: any): ILogger;
  log(levelOrEntry: string | LogEntry, message?: string | any, meta?: any[]): ILogger {
    if (typeof levelOrEntry === 'string') {
      this[levelOrEntry]?.(message, meta);
    } else {
      this[levelOrEntry.level]?.(levelOrEntry.message, levelOrEntry, meta);
    }
    return this;
  }

  error(message: string): ILogger;
  error(message: string, meta: any): ILogger;
  error(message: string, ...meta: any[]): ILogger;
  error(message: any): ILogger;
  error(infoObject: object): ILogger;
  error(messageOrInfoObj: string | any | object, meta?: any[]): ILogger {
    this.loggerImpl.error(messageOrInfoObj, meta);
    return this;
  }

  warn(message: string): ILogger;
  warn(message: string, meta: any): ILogger;
  warn(message: string, ...meta: any[]): ILogger;
  warn(message: any): ILogger;
  warn(infoObject: object): ILogger;
  warn(messageOrInfoObj: string | any | object, meta?: any[]): ILogger {
    this.loggerImpl.warn(messageOrInfoObj, meta);
    return this;
  }

  info(message: string): ILogger;
  info(message: string, meta: any): ILogger;
  info(message: string, ...meta: any[]): ILogger;
  info(message: any): ILogger;
  info(infoObject: object): ILogger;
  info(messageOrInfoObj: string | any | object, meta?: any[]): ILogger {
    this.loggerImpl.info(messageOrInfoObj, meta);
    return this;
  }

  debug(message: string): ILogger;
  debug(message: string, meta: any): ILogger;
  debug(message: string, ...meta: any[]): ILogger;
  debug(message: any): ILogger;
  debug(infoObject: object): ILogger;
  debug(messageOrInfoObj: string | any | object, meta?: any[]): ILogger {
    this.loggerImpl.debug(messageOrInfoObj, meta);
    return this;
  }
}

parentPort?.on('message', (event: MessageEvent<LogEvent>) => {
  CoreLogger.instance.log(event.data.level, event.data.message, event.data.meta);
});
