/**
 * Logger simple para el backend
 * En producción, puede integrarse con servicios como Winston, Pino, etc.
 */

const logLevels = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

const currentLogLevel = process.env.LOG_LEVEL === 'debug' ? logLevels.DEBUG : logLevels.INFO;

const logger = {
    error: (...args) => {
        if (logLevels.ERROR <= currentLogLevel) {
            console.error('[ERROR]', ...args);
        }
    },
    
    warn: (...args) => {
        if (logLevels.WARN <= currentLogLevel) {
            console.warn('[WARN]', ...args);
        }
    },
    
    info: (...args) => {
        if (logLevels.INFO <= currentLogLevel) {
            console.log('[INFO]', ...args);
        }
    },
    
    debug: (...args) => {
        if (logLevels.DEBUG <= currentLogLevel) {
            console.log('[DEBUG]', ...args);
        }
    }
};

export default logger;

