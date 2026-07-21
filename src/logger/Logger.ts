/**
 * Logger — Structured, leveled logging for the Wacharlo Game SDK.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO  = 1,
  WARN  = 2,
  ERROR = 3,
  SILENT = 4,
}

// Global mutable default logger level to allow muting the whole SDK.
let sdkGlobalLogLevel: LogLevel | null = null;

function getEnvironmentDefaultLevel(): LogLevel {
  let isDev = true;
  try {
    const globalProcess = (globalThis as any).process;
    if (globalProcess && globalProcess.env && globalProcess.env.NODE_ENV === 'production') {
      isDev = false;
    }
  } catch (e) {}

  return isDev ? LogLevel.DEBUG : LogLevel.WARN;
}

export class Logger {
  private readonly prefix: string;
  private minLevel: LogLevel | null = null; // null means fall back to environment default or global override

  constructor(module: string, minLevel?: LogLevel) {
    this.prefix = `[WachaSDK:${module}]`;
    if (minLevel !== undefined) {
      this.minLevel = minLevel;
    }
  }

  private getEffectiveLogLevel(): LogLevel {
    if (sdkGlobalLogLevel !== null) {
      return sdkGlobalLogLevel;
    }
    if (this.minLevel !== null) {
      return this.minLevel;
    }
    return getEnvironmentDefaultLevel();
  }

  /**
   * Sets a global log level override for all logger instances.
   */
  public static setGlobalLevel(level: LogLevel): void {
    sdkGlobalLogLevel = level;
  }

  /**
   * Resets the global log level override.
   */
  public static resetGlobalLevel(): void {
    sdkGlobalLogLevel = null;
  }

  /**
   * Silences all output from this logger instance.
   */
  public mute(): void {
    this.minLevel = LogLevel.SILENT;
  }

  /**
   * Restores output to the environment default.
   */
  public unmute(): void {
    this.minLevel = null;
  }

  /**
   * Sets the minimum log level for this logger instance.
   */
  public setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  public debug(message: string, ...args: unknown[]): void {
    if (this.getEffectiveLogLevel() <= LogLevel.DEBUG) {
      console.debug(this.prefix, message, ...args);
    }
  }

  public info(message: string, ...args: unknown[]): void {
    if (this.getEffectiveLogLevel() <= LogLevel.INFO) {
      console.log(this.prefix, message, ...args);
    }
  }

  public warn(message: string, ...args: unknown[]): void {
    if (this.getEffectiveLogLevel() <= LogLevel.WARN) {
      console.warn(this.prefix, message, ...args);
    }
  }

  public error(message: string, ...args: unknown[]): void {
    if (this.getEffectiveLogLevel() <= LogLevel.ERROR) {
      console.error(this.prefix, message, ...args);
    }
  }
}
