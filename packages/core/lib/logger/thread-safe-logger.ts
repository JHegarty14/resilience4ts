import { MessagePort } from 'worker_threads';
import { ILogger, LogEntry } from './logger.contract';

export class ThreadSafeLogger implements ILogger {
  constructor(private readonly parentPort: MessagePort) {}

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
    const logObj = this.buildLogObject('error', messageOrInfoObj, meta);

    this.parentPort.postMessage(logObj);
    return this;
  }

  warn(message: string): ILogger;
  warn(message: string, meta: any): ILogger;
  warn(message: string, ...meta: any[]): ILogger;
  warn(message: any): ILogger;
  warn(infoObject: object): ILogger;
  warn(messageOrInfoObj: string | any | object, meta?: any[]): ILogger {
    const logObj = this.buildLogObject('warn', messageOrInfoObj, meta);

    this.parentPort.postMessage(logObj);
    return this;
  }

  info(message: string): ILogger;
  info(message: string, meta: any): ILogger;
  info(message: string, ...meta: any[]): ILogger;
  info(message: any): ILogger;
  info(infoObject: object): ILogger;
  info(messageOrInfoObj: string | any | object, meta?: any[]): ILogger {
    const logObj = this.buildLogObject('info', messageOrInfoObj, meta);

    this.parentPort.postMessage(logObj);
    return this;
  }

  debug(message: string): ILogger;
  debug(message: string, meta: any): ILogger;
  debug(message: string, ...meta: any[]): ILogger;
  debug(message: any): ILogger;
  debug(infoObject: object): ILogger;
  debug(messageOrInfoObj: string | any | object, meta?: any[]): ILogger {
    const logObj = this.buildLogObject('debug', messageOrInfoObj, meta);

    this.parentPort.postMessage(logObj);
    return this;
  }

  private buildLogObject(
    level: keyof ILogger,
    messageOrInfoObj: string | any | object,
    meta?: any[],
  ) {
    const logObj =
      typeof messageOrInfoObj === 'string'
        ? {
            message: messageOrInfoObj,
            meta: meta,
            level,
          }
        : { ...messageOrInfoObj, meta, level };
    return logObj;
  }
}
