import { pool } from '../db/connection.js';
import logger from '../utils/logger.js';

/**
 * Sistema automatizado de desafíos
 * Crea desafíos semanales y mensuales automáticamente
 */

/**
 * Crear desafío semanal automático
 */
export async function createWeeklyChallenge() {
    try {
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - startDate.getDay()); // Lunes de esta semana
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6); // Domingo de esta semana
        endDate.setHours(23, 59, 59, 999);

        // Verificar si ya existe un desafío semanal para esta semana
        const existingCheck = await pool.query(`
            SELECT id FROM challenges 
            WHERE type = 'weekly' 
            AND start_date <= $1 
            AND end_date >= $1
            AND active = true
        `, [now]);

        if (existingCheck.rows.length > 0) {
            logger.info('[CHALLENGE] Desafío semanal ya existe para esta semana');
            return;
        }

        // Crear desafío semanal
        const challengeId = `challenge-weekly-${Date.now()}`;
        await pool.query(`
            INSERT INTO challenges (
                id, name, description, type, goal_points, goal_tasks,
                start_date, end_date, active, reward_badge, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        `, [
            challengeId,
            `Desafío Semanal - Semana del ${startDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}`,
            'Completa tareas y gana puntos esta semana. ¡Compite con tus contactos!',
            'weekly',
            500, // Meta de puntos
            20,  // Meta de tareas
            startDate.toISOString(),
            endDate.toISOString(),
            true,
            null, // Sin badge específico para desafíos semanales
        ]);

        logger.info(`[CHALLENGE] Desafío semanal creado: ${challengeId}`);
        return challengeId;
    } catch (error) {
        logger.error('[CHALLENGE] Error creando desafío semanal:', error);
        throw error;
    }
}

/**
 * Crear desafío mensual automático
 */
export async function createMonthlyChallenge() {
    try {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);

        // Verificar si ya existe un desafío mensual para este mes
        const existingCheck = await pool.query(`
            SELECT id FROM challenges 
            WHERE type = 'monthly' 
            AND start_date <= $1 
            AND end_date >= $1
            AND active = true
        `, [now]);

        if (existingCheck.rows.length > 0) {
            logger.info('[CHALLENGE] Desafío mensual ya existe para este mes');
            return;
        }

        // Crear desafío mensual
        const challengeId = `challenge-monthly-${Date.now()}`;
        const monthName = now.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
        
        await pool.query(`
            INSERT INTO challenges (
                id, name, description, type, goal_points, goal_tasks,
                start_date, end_date, active, reward_badge, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        `, [
            challengeId,
            `Desafío Mensual - ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`,
            'Completa tareas durante todo el mes. ¡Llega a la cima del ranking!',
            'monthly',
            2000, // Meta de puntos mensual
            80,   // Meta de tareas mensual
            startDate.toISOString(),
            endDate.toISOString(),
            true,
            null, // Sin badge específico para desafíos mensuales
        ]);

        logger.info(`[CHALLENGE] Desafío mensual creado: ${challengeId}`);
        return challengeId;
    } catch (error) {
        logger.error('[CHALLENGE] Error creando desafío mensual:', error);
        throw error;
    }
}

/**
 * Actualizar progreso de usuarios en desafíos activos
 */
export async function updateChallengeProgress() {
    try {
        // Obtener desafíos activos
        const activeChallenges = await pool.query(`
            SELECT id, goal_points, goal_tasks, start_date, end_date
            FROM challenges
            WHERE active = true
            AND start_date <= NOW()
            AND end_date >= NOW()
        `);

        for (const challenge of activeChallenges.rows) {
            // Obtener progreso de usuarios en el período del desafío
            const progressResult = await pool.query(`
                SELECT 
                    ph.user_id,
                    SUM(ph.points_earned) as total_points,
                    SUM(ph.tasks_completed) as total_tasks
                FROM points_history ph
                WHERE ph.date >= $1
                AND ph.date <= $2
                GROUP BY ph.user_id
            `, [challenge.start_date, challenge.end_date]);

            // Actualizar o crear progreso para cada usuario
            for (const progress of progressResult.rows) {
                const completed = 
                    progress.total_points >= challenge.goal_points &&
                    progress.total_tasks >= challenge.goal_tasks;

                await pool.query(`
                    INSERT INTO challenge_progress (
                        user_id, challenge_id, current_points, current_tasks, completed, last_updated
                    ) VALUES ($1, $2, $3, $4, $5, NOW())
                    ON CONFLICT (user_id, challenge_id) 
                    DO UPDATE SET
                        current_points = $3,
                        current_tasks = $4,
                        completed = $5,
                        last_updated = NOW()
                `, [
                    progress.user_id,
                    challenge.id,
                    parseInt(progress.total_points) || 0,
                    parseInt(progress.total_tasks) || 0,
                    completed
                ]);
            }
        }

        logger.info('[CHALLENGE] Progreso de desafíos actualizado');
    } catch (error) {
        logger.error('[CHALLENGE] Error actualizando progreso de desafíos:', error);
        throw error;
    }
}

/**
 * Desactivar desafíos vencidos
 */
export async function deactivateExpiredChallenges() {
    try {
        const result = await pool.query(`
            UPDATE challenges
            SET active = false
            WHERE active = true
            AND end_date < NOW()
        `);

        if (result.rowCount > 0) {
            logger.info(`[CHALLENGE] ${result.rowCount} desafíos desactivados`);
        }
    } catch (error) {
        logger.error('[CHALLENGE] Error desactivando desafíos vencidos:', error);
        throw error;
    }
}

/**
 * Ejecutar todas las tareas de desafíos
 */
export async function runChallengeTasks() {
    try {
        logger.info('[CHALLENGE] Iniciando tareas de desafíos...');
        
        // Desactivar desafíos vencidos
        await deactivateExpiredChallenges();
        
        // Crear desafíos semanales y mensuales si no existen
        await createWeeklyChallenge();
        await createMonthlyChallenge();
        
        // Actualizar progreso de usuarios
        await updateChallengeProgress();
        
        logger.info('[CHALLENGE] Tareas de desafíos completadas');
    } catch (error) {
        logger.error('[CHALLENGE] Error ejecutando tareas de desafíos:', error);
        throw error;
    }
}
