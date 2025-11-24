// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuración de Firebase
firebase.initializeApp({
    apiKey: "AIzaSyDDonKxEwtGKIKCzxXwGfWE-puy3ykIFk0",
    authDomain: "genshiken-1d5b3.firebaseapp.com",
    projectId: "genshiken-1d5b3",
    storageBucket: "genshiken-1d5b3.firebasestorage.app",
    messagingSenderId: "786121411418",
    appId: "1:786121411418:web:158478346008a98acc8163"
});

const messaging = firebase.messaging();

// Manejar notificaciones en segundo plano
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Notificación recibida en segundo plano:', payload);

    const notificationTitle = payload.notification?.title || 'FlowSpace';
    const notificationOptions = {
        body: payload.notification?.body || 'Nueva notificación',
        icon: '/logo_flowspace.png',
        badge: '/logo_flowspace.png',
        tag: payload.data?.taskId || 'general',
        data: payload.data,
        requireInteraction: true,
        vibrate: [200, 100, 200]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notificación clickeada:', event);
    event.notification.close();

    // Abrir o enfocar la app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Si ya hay una ventana abierta, enfocarla
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Si no, abrir una nueva ventana
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
