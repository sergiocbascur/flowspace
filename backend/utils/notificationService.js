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

        // 1. Obtener tokens FCM del usuario
        const result = await pool.query(
            'SELECT token FROM fcm_tokens WHERE user_id = $1',
            [userId]
        );

        const tokens = result.rows.map(row => row.token);

        if (tokens.length === 0) {
            console.log(`ℹ️ El usuario ${userId} no tiene tokens FCM registrados.`);

            // Fallback: Enviar email en lugar de push notification
            console.log(`📧 Verificando preferencias de email...`);
            const userResult = await pool.query(
                'SELECT email, name, config FROM users WHERE id = $1',
                [userId]
            );

            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                const userConfig = user.config || {};

                // Verificar si el usuario tiene las notificaciones por email activadas
                // Por defecto están activadas (emailNotifyMentions !== false)
                const emailEnabled = userConfig.emailNotifyMentions !== false;

                if (emailEnabled) {
                    console.log(`📧 Enviando notificación por email a ${user.email}...`);
                    await sendMentionEmail(user.email, {
                        sender: notification.data?.sender || 'Alguien',
                        taskTitle: notification.data?.taskTitle || 'una tarea',
                        context: notification.body,
                        taskId: notification.data?.taskId,
                        groupId: notification.data?.groupId
                    });
                } else {
                    console.log(`🔕 Usuario tiene notificaciones por email desactivadas`);
                }
            }
            return;
        }

        console.log(`📱 Encontrados ${tokens.length} tokens para el usuario ${userId}`);

        // 2. Preparar el mensaje
        // Asegurarse de que todos los valores en 'data' sean strings
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

        // 3. Enviar mensaje a cada token (sendMulticast no disponible en versiones antiguas)
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

        // 4. Limpiar tokens inválidos si hubo fallos
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
