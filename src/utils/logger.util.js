class LoggerUtil {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL;
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
  }

  _shouldLog(level) {
    return this.levels[level] >= this.levels[this.logLevel];
  }

  _formatMessage(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...data
    };
    return JSON.stringify(logEntry, null, 2);
  }

  debug(message, data = {}) {
    if (this._shouldLog('debug')) {
      console.log(this._formatMessage('debug', message, data));
    }
  }

  info(message, data = {}) {
    if (this._shouldLog('info')) {
      console.log(this._formatMessage('info', message, data));
    }
  }

  warn(message, data = {}) {
    if (this._shouldLog('warn')) {
      console.warn(this._formatMessage('warn', message, data));
    }
  }

  error(message, error = null, data = {}) {
    if (this._shouldLog('error')) {
      const errorData = {
        ...data,
        error: error ? {
          message: error.message,
          stack: error.stack,
          ...(error.response?.data && { responseData: error.response.data })
        } : undefined
      };
      console.error(this._formatMessage('error', message, errorData));
    }
  }
}

module.exports = new LoggerUtil();
