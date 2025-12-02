/**
 * Utilidades para manejo de fechas
 * Centraliza la lógica de formateo y cálculo de fechas
 */

/**
 * Formatea una fecha según el formato especificado
 * @param {string|Date} dateString - Fecha a formatear
 * @param {string} format - Formato: 'short', 'long', 'time'
 * @returns {string} Fecha formateada
 */
export function formatDate(dateString, format = 'short') {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const options = {
        short: { day: 'numeric', month: 'short' },
        long: { day: 'numeric', month: 'long', year: 'numeric' },
        time: { hour: '2-digit', minute: '2-digit' },
        datetime: { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
    };
    
    return date.toLocaleDateString('es-CL', options[format] || options.short);
}

/**
 * Verifica si una fecha está vencida
 * @param {string|Date} dateString - Fecha a verificar
 * @returns {boolean} true si está vencida
 */
export function isOverdue(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    return date < new Date();
}

/**
 * Obtiene los días hasta una fecha
 * @param {string|Date} dateString - Fecha objetivo
 * @returns {number|null} Días hasta la fecha, null si no es válida
 */
export function getDaysUntil(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    
    const now = new Date();
    const diff = date - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Obtiene la fecha de hoy en formato ISO (YYYY-MM-DD)
 * @returns {string} Fecha de hoy
 */
export function getTodayISO() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Obtiene la fecha de mañana en formato ISO (YYYY-MM-DD)
 * @returns {string} Fecha de mañana
 */
export function getTomorrowISO() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

/**
 * Convierte una fecha relativa ('Hoy', 'Mañana') a fecha ISO
 * @param {string} dateString - Fecha relativa o ISO
 * @returns {string|null} Fecha ISO o null si no es válida
 */
export function parseRelativeDate(dateString) {
    if (!dateString) return null;
    
    if (dateString === 'Hoy') return getTodayISO();
    if (dateString === 'Mañana') return getTomorrowISO();
    
    // Intentar parsear como fecha ISO
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
    }
    
    return null;
}

/**
 * Verifica si una tarea fue completada hoy
 * @param {string|Date} completedAt - Fecha de completado
 * @returns {boolean} true si fue completada hoy
 */
export function isCompletedToday(completedAt) {
    if (!completedAt) return false;
    
    const completedDate = new Date(completedAt);
    const today = new Date();
    
    today.setHours(0, 0, 0, 0);
    completedDate.setHours(0, 0, 0, 0);
    
    return completedDate.getTime() === today.getTime();
}

/**
 * Verifica si una tarea fue completada hace más de N días
 * @param {string|Date} completedAt - Fecha de completado
 * @param {number} days - Número de días
 * @returns {boolean} true si fue completada hace más de N días
 */
export function isCompletedMoreThanDaysAgo(completedAt, days = 0) {
    if (!completedAt) return false;
    
    const completedDate = new Date(completedAt);
    const today = new Date();
    
    today.setHours(0, 0, 0, 0);
    completedDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today - completedDate) / (1000 * 60 * 60 * 24));
    return daysDiff > days;
}

