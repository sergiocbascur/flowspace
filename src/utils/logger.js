/**
 * Sistema de logging para desarrollo y producción
 * En producción, solo muestra errores críticos
 */

const isDevelopment = import.meta.env.DEV;

const logLevels = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

const currentLogLevel = isDevelopment ? logLevels.DEBUG : logLevels.ERROR;

const logger = {
    debug: (...args) => {
        if (currentLogLevel <= logLevels.DEBUG) {
            console.log('[DEBUG]', ...args);
        }
    },

    info: (...args) => {
        if (currentLogLevel <= logLevels.INFO) {
            console.info('[INFO]', ...args);
        }
    },

    warn: (...args) => {
        if (currentLogLevel <= logLevels.WARN) {
            console.warn('[WARN]', ...args);
        }
    },

    error: (...args) => {
        if (currentLogLevel <= logLevels.ERROR) {
            console.error('[ERROR]', ...args);
        }
    }
};

export default logger;


