export interface ILogger {
  error: LeveledLogMethod;
  warn: LeveledLogMethod;
  info: LeveledLogMethod;
  debug: LeveledLogMethod;
}

export interface LeveledLogMethod {
  (message: string, callback: LogCallback): ILogger;
  (message: string, meta: any, callback: LogCallback): ILogger;
  (message: string, ...meta: any[]): ILogger;
  (message: any): ILogger;
  (infoObject: object): ILogger;
}

export type LogCallback = (error?: any, level?: string, message?: string, meta?: any) => void;

export interface LogEntry {
  level: string;
  message: string;
  [optionName: string]: any;
}
