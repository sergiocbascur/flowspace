import admin from 'firebase-admin';
import { pool } from '../db/connection.js';

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
            console.log(`ℹ️ El usuario ${userId} no tiene tokens FCM registrados. No se envía push.`);
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
            data: stringData,
            tokens: tokens
        };

        // 3. Enviar mensaje multicast (a todos los dispositivos del usuario)
        const response = await admin.messaging().sendMulticast(message);

        console.log(`✅ Push notification enviada: ${response.successCount} éxitos, ${response.failureCount} fallos`);

        // 4. Limpiar tokens inválidos si hubo fallos
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                    console.error(`❌ Error enviando a token ${idx}:`, resp.error);
                }
            });

            if (failedTokens.length > 0) {
                console.log(`🧹 Eliminando ${failedTokens.length} tokens inválidos...`);
                // Eliminar tokens que dieron error (probablemente expirados o inválidos)
                // Nota: En un entorno real, deberíamos verificar el tipo de error antes de eliminar
                // pero 'UNREGISTERED' es el más común.
                await pool.query(
                    'DELETE FROM fcm_tokens WHERE token = ANY($1::text[])',
                    [failedTokens]
                );
            }
        }

    } catch (error) {
        console.error('❌ Error fatal enviando push notification:', error);
    }
};
