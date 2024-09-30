import winston from 'winston';

const { combine, timestamp, printf, json } = winston.format;

// Function to safely stringify objects with BigInt values
function safeBigIntStringify(obj) {
  return JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint'
      ? value.toString()
      : value
  );
}

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, module, ...metadata }) => {
  let msg = `${timestamp} [${level}] [${module}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${safeBigIntStringify(metadata)}`;
  }
  return msg;
});

// Custom JSON format that handles BigInt
const bigIntSafeJsonFormat = winston.format((info) => {
  const transformed = { ...info };
  Object.keys(transformed).forEach(key => {
    if (typeof transformed[key] === 'bigint') {
      transformed[key] = transformed[key].toString();
    }
  });
  return transformed;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    bigIntSafeJsonFormat(),
    timestamp(),
    json()
  ),
  defaultMeta: { service: 'root-propagator' },
  transports: [
    new winston.transports.Console({
      format: combine(
        timestamp(),
        consoleFormat
      )
    })
  ]
});

// Only add file transports if LOG_TO_FILE environment variable is set to true
if (process.env.LOG_TO_FILE === 'true') {
  logger.add(new winston.transports.File({ filename: 'error.log', level: 'error' }));
  logger.add(new winston.transports.File({ filename: 'combined.log' }));
}

export default logger;

// Helper function to create a logger for a specific module
export function createModuleLogger(moduleName) {
  return {
    info: (message, meta = {}) => logger.info(message, { module: moduleName, ...meta }),
    error: (message, meta = {}) => logger.error(message, { module: moduleName, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { module: moduleName, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { module: moduleName, ...meta }),
  };
}