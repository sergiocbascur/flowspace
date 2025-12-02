import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from './auth.js';
import { pool } from '../db/connection.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener desafíos activos
router.get('/active', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const result = await pool.query(`
            SELECT 
                id,
                name,
                description,
                type,
                start_date,
                end_date,
                target_points,
                target_tasks,
                reward_badge
            FROM challenges
            WHERE active = true
            AND start_date <= $1
            AND end_date >= $1
            ORDER BY type, start_date DESC
        `, [today]);

        const challenges = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            type: row.type,
            startDate: row.start_date,
            endDate: row.end_date,
            targetPoints: row.target_points,
            targetTasks: row.target_tasks,
            rewardBadge: row.reward_badge
        }));

        res.json({ success: true, challenges });
    } catch (error) {
        console.error('Error obteniendo desafíos activos:', error);
        res.status(500).json({ success: false, error: 'Error al obtener desafíos' });
    }
});

// Obtener progreso del usuario en desafíos
router.get('/my-progress', async (req, res) => {
    try {
        const userId = req.user.userId;
        const today = new Date().toISOString().split('T')[0];

        // Obtener desafíos activos con progreso del usuario
        const result = await pool.query(`
            SELECT 
                c.id,
                c.name,
                c.description,
                c.type,
                c.start_date,
                c.end_date,
                c.target_points,
                c.target_tasks,
                c.reward_badge,
                COALESCE(cp.points_earned, 0) as points_earned,
                COALESCE(cp.tasks_completed, 0) as tasks_completed,
                COALESCE(cp.completed, false) as completed,
                cp.completed_at
            FROM challenges c
            LEFT JOIN challenge_progress cp ON c.id = cp.challenge_id AND cp.user_id = $1
            WHERE c.active = true
            AND c.start_date <= $2
            AND c.end_date >= $2
            ORDER BY c.type, c.start_date DESC
        `, [userId, today]);

        const progress = result.rows.map(row => {
            const pointsProgress = row.target_points ? (row.points_earned / row.target_points) * 100 : 0;
            const tasksProgress = row.target_tasks ? (row.tasks_completed / row.target_tasks) * 100 : 0;
            const overallProgress = row.target_points && row.target_tasks
                ? (pointsProgress + tasksProgress) / 2
                : pointsProgress || tasksProgress;

            return {
                challengeId: row.id,
                name: row.name,
                description: row.description,
                type: row.type,
                startDate: row.start_date,
                endDate: row.end_date,
                targetPoints: row.target_points,
                targetTasks: row.target_tasks,
                rewardBadge: row.reward_badge,
                pointsEarned: parseInt(row.points_earned) || 0,
                tasksCompleted: parseInt(row.tasks_completed) || 0,
                completed: row.completed || false,
                completedAt: row.completed_at,
                progress: Math.min(100, Math.round(overallProgress))
            };
        });

        res.json({ success: true, progress });
    } catch (error) {
        console.error('Error obteniendo progreso de desafíos:', error);
        res.status(500).json({ success: false, error: 'Error al obtener progreso' });
    }
});

// Actualizar progreso de desafío (llamado automáticamente cuando se completan tareas)
export async function updateChallengeProgress(userId, points) {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Obtener desafíos activos
        const activeChallenges = await pool.query(`
            SELECT id, target_points, target_tasks
            FROM challenges
            WHERE active = true
            AND start_date <= $1
            AND end_date >= $1
        `, [today]);

        for (const challenge of activeChallenges.rows) {
            // Obtener progreso actual
            const progressResult = await pool.query(
                'SELECT * FROM challenge_progress WHERE challenge_id = $1 AND user_id = $2',
                [challenge.id, userId]
            );

            if (progressResult.rows.length === 0) {
                // Crear nuevo progreso
                await pool.query(`
                    INSERT INTO challenge_progress 
                    (challenge_id, user_id, points_earned, tasks_completed, updated_at)
                    VALUES ($1, $2, $3, 1, NOW())
                `, [challenge.id, userId, points]);
            } else {
                const current = progressResult.rows[0];
                const newPoints = (current.points_earned || 0) + points;
                const newTasks = (current.tasks_completed || 0) + 1;

                // Verificar si se completó el desafío
                const pointsMet = challenge.target_points ? newPoints >= challenge.target_points : true;
                const tasksMet = challenge.target_tasks ? newTasks >= challenge.target_tasks : true;
                const isCompleted = pointsMet && tasksMet && !current.completed;

                await pool.query(`
                    UPDATE challenge_progress 
                    SET 
                        points_earned = $1,
                        tasks_completed = $2,
                        completed = $3,
                        completed_at = CASE WHEN $3 AND completed_at IS NULL THEN NOW() ELSE completed_at END,
                        updated_at = NOW()
                    WHERE challenge_id = $4 AND user_id = $5
                `, [newPoints, newTasks, isCompleted, challenge.id, userId]);
            }
        }
    } catch (error) {
        console.error('Error actualizando progreso de desafío:', error);
    }
}

// Crear desafío (solo admin - por ahora cualquier usuario puede crear)
router.post('/', [
    body('name').notEmpty(),
    body('type').isIn(['weekly', 'monthly']),
    body('startDate').notEmpty(),
    body('endDate').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: errors.array()[0].msg });
        }

        const { name, description, type, startDate, endDate, targetPoints, targetTasks, rewardBadge } = req.body;

        const challengeId = `challenge-${Date.now()}`;

        await pool.query(`
            INSERT INTO challenges 
            (id, name, description, type, start_date, end_date, target_points, target_tasks, reward_badge, active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
        `, [challengeId, name, description, type, startDate, endDate, targetPoints || null, targetTasks || null, rewardBadge || null]);

        res.json({ success: true, challengeId });
    } catch (error) {
        console.error('Error creando desafío:', error);
        res.status(500).json({ success: false, error: 'Error al crear desafío' });
    }
});

export default router;

