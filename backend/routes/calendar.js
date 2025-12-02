import express from 'express';
import { authenticateToken } from './auth.js';
import { pool } from '../db/connection.js';
import { google } from 'googleapis';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Configuración OAuth2 de Google
// El redirect URI debe apuntar al archivo HTML estático en /public/calendar-callback.html
const getRedirectUri = () => {
    if (process.env.GOOGLE_REDIRECT_URI) {
        return process.env.GOOGLE_REDIRECT_URI;
    }
    const baseUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
    // Si CORS_ORIGIN es una lista, tomar la primera
    const firstOrigin = baseUrl.split(',')[0].trim();
    return `${firstOrigin}/calendar-callback.html`;
};

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri()
);

// Obtener URL de autorización de Google
router.get('/auth-url', async (req, res) => {
    try {
        const scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
        ];

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent',
            state: req.user.userId // Incluir userId en el state para seguridad
        });

        res.json({ success: true, authUrl });
    } catch (error) {
        console.error('Error generando URL de autorización:', error);
        res.status(500).json({ success: false, error: 'Error al generar URL de autorización' });
    }
});

// Callback de OAuth2 (manejado desde el frontend)
router.post('/callback', async (req, res) => {
    try {
        const { code } = req.body;
        
        // Si no hay código en el body, intentar obtenerlo de la query string (para compatibilidad)
        const codeFromQuery = req.query.code;
        const finalCode = code || codeFromQuery;
        
        if (!finalCode) {
            return res.status(400).json({ success: false, error: 'Código de autorización requerido' });
        }

        // Obtener userId del token si está autenticado, o del state si viene en la query
        let userId = req.user?.userId;
        if (!userId && req.query.state) {
            userId = req.query.state;
        }
        
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
        }

        // Intercambiar código por tokens
        const { tokens } = await oauth2Client.getToken(finalCode);
        
        oauth2Client.setCredentials(tokens);

        // Obtener información del usuario de Google
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();

        // Calcular fecha de expiración del token
        const tokenExpiry = tokens.expiry_date 
            ? new Date(tokens.expiry_date) 
            : new Date(Date.now() + 3600 * 1000); // Default 1 hora

        // Guardar o actualizar tokens en la base de datos
        await pool.query(`
            INSERT INTO google_calendar_tokens 
            (user_id, access_token, refresh_token, token_expiry, calendar_id, sync_enabled, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                access_token = EXCLUDED.access_token,
                refresh_token = EXCLUDED.refresh_token,
                token_expiry = EXCLUDED.token_expiry,
                sync_enabled = EXCLUDED.sync_enabled,
                updated_at = NOW()
        `, [
            userId,
            tokens.access_token,
            tokens.refresh_token,
            tokenExpiry,
            'primary',
            true
        ]);

        res.json({ 
            success: true, 
            message: 'Google Calendar conectado exitosamente',
            email: userInfo.data.email
        });
    } catch (error) {
        console.error('Error en callback de OAuth2:', error);
        res.status(500).json({ success: false, error: 'Error al conectar Google Calendar' });
    }
});

// Obtener estado de conexión
router.get('/status', async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            'SELECT * FROM google_calendar_tokens WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.json({ 
                success: true, 
                connected: false 
            });
        }

        const tokenData = result.rows[0];
        const isExpired = tokenData.token_expiry && new Date(tokenData.token_expiry) < new Date();

        res.json({
            success: true,
            connected: true,
            syncEnabled: tokenData.sync_enabled,
            calendarId: tokenData.calendar_id,
            lastSyncAt: tokenData.last_sync_at,
            isExpired
        });
    } catch (error) {
        console.error('Error obteniendo estado de conexión:', error);
        res.status(500).json({ success: false, error: 'Error al obtener estado' });
    }
});

// Desconectar Google Calendar
router.post('/disconnect', async (req, res) => {
    try {
        const userId = req.user.userId;

        await pool.query(
            'DELETE FROM google_calendar_tokens WHERE user_id = $1',
            [userId]
        );

        // También eliminar eventos sincronizados
        await pool.query(
            'DELETE FROM google_calendar_events WHERE user_id = $1',
            [userId]
        );

        res.json({ success: true, message: 'Google Calendar desconectado' });
    } catch (error) {
        console.error('Error desconectando Google Calendar:', error);
        res.status(500).json({ success: false, error: 'Error al desconectar' });
    }
});

// Obtener tokens del usuario y refrescar si es necesario
async function getValidTokens(userId) {
    const result = await pool.query(
        'SELECT * FROM google_calendar_tokens WHERE user_id = $1',
        [userId]
    );

    if (result.rows.length === 0) {
        throw new Error('Google Calendar no conectado');
    }

    const tokenData = result.rows[0];
    const isExpired = tokenData.token_expiry && new Date(tokenData.token_expiry) < new Date();

    if (isExpired && tokenData.refresh_token) {
        // Refrescar token
        oauth2Client.setCredentials({
            refresh_token: tokenData.refresh_token
        });

        const { credentials } = await oauth2Client.refreshAccessToken();
        
        const newExpiry = credentials.expiry_date 
            ? new Date(credentials.expiry_date) 
            : new Date(Date.now() + 3600 * 1000);

        await pool.query(`
            UPDATE google_calendar_tokens 
            SET access_token = $1, token_expiry = $2, updated_at = NOW()
            WHERE user_id = $3
        `, [credentials.access_token, newExpiry, userId]);

        return {
            access_token: credentials.access_token,
            refresh_token: tokenData.refresh_token
        };
    }

    return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token
    };
}

