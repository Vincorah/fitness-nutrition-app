/**
 * Logger Utility
 * Winston-based logging with file and console transports
 */

const winston = require('winston');
const path = require('path');

// Log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format (for development)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'fitness-nutrition-api' },
  transports: [
    // Write logs to files
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// Request logger middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user?.userId || null,
    };

    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
};

// Error logger
const logError = (err, req = null) => {
  const logData = {
    message: err.message,
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode,
  };

  if (req) {
    logData.method = req.method;
    logData.url = req.originalUrl;
    logData.ip = req.ip || req.connection.remoteAddress;
    logData.userId = req.user?.userId || null;
  }

  logger.error('Application error', logData);
};

// Activity logger
const logActivity = (userId, action, details = {}) => {
  logger.info('User activity', {
    userId,
    action,
    details,
    timestamp: new Date().toISOString(),
  });
};

// Database query logger
const logQuery = (sql, params, duration) => {
  logger.debug('Database query', {
    sql: sql.substring(0, 200), // Truncate long queries
    params: JSON.stringify(params).substring(0, 200),
    duration: `${duration}ms`,
  });
};

module.exports = {
  logger,
  requestLogger,
  logError,
  logActivity,
  logQuery,
};
