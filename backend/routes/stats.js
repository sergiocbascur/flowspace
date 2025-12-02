import express from 'express';
import { authenticateToken } from './auth.js';
import { pool } from '../db/connection.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener historial de puntos del usuario (últimos N días)
router.get('/points-history', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { days = 30 } = req.query;

        const result = await pool.query(`
            SELECT 
                date,
                SUM(points) as daily_points,
                COUNT(*) as tasks_count
            FROM points_history
            WHERE user_id = $1
            AND date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            GROUP BY date
            ORDER BY date ASC
        `, [userId]);

        const history = result.rows.map(row => ({
            date: row.date,
            points: parseInt(row.daily_points) || 0,
            tasksCount: parseInt(row.tasks_count) || 0
        }));

        res.json({ success: true, history });
    } catch (error) {
        console.error('Error obteniendo historial de puntos:', error);
        res.status(500).json({ success: false, error: 'Error al obtener historial' });
    }
});

// Obtener estadísticas comparativas entre usuarios
router.get('/compare/:otherUserId', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { otherUserId } = req.params;

        // Verificar que son contactos
        const contactCheck = await pool.query(
            `SELECT * FROM user_contacts 
             WHERE ((user_id = $1 AND contact_id = $2) OR (user_id = $2 AND contact_id = $1))
             AND status = 'accepted'`,
            [userId, otherUserId]
        );

        if (contactCheck.rows.length === 0) {
            return res.status(403).json({ success: false, error: 'No puedes comparar con usuarios que no son tus contactos' });
        }

        // Obtener estadísticas de ambos usuarios
        const [userStats, otherStats] = await Promise.all([
            pool.query(`
                SELECT 
                    ur.total_points,
                    ur.tasks_completed,
                    ur.tasks_completed_on_time,
                    ur.tasks_completed_early,
                    ur.tasks_completed_late,
                    ur.current_streak,
                    ur.longest_streak,
                    ur.badges,
                    u.name,
                    u.username,
                    u.avatar
                FROM user_rankings ur
                INNER JOIN users u ON ur.user_id = u.id
                WHERE ur.user_id = $1
            `, [userId]),
            pool.query(`
                SELECT 
                    ur.total_points,
                    ur.tasks_completed,
                    ur.tasks_completed_on_time,
                    ur.tasks_completed_early,
                    ur.tasks_completed_late,
                    ur.current_streak,
                    ur.longest_streak,
                    ur.badges,
                    u.name,
                    u.username,
                    u.avatar
                FROM user_rankings ur
                INNER JOIN users u ON ur.user_id = u.id
                WHERE ur.user_id = $1
            `, [otherUserId])
        ]);

        const user = userStats.rows[0] || {
            total_points: 0,
            tasks_completed: 0,
            tasks_completed_on_time: 0,
            tasks_completed_early: 0,
            tasks_completed_late: 0,
            current_streak: 0,
            longest_streak: 0,
            badges: []
        };

        const other = otherStats.rows[0] || {
            total_points: 0,
            tasks_completed: 0,
            tasks_completed_on_time: 0,
            tasks_completed_early: 0,
            tasks_completed_late: 0,
            current_streak: 0,
            longest_streak: 0,
            badges: []
        };

        res.json({
            success: true,
            comparison: {
                user: {
                    userId,
                    name: userStats.rows[0]?.name || 'Usuario',
                    username: userStats.rows[0]?.username || '',
                    avatar: userStats.rows[0]?.avatar || '👤',
                    totalPoints: user.total_points || 0,
                    tasksCompleted: user.tasks_completed || 0,
                    tasksOnTime: user.tasks_completed_on_time || 0,
                    tasksEarly: user.tasks_completed_early || 0,
                    tasksLate: user.tasks_completed_late || 0,
                    currentStreak: user.current_streak || 0,
                    longestStreak: user.longest_streak || 0,
                    badges: user.badges || []
                },
                other: {
                    userId: otherUserId,
                    name: otherStats.rows[0]?.name || 'Usuario',
                    username: otherStats.rows[0]?.username || '',
                    avatar: otherStats.rows[0]?.avatar || '👤',
                    totalPoints: other.total_points || 0,
                    tasksCompleted: other.tasks_completed || 0,
                    tasksOnTime: other.tasks_completed_on_time || 0,
                    tasksEarly: other.tasks_completed_early || 0,
                    tasksLate: other.tasks_completed_late || 0,
                    currentStreak: other.current_streak || 0,
                    longestStreak: other.longest_streak || 0,
                    badges: other.badges || []
                },
                differences: {
                    pointsDiff: (user.total_points || 0) - (other.total_points || 0),
                    tasksDiff: (user.tasks_completed || 0) - (other.tasks_completed || 0),
                    streakDiff: (user.current_streak || 0) - (other.current_streak || 0)
                }
            }
        });
    } catch (error) {
        console.error('Error comparando usuarios:', error);
        res.status(500).json({ success: false, error: 'Error al comparar usuarios' });
    }
});

export default router;

