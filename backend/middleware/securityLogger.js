import logger from '../utils/logger.js';

// Si logger no existe, usar console como fallback
const log = logger || console;

/**
 * Registra eventos de seguridad importantes
 * @param {string} eventType - Tipo de evento (LOGIN_FAILED, LOGIN_SUCCESS, ADMIN_ACTION, etc.)
 * @param {object} details - Detalles del evento
 * @param {object} req - Request object de Express
 */
export function logSecurityEvent(eventType, details, req) {
    const logData = {
        timestamp: new Date().toISOString(),
        eventType,
        ip: req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        userId: req.user?.userId || details?.userId || 'anonymous',
        path: req.path || req.url,
        method: req.method,
        details
    };
    
    // Log según el tipo de evento
    switch (eventType) {
        case 'LOGIN_FAILED':
        case 'LOGIN_ATTEMPT':
            log.warn(`[SECURITY] ${eventType}`, logData);
            break;
        case 'LOGIN_SUCCESS':
            log.info(`[SECURITY] ${eventType}`, logData);
            break;
        case 'ADMIN_ACTION':
        case 'ACCOUNT_DELETED':
        case 'PASSWORD_RESET':
            log.warn(`[SECURITY] ${eventType}`, logData);
            break;
        default:
            log.info(`[SECURITY] ${eventType}`, logData);
    }
    
    // En producción, aquí podrías enviar a un servicio de monitoreo
    // Ejemplo: Sentry, LogRocket, CloudWatch, etc.
    if (process.env.NODE_ENV === 'production' && process.env.SECURITY_LOG_WEBHOOK) {
        // Enviar a webhook de monitoreo (opcional)
        // fetch(process.env.SECURITY_LOG_WEBHOOK, { method: 'POST', body: JSON.stringify(logData) })
    }
}

/**
 * Middleware para logging automático de eventos de seguridad
 */
export function securityLoggerMiddleware(req, res, next) {
    // Log intentos de login fallidos
    if (req.path.includes('/login') && req.method === 'POST') {
        const originalSend = res.send;
        res.send = function(data) {
            try {
                const responseData = typeof data === 'string' ? JSON.parse(data) : data;
                if (res.statusCode === 401 || res.statusCode === 403) {
                    logSecurityEvent('LOGIN_FAILED', {
                        username: req.body.username,
                        reason: responseData.error || 'Invalid credentials'
                    }, req);
                } else if (res.statusCode === 200 && responseData.success) {
                    logSecurityEvent('LOGIN_SUCCESS', {
                        userId: responseData.user?.id || 'unknown'
                    }, req);
                }
            } catch (error) {
                // Si no se puede parsear, continuar
            }
            originalSend.call(this, data);
        };
    }
    
    // Log cambios administrativos
    if (req.method === 'DELETE' || req.path.includes('/admin')) {
        const originalSend = res.send;
        res.send = function(data) {
            logSecurityEvent('ADMIN_ACTION', {
                path: req.path,
                method: req.method,
                userId: req.user?.userId
            }, req);
            originalSend.call(this, data);
        };
    }
    
    // Log eliminación de cuentas
    if (req.path.includes('/account') && req.method === 'DELETE') {
        const originalSend = res.send;
        res.send = function(data) {
            logSecurityEvent('ACCOUNT_DELETED', {
                userId: req.user?.userId
            }, req);
            originalSend.call(this, data);
        };
    }
    
    // Log reset de contraseña
    if (req.path.includes('/reset-password') && req.method === 'POST') {
        logSecurityEvent('PASSWORD_RESET', {
            email: req.body.email
        }, req);
    }
    
    next();
}

