import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from './auth.js';
import { pool } from '../db/connection.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener ranking global (top usuarios)
router.get('/global', rankingValidators.getRanking, async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const result = await pool.query(`
            SELECT 
                ur.user_id,
                u.name,
                u.username,
                u.avatar,
                ur.total_points,
                ur.tasks_completed,
                ur.tasks_completed_on_time,
                ur.tasks_completed_early,
                ur.tasks_completed_late,
                ur.current_streak,
                ur.longest_streak,
                ur.badges,
                ROW_NUMBER() OVER (ORDER BY ur.total_points DESC, ur.tasks_completed DESC) as rank
            FROM user_rankings ur
            INNER JOIN users u ON ur.user_id = u.id
            ORDER BY ur.total_points DESC, ur.tasks_completed DESC
            LIMIT $1 OFFSET $2
        `, [parseInt(limit), parseInt(offset)]);

        const rankings = result.rows.map(row => ({
            userId: row.user_id,
            name: row.name,
            username: row.username,
            avatar: row.avatar,
            totalPoints: row.total_points || 0,
            tasksCompleted: row.tasks_completed || 0,
            tasksOnTime: row.tasks_completed_on_time || 0,
            tasksEarly: row.tasks_completed_early || 0,
            tasksLate: row.tasks_completed_late || 0,
            currentStreak: row.current_streak || 0,
            longestStreak: row.longest_streak || 0,
            badges: row.badges || [],
            rank: parseInt(row.rank) + parseInt(offset)
        }));

        res.json({ success: true, rankings });
    } catch (error) {
        console.error('Error obteniendo ranking global:', error);
        res.status(500).json({ success: false, error: 'Error al obtener ranking global' });
    }
});

// Obtener ranking de un grupo específico
router.get('/group/:groupId', async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.userId;

        // Verificar que el usuario es miembro del grupo
        const memberCheck = await pool.query(
            'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
            [groupId, userId]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ success: false, error: 'No tienes acceso a este grupo' });
        }

        // Obtener grupo con scores
        const groupResult = await pool.query(
            'SELECT scores FROM groups WHERE id = $1',
            [groupId]
        );

        if (groupResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Grupo no encontrado' });
        }

        const scores = groupResult.rows[0].scores || {};
        
        // Obtener información de usuarios con puntos en este grupo
        const userIds = Object.keys(scores);
        if (userIds.length === 0) {
            return res.json({ success: true, rankings: [] });
        }

        const usersResult = await pool.query(`
            SELECT id, name, username, avatar
            FROM users
            WHERE id = ANY($1::text[])
        `, [userIds]);

        const rankings = usersResult.rows
            .map(user => ({
                userId: user.id,
                name: user.name,
                username: user.username,
                avatar: user.avatar,
                points: scores[user.id] || 0
            }))
            .sort((a, b) => b.points - a.points)
            .map((user, index) => ({
                ...user,
                rank: index + 1
            }));

        res.json({ success: true, rankings });
    } catch (error) {
        console.error('Error obteniendo ranking del grupo:', error);
        res.status(500).json({ success: false, error: 'Error al obtener ranking del grupo' });
    }
});

// Obtener ranking entre contactos/amigos
router.get('/contacts', async (req, res) => {
    try {
        const userId = req.user.userId;

        // Obtener contactos aceptados del usuario
        const contactsResult = await pool.query(`
            SELECT 
                CASE 
                    WHEN user_id = $1 THEN contact_id
                    ELSE user_id
                END as contact_id
            FROM user_contacts
            WHERE (user_id = $1 OR contact_id = $1)
            AND status = 'accepted'
        `, [userId]);

        const contactIds = contactsResult.rows.map(row => row.contact_id);
        
        if (contactIds.length === 0) {
            return res.json({ success: true, rankings: [] });
        }

        // Incluir al usuario actual también
        const allUserIds = [...contactIds, userId];

        const result = await pool.query(`
            SELECT 
                ur.user_id,
                u.name,
                u.username,
                u.avatar,
                ur.total_points,
                ur.tasks_completed,
                ur.current_streak,
                ur.badges
            FROM user_rankings ur
            INNER JOIN users u ON ur.user_id = u.id
            WHERE ur.user_id = ANY($1::text[])
            ORDER BY ur.total_points DESC, ur.tasks_completed DESC
        `, [allUserIds]);

        const rankings = result.rows.map((row, index) => ({
            userId: row.user_id,
            name: row.name,
            username: row.username,
            avatar: row.avatar,
            totalPoints: row.total_points || 0,
            tasksCompleted: row.tasks_completed || 0,
            currentStreak: row.current_streak || 0,
            badges: row.badges || [],
            rank: index + 1,
            isCurrentUser: row.user_id === userId
        }));

        res.json({ success: true, rankings });
    } catch (error) {
        console.error('Error obteniendo ranking de contactos:', error);
        res.status(500).json({ success: false, error: 'Error al obtener ranking de contactos' });
    }
});

