export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export class Logger {
  private readonly logLevel: LogLevel

  constructor(logLevel: LogLevel = LogLevel.INFO) {
    this.logLevel = logLevel
  }

  error(message: string, meta?: any): void {
    if (this.logLevel >= LogLevel.ERROR) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta || '')
    }
  }

  warn(message: string, meta?: any): void {
    if (this.logLevel >= LogLevel.WARN) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || '')
    }
  }

  info(message: string, meta?: any): void {
    if (this.logLevel >= LogLevel.INFO) {
      console.warn(`[INFO] ${new Date().toISOString()} - ${message}`, meta || '')
    }
  }

  debug(message: string, meta?: any): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      console.warn(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta || '')
    }
  }
}
