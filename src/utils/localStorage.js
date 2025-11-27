// Utilidades para manejar localStorage de forma consistente

const LAST_USER_KEY = 'flowspace_last_user';

/**
 * Guarda el último usuario que inició sesión
 * @param {string} username - Nombre de usuario
 */
export function saveLastUser(username) {
    try {
        localStorage.setItem(LAST_USER_KEY, username);
    } catch (error) {
        console.error('Error guardando último usuario:', error);
    }
}

/**
 * Obtiene el último usuario que inició sesión
 * @returns {string} Nombre de usuario o cadena vacía
 */
export function getLastUser() {
    try {
        return localStorage.getItem(LAST_USER_KEY) || '';
    } catch (error) {
        console.error('Error obteniendo último usuario:', error);
        return '';
    }
}

/**
 * Elimina el último usuario guardado
 */
export function clearLastUser() {
    try {
        localStorage.removeItem(LAST_USER_KEY);
    } catch (error) {
        console.error('Error eliminando último usuario:', error);
    }
}







