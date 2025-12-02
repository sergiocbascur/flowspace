import rateLimit from 'express-rate-limit';

// Rate limiter para autenticación (login, registro, etc.)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 intentos por ventana
    message: {
        success: false,
        error: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.'
    },
    standardHeaders: true, // Retorna rate limit info en headers `RateLimit-*`
    legacyHeaders: false, // Desactiva headers `X-RateLimit-*`
    skipSuccessfulRequests: false, // Contar todos los requests, incluso los exitosos
    skipFailedRequests: false, // Contar también los requests fallidos
});

// Rate limiter general para API
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requests por ventana
    message: {
        success: false,
        error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // No contar requests exitosos para reducir carga
});

// Rate limiter estricto para operaciones sensibles
export const strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10, // 10 intentos por hora
    message: {
        success: false,
        error: 'Límite de solicitudes excedido. Intenta de nuevo en una hora.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter para creación de recursos (tareas, grupos, etc.)
export const createLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 30, // 30 creaciones por minuto
    message: {
        success: false,
        error: 'Demasiadas creaciones. Espera un momento antes de intentar de nuevo.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter para búsquedas
export const searchLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 60, // 60 búsquedas por minuto
    message: {
        success: false,
        error: 'Demasiadas búsquedas. Espera un momento.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

