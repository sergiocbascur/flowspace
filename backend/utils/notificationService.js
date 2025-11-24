import admin from 'firebase-admin';
import { pool } from '../db/connection.js';
import { sendMentionEmail } from './emailService.js';

/**
 * Envía una notificación push a un usuario específico
 * @param {string|number} userId - ID del usuario destinatario
 * @param {object} notification - Objeto con datos de la notificación (title, body, data)
 */
export const sendPushNotification = async (userId, notification) => {
    try {
        console.log(`🔔 Iniciando envío de push notification a usuario ${userId}`);

        // 1. Obtener información del usuario y sus preferencias
        const userResult = await pool.query(
            'SELECT email, name, config FROM users WHERE id = $1',
            [userId]
        );

        let userEmail = null;
        let userConfig = {};

        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            userEmail = user.email;
            userConfig = user.config || {};
        }

        // 2. Enviar email si está habilitado (independiente de FCM)
        const emailEnabled = userConfig.emailNotifyMentions !== false;
        if (emailEnabled && userEmail) {
            console.log(`📧 Enviando notificación por email a ${userEmail}...`);
            await sendMentionEmail(userEmail, {
                sender: notification.data?.sender || 'Alguien',
                taskTitle: notification.data?.taskTitle || 'una tarea',
                context: notification.body,
                taskId: notification.data?.taskId,
                groupId: notification.data?.groupId
            });
        } else if (!emailEnabled) {
            console.log(`🔕 Usuario tiene notificaciones por email desactivadas`);
        }

        // 3. Obtener tokens FCM del usuario
        const result = await pool.query(
            'SELECT token FROM fcm_tokens WHERE user_id = $1',
            [userId]
        );

        const tokens = result.rows.map(row => row.token);

        if (tokens.length === 0) {
            console.log(`ℹ️ El usuario ${userId} no tiene tokens FCM registrados.`);
            return;
        }

        console.log(`📱 Encontrados ${tokens.length} tokens para el usuario ${userId}`);

        // 4. Preparar el mensaje FCM
        const stringData = {};
        if (notification.data) {
            for (const [key, value] of Object.entries(notification.data)) {
                stringData[key] = String(value);
            }
        }

        const message = {
            notification: {
                title: notification.title,
                body: notification.body,
            },
            data: stringData
        };

        // 5. Enviar mensaje FCM a cada token
        let successCount = 0;
        let failureCount = 0;
        const failedTokens = [];

        for (const token of tokens) {
            try {
                await admin.messaging().send({
                    ...message,
                    token: token
                });
                successCount++;
            } catch (error) {
                failureCount++;
                failedTokens.push(token);
                console.error(`❌ Error enviando a token:`, error.code || error.message);
            }
        }

        console.log(`✅ Push notification enviada: ${successCount} éxitos, ${failureCount} fallos`);

        // 6. Limpiar tokens inválidos si hubo fallos
        if (failedTokens.length > 0) {
            console.log(`🧹 Eliminando ${failedTokens.length} tokens inválidos...`);
            await pool.query(
                'DELETE FROM fcm_tokens WHERE token = ANY($1::text[])',
                [failedTokens]
            );
        }

    } catch (error) {
        console.error('❌ Error fatal enviando push notification:', error);
    }
};
