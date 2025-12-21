/**
 * Simple structured logger with log levels
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";
const currentLevelValue = LOG_LEVELS[currentLevel] ?? LOG_LEVELS.info;

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= currentLevelValue;
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
): string {
  const timestamp = formatTimestamp();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("debug")) {
      console.debug(formatMessage("debug", message, meta));
    }
  },

  info(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("info")) {
      console.info(formatMessage("info", message, meta));
    }
  },

  warn(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", message, meta));
    }
  },

  error(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("error")) {
      console.error(formatMessage("error", message, meta));
    }
  },

  /**
   * Log an HTTP request (at info level)
   */
  request(
    requestId: string,
    method: string,
    path: string,
    status: number,
    durationMs: number,
    meta?: Record<string, unknown>
  ) {
    const level: LogLevel = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    if (shouldLog(level)) {
      console[level === "error" ? "error" : level === "warn" ? "warn" : "info"](
        formatMessage(level, `${method} ${path} ${status} ${durationMs}ms`, {
          requestId,
          ...meta,
        })
      );
    }
  },

  /**
   * Log AI API call (at debug level normally, warn on error)
   */
  ai(
    operation: string,
    durationMs: number,
    meta?: Record<string, unknown>
  ) {
    this.debug(`AI ${operation} completed in ${durationMs}ms`, meta);
  },

  aiError(operation: string, error: unknown, meta?: Record<string, unknown>) {
    const message = error instanceof Error ? error.message : String(error);
    this.error(`AI ${operation} failed: ${message}`, meta);
  },
};

export type Logger = typeof logger;
