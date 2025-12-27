import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import authRoutes from './routes/auth.js';
import groupsRoutes from './routes/groups.js';
import tasksRoutes from './routes/tasks.js';
import notificationsRoutes from './routes/notifications.js';
import { initDatabase } from './db/connection.js';
import { setupWebSocket } from './websocket/websocket.js';
import { initializeFirebase } from './config/firebase.js';
import { startScheduler } from './cron/scheduler.js';
import { runChallengeTasks } from './cron/challengeScheduler.js';
import equipmentRoutes from './routes/equipment.js';
import documentsRoutes from './routes/documents.js';
import resourcesRoutes from './routes/resources.js';
import shoppingListsRoutes from './routes/shoppingLists.js';
import checklistsRoutes from './routes/checklists.js';
import notesRoutes from './routes/notes.js';
import calendarRoutes from './routes/calendar.js';
import rankingsRoutes from './routes/rankings.js';
import contactsRoutes from './routes/contacts.js';
import statsRoutes from './routes/stats.js';
import challengesRoutes from './routes/challenges.js';

dotenv.config();

// Inicializar Firebase Admin
initializeFirebase();

// Los planificadores se iniciarán después de que la base de datos esté lista

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// CORS: permitir explícitamente los dominios de producción y fallback a .env / localhost
const allowedOrigins = [
    'https://flowspace.farmavet-bodega.cl',
    'https://api.flowspace.farmavet-bodega.cl',
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173'])
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy para obtener IP real en producción
app.set('trust proxy', 1);

// Middleware de logging de seguridad
import { securityLoggerMiddleware } from './middleware/securityLogger.js';
app.use(securityLoggerMiddleware);

// Rate limiting general para todas las rutas API
import { apiLimiter } from './middleware/rateLimiter.js';
app.use('/api', apiLimiter);

// Servir archivos estáticos desde la carpeta public
app.use(express.static('public'));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Ruta para la página pública de equipos (acepta qrCode-secret)
app.get('/equipment/:qrData', (req, res) => {
    res.sendFile('equipment.html', { root: 'public' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/shopping-lists', shoppingListsRoutes);
app.use('/api/checklists', checklistsRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/rankings', rankingsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/challenges', challengesRoutes);

// Crear servidor HTTP
const server = createServer(app);

// Configurar WebSocket
const wss = new WebSocketServer({ server });
setupWebSocket(wss);

// Inicializar base de datos y arrancar servidor
initDatabase()
    .then(() => {
        // Iniciar planificadores después de que la base de datos esté lista
        startScheduler();
        
        // Ejecutar tareas de desafíos cada hora
        setInterval(async () => {
            try {
                await runChallengeTasks();
            } catch (error) {
                console.error('❌ Error en scheduler de desafíos:', error);
            }
        }, 60 * 60 * 1000);
        
        // Ejecutar inmediatamente al iniciar para crear desafíos si no existen
        runChallengeTasks().catch(error => {
            console.error('❌ Error inicializando desafíos:', error);
        });
        
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Servidor FlowSpace corriendo en http://0.0.0.0:${PORT}`);
            console.log(`📡 WebSocket disponible en ws://0.0.0.0:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('❌ Error al inicializar la base de datos:', error);
        process.exit(1);
    });










