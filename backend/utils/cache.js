/**
 * Sistema de caché en memoria simple
 * Para consultas frecuentes que no cambian frecuentemente
 */

class SimpleCache {
    constructor(defaultTTL = 5 * 60 * 1000) { // 5 minutos por defecto
        this.cache = new Map();
        this.defaultTTL = defaultTTL;
    }

    /**
     * Obtiene un valor del caché
     * @param {string} key - Clave del caché
     * @returns {any|null} Valor almacenado o null si no existe/expirado
     */
    get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            return null;
        }
        
        // Verificar si expiró
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }

    /**
     * Almacena un valor en el caché
     * @param {string} key - Clave del caché
     * @param {any} value - Valor a almacenar
     * @param {number} ttl - Tiempo de vida en milisegundos (opcional)
     */
    set(key, value, ttl = null) {
        const expiresAt = Date.now() + (ttl || this.defaultTTL);
        this.cache.set(key, { value, expiresAt });
    }

    /**
     * Elimina un valor del caché
     * @param {string} key - Clave del caché
     */
    delete(key) {
        this.cache.delete(key);
    }

    /**
     * Elimina todos los valores del caché
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Elimina valores que coincidan con un patrón
     * @param {string|RegExp} pattern - Patrón para buscar claves
     */
    deletePattern(pattern) {
        const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Limpia entradas expiradas
     */
    cleanExpired() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiresAt) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Obtiene estadísticas del caché
     * @returns {object} Estadísticas
     */
    getStats() {
        const now = Date.now();
        let expired = 0;
        let active = 0;
        
        for (const item of this.cache.values()) {
            if (now > item.expiresAt) {
                expired++;
            } else {
                active++;
            }
        }
        
        return {
            total: this.cache.size,
            active,
            expired,
            size: this.cache.size
        };
    }
}

// Instancia global del caché
const cache = new SimpleCache(5 * 60 * 1000); // 5 minutos TTL por defecto

// Limpiar entradas expiradas cada 10 minutos
setInterval(() => {
    cache.cleanExpired();
}, 10 * 60 * 1000);

/**
 * Middleware para cachear respuestas GET
 * @param {number} ttl - Tiempo de vida en milisegundos
 * @returns {Function} Middleware de Express
 */
export function cacheMiddleware(ttl = 5 * 60 * 1000) {
    return (req, res, next) => {
        // Solo cachear GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Generar clave única basada en URL y query params
        const key = `cache:${req.originalUrl || req.url}`;
        
        // Intentar obtener del caché
        const cached = cache.get(key);
        if (cached !== null) {
            return res.json(cached);
        }

        // Guardar función original de res.json
        const originalJson = res.json.bind(res);
        
        // Interceptar res.json para cachear la respuesta
        res.json = function(data) {
            // Solo cachear respuestas exitosas
            if (res.statusCode === 200 && data?.success !== false) {
                cache.set(key, data, ttl);
            }
            return originalJson(data);
        };

        next();
    };
}

/**
 * Invalidar caché por patrón
 * @param {string|RegExp} pattern - Patrón para buscar claves
 */
export function invalidateCache(pattern) {
    cache.deletePattern(pattern);
}

/**
 * Obtener estadísticas del caché
 */
export function getCacheStats() {
    return cache.getStats();
}

export default cache;

