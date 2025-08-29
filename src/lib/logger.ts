interface LogContext {
  userId?: string;
  requestId?: string;
  action?: string;
  resource?: string;
  metadata?: Record<string, any>;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  private formatLog(level: LogLevel, message: string, context?: LogContext, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        ...(this.isDevelopment && { stack: error.stack })
      };
    }

    return entry;
  }

  private writeLog(entry: LogEntry) {
    const logString = JSON.stringify(entry, null, this.isDevelopment ? 2 : 0);
    
    switch (entry.level) {
      case 'debug':
        if (this.isDevelopment) console.debug(logString);
        break;
      case 'info':
        console.info(logString);
        break;
      case 'warn':
        console.warn(logString);
        break;
      case 'error':
        console.error(logString);
        break;
    }
  }

  debug(message: string, context?: LogContext) {
    const entry = this.formatLog('debug', message, context);
    this.writeLog(entry);
  }

  info(message: string, context?: LogContext) {
    const entry = this.formatLog('info', message, context);
    this.writeLog(entry);
  }

  warn(message: string, context?: LogContext, error?: Error) {
    const entry = this.formatLog('warn', message, context, error);
    this.writeLog(entry);
  }

  error(message: string, context?: LogContext, error?: Error) {
    const entry = this.formatLog('error', message, context, error);
    this.writeLog(entry);
  }

  // Specialized logging methods for common use cases
  apiRequest(method: string, path: string, userId?: string, requestId?: string) {
    this.info('API request received', {
      userId,
      requestId,
      action: 'api_request',
      resource: `${method} ${path}`
    });
  }

  apiResponse(method: string, path: string, statusCode: number, duration: number, userId?: string, requestId?: string) {
    const level: LogLevel = statusCode >= 400 ? 'warn' : 'info';
    this[level]('API response sent', {
      userId,
      requestId,
      action: 'api_response',
      resource: `${method} ${path}`,
      metadata: {
        statusCode,
        duration: `${duration}ms`
      }
    });
  }

  authAttempt(email: string, success: boolean, requestId?: string) {
    const level: LogLevel = success ? 'info' : 'warn';
    this[level]('Authentication attempt', {
      requestId,
      action: 'auth_attempt',
      resource: 'authentication',
      metadata: {
        email,
        success
      }
    });
  }

  leaveRequest(action: 'create' | 'update' | 'approve' | 'reject', requestId: string, userId: string, adminId?: string) {
    this.info(`Leave request ${action}`, {
      userId: adminId || userId,
      action: `leave_request_${action}`,
      resource: 'leave_request',
      metadata: {
        leaveRequestId: requestId,
        targetUserId: userId,
        ...(adminId && { adminId })
      }
    });
  }

  cacheOperation(operation: 'hit' | 'miss' | 'set' | 'delete', key: string, ttl?: number) {
    this.debug(`Cache ${operation}`, {
      action: `cache_${operation}`,
      resource: 'cache',
      metadata: {
        key,
        ...(ttl && { ttl })
      }
    });
  }

  performanceMetric(operation: string, duration: number, metadata?: Record<string, any>) {
    const level: LogLevel = duration > 1000 ? 'warn' : 'debug';
    this[level]('Performance metric', {
      action: 'performance_metric',
      resource: operation,
      metadata: {
        duration: `${duration}ms`,
        threshold: duration > 1000 ? 'exceeded' : 'normal',
        ...metadata
      }
    });
  }

  securityEvent(event: string, severity: 'low' | 'medium' | 'high', userId?: string, metadata?: Record<string, any>) {
    const level: LogLevel = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';
    this[level](`Security event: ${event}`, {
      userId,
      action: 'security_event',
      resource: 'security',
      metadata: {
        event,
        severity,
        ...metadata
      }
    });
  }
}

// Create singleton instance
export const logger = new Logger();

// Performance monitoring wrapper
export function withPerformanceLogging<T extends (...args: any[]) => any>(
  fn: T,
  operationName: string
): T {
  return ((...args: Parameters<T>) => {
    const start = performance.now();
    const result = fn(...args);

    if (result instanceof Promise) {
      return result
        .then((res) => {
          const duration = performance.now() - start;
          logger.performanceMetric(operationName, duration);
          return res;
        })
        .catch((err) => {
          const duration = performance.now() - start;
          logger.performanceMetric(operationName, duration, { error: true });
          throw err;
        });
    } else {
      const duration = performance.now() - start;
      logger.performanceMetric(operationName, duration);
      return result;
    }
  }) as T;
}

// Request ID utilities
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Error logging helper
export function logError(error: Error, context?: LogContext) {
  logger.error(error.message, context, error);
}

// Success logging helper
export function logSuccess(message: string, context?: LogContext) {
  logger.info(message, context);
}