const admin = require('firebase-admin');
const path = require('path');

let firebaseApp = null;

/**
 * Inicializa Firebase Admin SDK
 * @returns {admin.app.App} Instancia de Firebase Admin
 */
const initializeFirebase = () => {
    if (firebaseApp) {
        return firebaseApp;
    }

    try {
        // Ruta al archivo de credenciales del Service Account
        const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');

        const serviceAccount = require(serviceAccountPath);

        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
        });

        console.log('✅ Firebase Admin SDK inicializado correctamente');
        return firebaseApp;
    } catch (error) {
        console.error('❌ Error inicializando Firebase Admin SDK:', error.message);
        console.warn('⚠️  Las notificaciones push no estarán disponibles');
        return null;
    }
};

/**
 * Envía una notificación push a un dispositivo específico
 * @param {string} token - Token FCM del dispositivo
 * @param {Object} notification - Datos de la notificación
 * @param {string} notification.title - Título de la notificación
 * @param {string} notification.body - Cuerpo de la notificación
 * @param {Object} notification.data - Datos adicionales
 * @returns {Promise<string>} ID del mensaje enviado
 */
const sendPushNotification = async (token, notification) => {
    const app = initializeFirebase();

    if (!app) {
        console.warn('Firebase no está inicializado. No se puede enviar notificación.');
        return null;
    }

    try {
        const message = {
            notification: {
                title: notification.title,
                body: notification.body,
                icon: '/icon-192x192.png'
            },
            data: notification.data || {},
            token: token,
            webpush: {
                fcmOptions: {
                    link: notification.data?.url || '/'
                }
            }
        };

        const response = await admin.messaging().send(message);
        console.log('✅ Notificación enviada:', response);
        return response;
    } catch (error) {
        console.error('❌ Error enviando notificación:', error);
        throw error;
    }
};

/**
 * Envía notificaciones push a múltiples dispositivos
 * @param {string[]} tokens - Array de tokens FCM
 * @param {Object} notification - Datos de la notificación
 * @returns {Promise<Object>} Resultado del envío
 */
const sendMulticastNotification = async (tokens, notification) => {
    const app = initializeFirebase();

    if (!app || !tokens || tokens.length === 0) {
        console.warn('No hay tokens válidos para enviar notificaciones');
        return { successCount: 0, failureCount: 0 };
    }

    try {
        const message = {
            notification: {
                title: notification.title,
                body: notification.body,
                icon: '/icon-192x192.png'
            },
            data: notification.data || {},
            tokens: tokens,
            webpush: {
                fcmOptions: {
                    link: notification.data?.url || '/'
                }
            }
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`✅ Notificaciones enviadas: ${response.successCount} exitosas, ${response.failureCount} fallidas`);
        return response;
    } catch (error) {
        console.error('❌ Error enviando notificaciones multicast:', error);
        throw error;
    }
};

module.exports = {
    initializeFirebase,
    sendPushNotification,
    sendMulticastNotification
};
