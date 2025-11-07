export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: unknown;
  userId?: string;
  businessId?: string;
  requestId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;

  private constructor() {
    this.logLevel = this.getLogLevelFromEnv();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getLogLevelFromEnv(): LogLevel {
    const level = process.env.LOG_LEVEL?.toLowerCase() || "info";
    switch (level) {
      case "error":
        return LogLevel.ERROR;
      case "warn":
        return LogLevel.WARN;
      case "info":
        return LogLevel.INFO;
      case "debug":
        return LogLevel.DEBUG;
      default:
        return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatLog(entry: LogEntry): string {
    if (process.env.NODE_ENV === "production") {
      return JSON.stringify(entry);
    } else {
      // Pretty format for development
      const prefix = `[${entry.timestamp}] [${entry.level}]`;
      const context = entry.requestId ? ` [${entry.requestId}]` : "";
      const business = entry.businessId
        ? ` [Business: ${entry.businessId}]`
        : "";
      return `${prefix}${context}${business} ${entry.message}${entry.data ? "\n" + JSON.stringify(entry.data, null, 2) : ""}`;
    }
  }

  private log(
    level: LogLevel,
    levelName: string,
    message: string,
    data?: unknown,
    context?: {
      userId?: string;
      businessId?: string;
      requestId?: string;
      error?: Error;
    },
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      message,
      data,
      userId: context?.userId,
      businessId: context?.businessId,
      requestId: context?.requestId,
    };

    if (context?.error) {
      entry.error = {
        name: context.error.name,
        message: context.error.message,
        stack: context.error.stack,
      };
    }

    const formatted = this.formatLog(entry);

    if (level === LogLevel.ERROR) {
      console.error(formatted);
    } else if (level === LogLevel.WARN) {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  error(
    message: string,
    error?: Error,
    data?: unknown,
    context?: {
      userId?: string;
      businessId?: string;
      requestId?: string;
    },
  ): void {
    this.log(LogLevel.ERROR, "ERROR", message, data, { ...context, error });
  }

  warn(
    message: string,
    data?: unknown,
    context?: {
      userId?: string;
      businessId?: string;
      requestId?: string;
    },
  ): void {
    this.log(LogLevel.WARN, "WARN", message, data, context);
  }

  info(
    message: string,
    data?: unknown,
    context?: {
      userId?: string;
      businessId?: string;
      requestId?: string;
    },
  ): void {
    this.log(LogLevel.INFO, "INFO", message, data, context);
  }

  debug(
    message: string,
    data?: unknown,
    context?: {
      userId?: string;
      businessId?: string;
      requestId?: string;
    },
  ): void {
    this.log(LogLevel.DEBUG, "DEBUG", message, data, context);
  }

  // Specialized methods for common scenarios
  dbOperation(
    operation: string,
    table: string,
    data?: unknown,
    context?: {
      businessId?: string;
      requestId?: string;
    },
  ): void {
    this.debug(`DB Operation: ${operation} on ${table}`, data, context);
  }

  apiRequest(
    method: string,
    path: string,
    data?: unknown,
    context?: {
      userId?: string;
      requestId?: string;
    },
  ): void {
    this.info(`API ${method} ${path}`, data, context);
  }

  reviewProcessing(
    action: string,
    reviewId: string,
    data?: unknown,
    context?: {
      businessId?: string;
      requestId?: string;
    },
  ): void {
    this.info(`Review ${action}: ${reviewId}`, data, context);
  }

  performance(
    operation: string,
    duration: number,
    context?: {
      businessId?: string;
      requestId?: string;
    },
  ): void {
    this.info(
      `Performance: ${operation} completed in ${duration}ms`,
      undefined,
      context,
    );
  }

  // Create child logger with context
  child(context: {
    userId?: string;
    businessId?: string;
    requestId?: string;
  }): ChildLogger {
    return new ChildLogger(this, context);
  }
}

class ChildLogger {
  constructor(
    private parent: Logger,
    private context: {
      userId?: string;
      businessId?: string;
      requestId?: string;
    },
  ) {}

  error(message: string, error?: Error, data?: unknown): void {
    this.parent.error(message, error, data, this.context);
  }

  warn(message: string, data?: unknown): void {
    this.parent.warn(message, data, this.context);
  }

  info(message: string, data?: unknown): void {
    this.parent.info(message, data, this.context);
  }

  debug(message: string, data?: unknown): void {
    this.parent.debug(message, data, this.context);
  }

  dbOperation(operation: string, table: string, data?: unknown): void {
    this.parent.dbOperation(operation, table, data, this.context);
  }

  reviewProcessing(action: string, reviewId: string, data?: unknown): void {
    this.parent.reviewProcessing(action, reviewId, data, this.context);
  }

  apiRequest(method: string, path: string, data?: unknown): void {
    this.parent.apiRequest(method, path, data, this.context);
  }

  performance(operation: string, duration: number): void {
    this.parent.performance(operation, duration, this.context);
  }
}

export const logger = Logger.getInstance();
