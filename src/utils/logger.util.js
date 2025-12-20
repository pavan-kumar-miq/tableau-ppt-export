const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const DEFAULT_LOG_LEVEL = "info";

/**
 * Structured JSON logger with configurable log levels.
 * Outputs logs in JSON format for easy parsing and analysis.
 */
class LoggerUtil {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || DEFAULT_LOG_LEVEL;
    this.levels = LOG_LEVELS;
  }

  /**
   * Determines if a message should be logged based on current log level.
   *
   * @param {string} level - Log level to check
   * @returns {boolean} True if message should be logged
   * @private
   */
  _shouldLog(level) {
    return this.levels[level] >= this.levels[this.logLevel];
  }

  /**
   * Formats log entry as JSON string with timestamp and context.
   *
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {object} [data={}] - Additional context data
   * @returns {string} Formatted JSON log entry
   * @private
   */
  _formatMessage(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...data,
    };
    return JSON.stringify(logEntry, null, 2);
  }

  /**
   * Logs debug message if debug level enabled.
   *
   * @param {string} message - Debug message
   * @param {object} [data={}] - Additional context
   */
  debug(message, data = {}) {
    if (this._shouldLog("debug")) {
      console.log(this._formatMessage("debug", message, data));
    }
  }

  /**
   * Logs informational message.
   *
   * @param {string} message - Info message
   * @param {object} [data={}] - Additional context
   */
  info(message, data = {}) {
    if (this._shouldLog("info")) {
      console.log(this._formatMessage("info", message, data));
    }
  }

  /**
   * Logs warning message.
   *
   * @param {string} message - Warning message
   * @param {object} [data={}] - Additional context
   */
  warn(message, data = {}) {
    if (this._shouldLog("warn")) {
      console.warn(this._formatMessage("warn", message, data));
    }
  }

  /**
   * Logs error message with optional Error object.
   * Automatically extracts error details including response data.
   *
   * @param {string} message - Error message
   * @param {Error} [error=null] - Error object
   * @param {object} [data={}] - Additional context
   */
  error(message, error = null, data = {}) {
    if (this._shouldLog("error")) {
      const errorData = {
        ...data,
        error: error
          ? {
              message: error.message,
              stack: error.stack,
              ...(error.response?.data && {
                responseData: error.response.data,
              }),
            }
          : undefined,
      };
      console.error(this._formatMessage("error", message, errorData));
    }
  }
}

module.exports = new LoggerUtil();