// Obtener posición del usuario actual en ranking global
router.get('/my-position', async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(`
            SELECT 
                ur.user_id,
                ur.total_points,
                ur.tasks_completed,
                ur.current_streak,
                ur.longest_streak,
                ur.badges,
                (
                    SELECT COUNT(*) + 1
                    FROM user_rankings ur2
                    WHERE ur2.total_points > ur.total_points
                    OR (ur2.total_points = ur.total_points AND ur2.tasks_completed > ur.tasks_completed)
                ) as rank,
                (
                    SELECT COUNT(*)
                    FROM user_rankings
                ) as total_users
            FROM user_rankings ur
            WHERE ur.user_id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                position: {
                    rank: null,
                    totalPoints: 0,
                    tasksCompleted: 0,
                    currentStreak: 0,
                    longestStreak: 0,
                    badges: [],
                    totalUsers: 0
                }
            });
        }

        const row = result.rows[0];
        res.json({
            success: true,
            position: {
                rank: parseInt(row.rank),
                totalPoints: row.total_points || 0,
                tasksCompleted: row.tasks_completed || 0,
                currentStreak: row.current_streak || 0,
                longestStreak: row.longest_streak || 0,
                badges: row.badges || [],
                totalUsers: parseInt(row.total_users)
            }
        });
    } catch (error) {
        console.error('Error obteniendo posición del usuario:', error);
        res.status(500).json({ success: false, error: 'Error al obtener posición' });
    }
});

// Actualizar ranking de usuario (llamado internamente cuando se completan tareas)
export async function updateUserRanking(userId, points, completedOnTime, completedEarly, completedLate) {
    try {
        // Verificar si existe registro
        const checkResult = await pool.query(
            'SELECT * FROM user_rankings WHERE user_id = $1',
            [userId]
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (checkResult.rows.length === 0) {
            // Crear nuevo registro
            await pool.query(`
                INSERT INTO user_rankings 
                (user_id, total_points, tasks_completed, tasks_completed_on_time, 
                 tasks_completed_early, tasks_completed_late, current_streak, longest_streak, last_completed_task_at)
                VALUES ($1, $2, 1, $3, $4, $5, 1, 1, NOW())
            `, [userId, points, completedOnTime ? 1 : 0, completedEarly ? 1 : 0, completedLate ? 1 : 0]);
        } else {
            const current = checkResult.rows[0];
            const lastCompleted = current.last_completed_task_at 
                ? new Date(current.last_completed_task_at)
                : null;
            
            let newStreak = current.current_streak || 0;
            if (lastCompleted) {
                lastCompleted.setHours(0, 0, 0, 0);
                const daysDiff = Math.floor((today - lastCompleted) / (1000 * 60 * 60 * 24));
                
                if (daysDiff === 1) {
                    // Continúa la racha
                    newStreak = (current.current_streak || 0) + 1;
                } else if (daysDiff === 0) {
                    // Mismo día, mantener racha
                    newStreak = current.current_streak || 0;
                } else {
                    // Racha rota, empezar de nuevo
                    newStreak = 1;
                }
            } else {
                newStreak = 1;
            }

            const longestStreak = Math.max(newStreak, current.longest_streak || 0);

            await pool.query(`
                UPDATE user_rankings 
                SET 
                    total_points = total_points + $1,
                    tasks_completed = tasks_completed + 1,
                    tasks_completed_on_time = tasks_completed_on_time + $2,
                    tasks_completed_early = tasks_completed_early + $3,
                    tasks_completed_late = tasks_completed_late + $4,
                    current_streak = $5,
                    longest_streak = $6,
                    last_completed_task_at = NOW(),
                    updated_at = NOW()
                WHERE user_id = $7
            `, [
                points,
                completedOnTime ? 1 : 0,
                completedEarly ? 1 : 0,
                completedLate ? 1 : 0,
                newStreak,
                longestStreak,
                userId
            ]);
        }

        // Registrar en historial de puntos
        await pool.query(`
            INSERT INTO points_history (user_id, points, date)
            VALUES ($1, $2, CURRENT_DATE)
        `, [userId, points]);

        // Actualizar progreso de desafíos
        try {
            const { updateChallengeProgress } = await import('./challenges.js');
            await updateChallengeProgress(userId, points);
        } catch (error) {
            console.error('Error actualizando desafíos:', error);
        }

        // Verificar y otorgar badges
        const newBadges = await checkAndAwardBadges(userId);
        
        return { newBadges };
    } catch (error) {
        console.error('Error actualizando ranking de usuario:', error);
        throw error;
    }
}

// Verificar y otorgar badges
async function checkAndAwardBadges(userId) {
    try {
        const result = await pool.query(
            'SELECT * FROM user_rankings WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) return [];

        const user = result.rows[0];
        const currentBadges = user.badges || [];
        const newBadges = [...currentBadges];
        const awardedBadges = [];

        // Badge: Primera tarea completada
        if (user.tasks_completed === 1 && !currentBadges.includes('first_task')) {
            newBadges.push('first_task');
            awardedBadges.push('first_task');
        }

        // Badge: 10 tareas completadas
        if (user.tasks_completed >= 10 && !currentBadges.includes('task_master_10')) {
            newBadges.push('task_master_10');
            awardedBadges.push('task_master_10');
        }

        // Badge: 50 tareas completadas
        if (user.tasks_completed >= 50 && !currentBadges.includes('task_master_50')) {
            newBadges.push('task_master_50');
            awardedBadges.push('task_master_50');
        }

        // Badge: 100 tareas completadas
        if (user.tasks_completed >= 100 && !currentBadges.includes('task_master_100')) {
            newBadges.push('task_master_100');
            awardedBadges.push('task_master_100');
        }

        // Badge: Racha de 7 días
        if (user.current_streak >= 7 && !currentBadges.includes('streak_7')) {
            newBadges.push('streak_7');
            awardedBadges.push('streak_7');
        }

        // Badge: Racha de 30 días
        if (user.current_streak >= 30 && !currentBadges.includes('streak_30')) {
            newBadges.push('streak_30');
            awardedBadges.push('streak_30');
        }

        // Badge: 1000 puntos
        if (user.total_points >= 1000 && !currentBadges.includes('points_1000')) {
            newBadges.push('points_1000');
            awardedBadges.push('points_1000');
        }

        // Badge: 5000 puntos
        if (user.total_points >= 5000 && !currentBadges.includes('points_5000')) {
            newBadges.push('points_5000');
            awardedBadges.push('points_5000');
        }

        // Badge: Perfeccionista (todas las tareas a tiempo)
        if (user.tasks_completed > 10 && user.tasks_completed_on_time === user.tasks_completed && !currentBadges.includes('perfectionist')) {
            newBadges.push('perfectionist');
            awardedBadges.push('perfectionist');
        }

        // Actualizar badges si hay nuevos
        if (newBadges.length > currentBadges.length) {
            await pool.query(
                'UPDATE user_rankings SET badges = $1 WHERE user_id = $2',
                [JSON.stringify(newBadges), userId]
            );
        }

        return awardedBadges;
    } catch (error) {
        console.error('Error verificando badges:', error);
        return [];
    }
}

// Ruta para actualizar ranking (llamada desde frontend cuando se completa una tarea)
router.post('/update', [
    body('points').isInt(),
    body('completedOnTime').isBoolean(),
    body('completedEarly').isBoolean(),
    body('completedLate').isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: errors.array()[0].msg });
        }

        const userId = req.user.userId;
        const { points, completedOnTime, completedEarly, completedLate } = req.body;

        const result = await updateUserRanking(userId, points, completedOnTime, completedEarly, completedLate);

        res.json({ 
            success: true, 
            message: 'Ranking actualizado',
            newBadges: result?.newBadges || []
        });
    } catch (error) {
        console.error('Error actualizando ranking:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar ranking' });
    }
});

export default router;

