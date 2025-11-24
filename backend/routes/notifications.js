import express from 'express';
import { pool } from '../db/connection.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Middleware para loggear todas las peticiones a esta ruta
router.use((req, res, next) => {
    console.log(`📨 [NOTIFICATIONS] ${req.method} ${req.path} - User: ${req.user?.id || 'No autenticado'}`);
    next();
});

/**
 * POST /api/notifications/fcm-token
 * Guarda o actualiza el token FCM del usuario
 */
router.post('/fcm-token', authenticateToken, async (req, res) => {
    const { token, platform, userAgent } = req.body;
    const userId = req.user?.userId;

    console.log(`📥 [DEBUG] Intento de guardar token FCM para usuario ${userId}`);
    console.log(`📥 [DEBUG] req.user completo:`, req.user);
    console.log(`📥 [DEBUG] Authorization header:`, req.headers['authorization'] ? 'Presente' : 'Ausente');
    console.log(`📥 [DEBUG] Token recibido: ${token ? 'SÍ (' + token.substring(0, 10) + '...)' : 'NO'}`);
    console.log(`📥 [DEBUG] User Agent: ${userAgent}`);

    if (!userId) {
        console.error('❌ Usuario no autenticado o user.id no definido');
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!token) {
        return res.status(400).json({ error: 'Token FCM requerido' });
    }

    try {
        // Verificar si el token ya existe
        const existingToken = await pool.query(
            'SELECT * FROM fcm_tokens WHERE token = $1',
            [token]
        );

        if (existingToken.rows.length > 0) {
            // Actualizar last_used_at
            await pool.query(
                'UPDATE fcm_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE token = $1',
                [token]
            );

            return res.json({
                success: true,
                message: 'Token actualizado',
                tokenId: existingToken.rows[0].id
            });
        }

        // Insertar nuevo token
        const result = await pool.query(
            `INSERT INTO fcm_tokens (user_id, token, platform, user_agent) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id`,
            [userId, token, platform || 'web', userAgent]
        );

        // Crear preferencias por defecto si no existen
        await pool.query(
            `INSERT INTO notification_preferences (user_id) 
             VALUES ($1) 
             ON CONFLICT (user_id) DO NOTHING`,
            [userId]
        );

        res.json({
            success: true,
            message: 'Token FCM guardado correctamente',
            tokenId: result.rows[0].id
        });
    } catch (error) {
        console.error('Error guardando token FCM:', error);
        res.status(500).json({ error: 'Error guardando token FCM' });
    }
});

/**
 * DELETE /api/notifications/fcm-token
 * Elimina el token FCM del usuario (al cerrar sesión)
 */
router.delete('/fcm-token', authenticateToken, async (req, res) => {
    const { token } = req.body;
    const userId = req.user.userId;

    if (!token) {
        return res.status(400).json({ error: 'Token FCM requerido' });
    }

    try {
        await pool.query(
            'DELETE FROM fcm_tokens WHERE token = $1 AND user_id = $2',
            [token, userId]
        );

        res.json({ success: true, message: 'Token eliminado correctamente' });
    } catch (error) {
        console.error('Error eliminando token FCM:', error);
        res.status(500).json({ error: 'Error eliminando token FCM' });
    }
});

/**
 * GET /api/notifications/preferences
 * Obtiene las preferencias de notificaciones del usuario
 */
router.get('/preferences', authenticateToken, async (req, res) => {
    const userId = req.user.userId;

    try {
        let preferences = await pool.query(
            'SELECT * FROM notification_preferences WHERE user_id = $1',
            [userId]
        );

        // Si no existen preferencias, crear con valores por defecto
        if (preferences.rows.length === 0) {
            const result = await pool.query(
                `INSERT INTO notification_preferences (user_id) 
                 VALUES ($1) 
                 RETURNING *`,
                [userId]
            );
            preferences = result;
        }

        res.json(preferences.rows[0]);
    } catch (error) {
        console.error('Error obteniendo preferencias:', error);
        res.status(500).json({ error: 'Error obteniendo preferencias' });
    }
});

/**
 * PUT /api/notifications/preferences
 * Actualiza las preferencias de notificaciones del usuario
 */
router.put('/preferences', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { mentions, validations, overdue, assignments } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO notification_preferences 
             (user_id, mentions, validations, overdue, assignments) 
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id) 
             DO UPDATE SET 
                mentions = $2,
                validations = $3,
                overdue = $4,
                assignments = $5,
                updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [userId, mentions, validations, overdue, assignments]
        );

        res.json({
            success: true,
            message: 'Preferencias actualizadas',
            preferences: result.rows[0]
        });
    } catch (error) {
        console.error('Error actualizando preferencias:', error);
        res.status(500).json({ error: 'Error actualizando preferencias' });
    }
});

/**
 * GET /api/notifications/tokens/:userId
 * Obtiene todos los tokens FCM de un usuario (para uso interno)
 */
router.get('/tokens/:userId', authenticateToken, async (req, res) => {
    const { userId } = req.params;

    // Solo permitir si es el mismo usuario o es admin
    if (req.user.id !== parseInt(userId) && !req.user.isAdmin) {
        return res.status(403).json({ error: 'No autorizado' });
    }

    try {
        const tokens = await pool.query(
            'SELECT token, platform, last_used_at FROM fcm_tokens WHERE user_id = $1',
            [userId]
        );

        res.json({ tokens: tokens.rows });
    } catch (error) {
        console.error('Error obteniendo tokens:', error);
        res.status(500).json({ error: 'Error obteniendo tokens' });
    }
});

export default router;