// Sincronizar tarea con Google Calendar
router.post('/sync-task/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user.userId;

        // Verificar que la tarea existe y el usuario tiene acceso
        const taskResult = await pool.query(
            `SELECT t.*, gm.id as is_member
             FROM tasks t
             INNER JOIN group_members gm ON t.group_id = gm.group_id
             WHERE t.id = $1 AND gm.user_id = $2`,
            [taskId, userId]
        );

        if (taskResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Tarea no encontrada' });
        }

        const task = taskResult.rows[0];

        // Obtener tokens válidos
        const tokens = await getValidTokens(userId);
        oauth2Client.setCredentials(tokens);

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // Convertir fecha de tarea a formato ISO
        let startDate, endDate;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (task.due === 'Hoy') {
            startDate = new Date(today);
        } else if (task.due === 'Mañana') {
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() + 1);
        } else if (task.due === 'Ayer') {
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 1);
        } else if (task.due && task.due.includes('-')) {
            startDate = new Date(task.due);
        } else {
            return res.status(400).json({ success: false, error: 'Fecha de tarea inválida' });
        }

        // Configurar hora si existe
        if (task.time) {
            const [hours, minutes] = task.time.split(':');
            startDate.setHours(parseInt(hours) || 9, parseInt(minutes) || 0, 0, 0);
        } else {
            startDate.setHours(9, 0, 0, 0); // Default 9 AM
        }

        endDate = new Date(startDate);
        endDate.setHours(startDate.getHours() + 1); // Duración de 1 hora por defecto

        // Verificar si ya existe un evento sincronizado
        const existingEvent = await pool.query(
            'SELECT * FROM google_calendar_events WHERE task_id = $1 AND user_id = $2',
            [taskId, userId]
        );

        const eventData = {
            summary: task.title,
            description: `Tarea de FlowSpace\nCategoría: ${task.category || 'Sin categoría'}\nPrioridad: ${task.priority || 'media'}`,
            start: {
                dateTime: startDate.toISOString(),
                timeZone: 'America/Santiago'
            },
            end: {
                dateTime: endDate.toISOString(),
                timeZone: 'America/Santiago'
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'popup', minutes: 15 }
                ]
            }
        };

        let googleEventId;

        if (existingEvent.rows.length > 0) {
            // Actualizar evento existente
            const updateResult = await calendar.events.update({
                calendarId: 'primary',
                eventId: existingEvent.rows[0].google_event_id,
                resource: eventData
            });

            googleEventId = updateResult.data.id;

            await pool.query(`
                UPDATE google_calendar_events 
                SET last_updated_at = NOW() 
                WHERE task_id = $1 AND user_id = $2
            `, [taskId, userId]);
        } else {
            // Crear nuevo evento
            const insertResult = await calendar.events.insert({
                calendarId: 'primary',
                resource: eventData
            });

            googleEventId = insertResult.data.id;

            await pool.query(`
                INSERT INTO google_calendar_events 
                (user_id, task_id, google_event_id, calendar_id, synced_at, last_updated_at)
                VALUES ($1, $2, $3, $4, NOW(), NOW())
            `, [userId, taskId, googleEventId, 'primary']);
        }

        // Actualizar última sincronización
        await pool.query(`
            UPDATE google_calendar_tokens 
            SET last_sync_at = NOW() 
            WHERE user_id = $1
        `, [userId]);

        res.json({ 
            success: true, 
            message: 'Tarea sincronizada con Google Calendar',
            eventId: googleEventId
        });
    } catch (error) {
        console.error('Error sincronizando tarea:', error);
        res.status(500).json({ success: false, error: 'Error al sincronizar tarea' });
    }
});

// Eliminar evento de Google Calendar cuando se completa/elimina una tarea
router.delete('/unsync-task/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user.userId;

        // Obtener evento sincronizado
        const eventResult = await pool.query(
            'SELECT * FROM google_calendar_events WHERE task_id = $1 AND user_id = $2',
            [taskId, userId]
        );

        if (eventResult.rows.length === 0) {
            return res.json({ success: true, message: 'No hay evento sincronizado' });
        }

        const eventData = eventResult.rows[0];

        // Obtener tokens válidos
        const tokens = await getValidTokens(userId);
        oauth2Client.setCredentials(tokens);

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // Eliminar evento de Google Calendar
        try {
            await calendar.events.delete({
                calendarId: eventData.calendar_id,
                eventId: eventData.google_event_id
            });
        } catch (error) {
            // Si el evento ya no existe en Google Calendar, continuar
            if (error.code !== 404) {
                throw error;
            }
        }

        // Eliminar registro de sincronización
        await pool.query(
            'DELETE FROM google_calendar_events WHERE task_id = $1 AND user_id = $2',
            [taskId, userId]
        );

        res.json({ success: true, message: 'Evento eliminado de Google Calendar' });
    } catch (error) {
        console.error('Error eliminando evento:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar evento' });
    }
});

export default router;

