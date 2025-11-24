import admin from 'firebase-admin';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseApp = null;

/**
 * Inicializa Firebase Admin SDK
 * @returns {admin.app.App} Instancia de Firebase Admin
 */
export const initializeFirebase = () => {
    if (firebaseApp) {
        return firebaseApp;
    }

    try {
        // Ruta al archivo de credenciales del Service Account
        // Asumimos que está en la raíz del backend o en config
        const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');

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

export const getFirebaseAdmin = () => {
    if (!firebaseApp) {
        return initializeFirebase();
    }
    return firebaseApp;
};
