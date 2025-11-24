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
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

        console.log('📱 Detección de dispositivo:', { isMobile, isSafari, isIOS });

        if (!isMobile) {
            console.log('💻 Dispositivo de escritorio detectado. Las notificaciones push están desactivadas (solo móviles).');
            return null;
        }

        // Advertencia para Safari iOS
        if (isIOS && isSafari) {
            console.warn('⚠️ Safari iOS detectado. Las notificaciones push web pueden no funcionar. Se requiere instalar como PWA.');
            // Intentaremos de todas formas, por si está instalado como PWA
        }

        // Verificar si el navegador soporta notificaciones
        if (!('Notification' in window)) {
            console.warn('Este navegador no soporta notificaciones');
            return null;
        }

        console.log('🔔 Estado actual de permisos:', Notification.permission);

        // Verificar si ya tenemos permiso
        if (Notification.permission === 'granted') {
            console.log('✅ Permiso ya concedido, obteniendo token...');
            return await getNotificationToken();
        }

        // Solicitar permiso
        console.log('📝 Solicitando permiso de notificaciones...');
        const permission = await Notification.requestPermission();
        console.log('📋 Resultado de solicitud de permiso:', permission);

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
        console.log('🎫 Iniciando obtención de token FCM...');

        if (!messaging) {
            console.warn('Firebase Messaging no está inicializado');
            alert('❌ Firebase Messaging no inicializado'); // DEBUG
            return null;
        }

        console.log('✅ Firebase Messaging está inicializado');

        // Verificar si hay un service worker registrado
        console.log('🔍 Verificando Service Worker...');

        if (!('serviceWorker' in navigator)) {
            console.error('❌ Service Worker no soportado en este navegador');
            alert('❌ Service Worker no soportado'); // DEBUG
            return null;
        }

        alert('⏳ Esperando Service Worker...'); // DEBUG
        const registration = await navigator.serviceWorker.ready;
        console.log('✅ Service Worker listo:', registration);
        alert('✅ Service Worker listo'); // DEBUG

        console.log('📡 Solicitando token a Firebase...');
        alert('📡 Pidiendo token a Firebase...'); // DEBUG

        const token = await getToken(messaging, {
            vapidKey: vapidKey,
            serviceWorkerRegistration: registration
        });

        if (token) {
            console.log('📱 Token FCM obtenido:', token);
            alert('✅ Token obtenido: ' + token.substring(0, 20)); // DEBUG
            return token;
        } else {
            console.warn('No se pudo obtener el token FCM');
            alert('⚠️ Firebase devolvió token vacío'); // DEBUG
            return null;
        }
    } catch (error) {
        console.error('Error obteniendo token FCM:', error);
        console.error('Detalles del error:', error.message, error.code);
        alert('❌ Error: ' + error.message); // DEBUG
        return null;
    }
};

/**
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
