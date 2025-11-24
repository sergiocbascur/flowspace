import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { firebaseConfig, vapidKey } from './config';

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firebase Cloud Messaging
let messaging = null;

try {
    messaging = getMessaging(app);
} catch (error) {
    console.warn('Firebase Messaging no está disponible:', error);
}

/**
 * Solicita permiso al usuario y obtiene el token de notificaciones push
 * @returns {Promise<string|null>} Token FCM o null si falla
 */
export const requestNotificationPermission = async () => {
    try {
        // Verificar si es dispositivo móvil
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (!isMobile) {
            console.log('💻 Dispositivo de escritorio detectado. Las notificaciones push están desactivadas (solo móviles).');
            return null;
        }

        // Verificar si el navegador soporta notificaciones
        if (!('Notification' in window)) {
            console.warn('Este navegador no soporta notificaciones');
            return null;
        }

        // Verificar si ya tenemos permiso
        if (Notification.permission === 'granted') {
            return await getNotificationToken();
        }

        // Solicitar permiso
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            console.log('✅ Permiso de notificaciones concedido');
            return await getNotificationToken();
        } else {
            console.log('❌ Permiso de notificaciones denegado');
            return null;
        }
    } catch (error) {
        console.error('Error solicitando permiso de notificaciones:', error);
        return null;
    }
};

/**
 * Obtiene el token FCM del dispositivo
 * @returns {Promise<string|null>} Token FCM
 */
const getNotificationToken = async () => {
    try {
        if (!messaging) {
            console.warn('Firebase Messaging no está inicializado');
            return null;
        }

        // Verificar si hay un service worker registrado
        const registration = await navigator.serviceWorker.ready;

        const token = await getToken(messaging, {
            vapidKey: vapidKey,
            serviceWorkerRegistration: registration
        });

        if (token) {
            console.log('📱 Token FCM obtenido:', token);
            return token;
        } else {
            console.warn('No se pudo obtener el token FCM');
            return null;
        }
    } catch (error) {
        console.error('Error obteniendo token FCM:', error);
        return null;
    }
};

/**
 * Configura el listener para notificaciones en primer plano
 * @param {Function} callback - Función a ejecutar cuando llega una notificación
 */
export const onMessageListener = (callback) => {
    if (!messaging) {
        console.warn('Firebase Messaging no está inicializado');
        return () => { };
    }

    return onMessage(messaging, (payload) => {
        console.log('📬 Notificación recibida en primer plano:', payload);

        // Ejecutar callback personalizado
        if (callback) {
            callback(payload);
        }

        // Mostrar notificación del navegador
        if (Notification.permission === 'granted') {
            const { title, body, icon } = payload.notification || {};

            new Notification(title || 'Genshiken', {
                body: body || 'Nueva notificación',
                icon: icon || '/icon-192x192.png',
                badge: '/icon-192x192.png',
                tag: payload.data?.taskId || 'general',
                requireInteraction: false,
                data: payload.data
            });
        }
    });
};

export { messaging };
