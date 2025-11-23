// Firebase Cloud Messaging Service Worker
// Este archivo maneja las notificaciones push cuando la app está cerrada o en segundo plano

// Importar Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// IMPORTANTE: Reemplaza estos valores con tu configuración de Firebase
// Los mismos valores que pusiste en src/firebase/config.js
const firebaseConfig = {
    apiKey: "AIzaSyDDonKxEwtGKIKCzxXwGfWE-puy3ykIFk0",
    authDomain: "genshiken-1d5b3.firebaseapp.com",
    projectId: "genshiken-1d5b3",
    storageBucket: "genshiken-1d5b3.firebasestorage.app",
    messagingSenderId: "786121411418",
    appId: "1:786121411418:web:158478346008a98acc8163"
};

// Inicializar Firebase en el Service Worker
firebase.initializeApp(firebaseConfig);

// Obtener instancia de messaging
const messaging = firebase.messaging();

// Manejar notificaciones en segundo plano
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Notificación recibida en segundo plano:', payload);

    const notificationTitle = payload.notification?.title || 'Genshiken';
    const notificationOptions = {
        body: payload.notification?.body || 'Nueva notificación',
        icon: payload.notification?.icon || '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: payload.data?.taskId || 'general',
        data: payload.data,
        requireInteraction: false,
        actions: [
            {
                action: 'open',
                title: 'Abrir'
            },
            {
                action: 'close',
                title: 'Cerrar'
            }
        ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar clicks en las notificaciones
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Click en notificación:', event);

    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    // Abrir o enfocar la app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Si ya hay una ventana abierta, enfocarla
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Si no hay ventana abierta, abrir una nueva
                if (clients.openWindow) {
                    const urlToOpen = event.notification.data?.url || '/';
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});
