/**
 * Logger — Structured, leveled logging for the Wacharlo Game SDK.
 */
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["SILENT"] = 4] = "SILENT";
})(LogLevel || (LogLevel = {}));
// Global mutable default logger level to allow muting the whole SDK.
let sdkGlobalLogLevel = null;
function getEnvironmentDefaultLevel() {
    let isDev = true;
    try {
        const globalProcess = globalThis.process;
        if (globalProcess && globalProcess.env && globalProcess.env.NODE_ENV === 'production') {
            isDev = false;
        }
    }
    catch (e) { }
    return isDev ? LogLevel.DEBUG : LogLevel.WARN;
}
export class Logger {
    prefix;
    minLevel = null; // null means fall back to environment default or global override
    constructor(module, minLevel) {
        this.prefix = `[WachaSDK:${module}]`;
        if (minLevel !== undefined) {
            this.minLevel = minLevel;
        }
    }
    getEffectiveLogLevel() {
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
    static setGlobalLevel(level) {
        sdkGlobalLogLevel = level;
    }
    /**
     * Resets the global log level override.
     */
    static resetGlobalLevel() {
        sdkGlobalLogLevel = null;
    }
    /**
     * Silences all output from this logger instance.
     */
    mute() {
        this.minLevel = LogLevel.SILENT;
    }
    /**
     * Restores output to the environment default.
     */
    unmute() {
        this.minLevel = null;
    }
    /**
     * Sets the minimum log level for this logger instance.
     */
    setLevel(level) {
        this.minLevel = level;
    }
    debug(message, ...args) {
        if (this.getEffectiveLogLevel() <= LogLevel.DEBUG) {
            console.debug(this.prefix, message, ...args);
        }
    }
    info(message, ...args) {
        if (this.getEffectiveLogLevel() <= LogLevel.INFO) {
            console.log(this.prefix, message, ...args);
        }
    }
    warn(message, ...args) {
        if (this.getEffectiveLogLevel() <= LogLevel.WARN) {
            console.warn(this.prefix, message, ...args);
        }
    }
    error(message, ...args) {
        if (this.getEffectiveLogLevel() <= LogLevel.ERROR) {
            console.error(this.prefix, message, ...args);
        }
    }
}
//# sourceMappingURL=Logger.js.map