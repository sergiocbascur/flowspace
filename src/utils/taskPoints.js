/**
 * Utilidades para cálculo de puntos de tareas
 * Centraliza la lógica de cálculo de puntos para gamificación
 */

/**
 * Calcula los puntos base según la prioridad
 * @param {object} task - Tarea
 * @returns {number} Puntos base
 */
export function calculateBasePoints(task) {
    const basePoints = {
        'low': 10,
        'medium': 25,
        'high': 50
    };
    return basePoints[task.priority] || 10;
}

/**
 * Calcula el multiplicador de urgencia según tiempo restante
 * @param {object} task - Tarea
 * @param {string} completedBy - ID del usuario que completó
 * @returns {number} Multiplicador (1, 2, o 3)
 */
export function calculateUrgencyMultiplier(task, completedBy) {
    if (!task.dueDate && !task.due) return 1;
    
    const now = new Date();
    let due;
    
    // Manejar diferentes formatos de fecha
    if (task.dueDate) {
        due = new Date(task.dueDate);
    } else if (task.due === 'Hoy') {
        due = new Date();
        due.setHours(23, 59, 59);
    } else if (task.due === 'Mañana') {
        due = new Date();
        due.setDate(due.getDate() + 1);
        due.setHours(23, 59, 59);
    } else if (task.due) {
        due = new Date(task.due);
    } else {
        return 1;
    }
    
    const hoursRemaining = (due - now) / (1000 * 60 * 60);
    
    if (hoursRemaining < 0) return 1; // Ya vencida
    if (hoursRemaining < 24) return 3; // Urgente (< 24 horas)
    if (hoursRemaining < 72) return 2; // Próxima (< 72 horas)
    return 1; // Normal
}

/**
 * Calcula bonus por completar antes de tiempo
 * @param {object} task - Tarea
 * @param {string} completedBy - ID del usuario que completó
 * @returns {number} Bonus (puede ser negativo si se completó tarde)
 */
export function calculateTimeBonus(task, completedBy) {
    if (!task.dueDate && !task.due) return 0;
    
    const now = new Date();
    let due;
    
    // Manejar diferentes formatos de fecha
    if (task.dueDate) {
        due = new Date(task.dueDate);
    } else if (task.due === 'Hoy') {
        due = new Date();
        due.setHours(23, 59, 59);
    } else if (task.due === 'Mañana') {
        due = new Date();
        due.setDate(due.getDate() + 1);
        due.setHours(23, 59, 59);
    } else if (task.due) {
        due = new Date(task.due);
    } else {
        return 0;
    }
    
    const hoursRemaining = (due - now) / (1000 * 60 * 60);
    
    if (hoursRemaining > 48) return 20; // Muy anticipado (> 48 horas)
    if (hoursRemaining > 24) return 10; // Anticipado (> 24 horas)
    if (hoursRemaining > 0) return 0; // A tiempo
    return -10; // Tarde (penalización)
}

/**
 * Calcula bonus por trabajo colaborativo
 * @param {object} task - Tarea
 * @returns {number} Bonus por colaboración
 */
export function calculateCollaborationBonus(task) {
    const assigneeCount = task.assignees?.length || 1;
    if (assigneeCount > 3) return 15;
    if (assigneeCount > 1) return 10;
    return 0;
}

/**
 * Calcula bonus por resolver bloqueos
 * @param {object} task - Tarea
 * @returns {number} Bonus por resolver bloqueo
 */
export function calculateUnblockBonus(task) {
    if (task.blockedBy && task.status === 'completed') {
        return 25; // Bonus por resolver un bloqueo
    }
    return 0;
}

/**
 * Calcula el total de puntos para una tarea completada
 * @param {object} task - Tarea completada
 * @param {string} completedBy - ID del usuario que completó
 * @returns {object} Resultado con puntos y estadísticas
 */
export function calculateTaskPoints(task, completedBy) {
    const base = calculateBasePoints(task);
    const urgencyMultiplier = calculateUrgencyMultiplier(task, completedBy);
    const timeBonus = calculateTimeBonus(task, completedBy);
    const collaborationBonus = calculateCollaborationBonus(task);
    const unblockBonus = calculateUnblockBonus(task);
    
    const total = (base * urgencyMultiplier) + timeBonus + collaborationBonus + unblockBonus;
    
    return {
        points: Math.max(0, Math.round(total)),
        completedOnTime: timeBonus >= 0,
        completedEarly: timeBonus > 0,
        completedLate: timeBonus < 0,
        basePoints: base,
        multiplier: urgencyMultiplier,
        bonuses: {
            time: timeBonus,
            collaboration: collaborationBonus,
            unblock: unblockBonus
        }
    };
}

