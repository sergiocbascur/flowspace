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
import equipmentRoutes from './routes/equipment.js';
import documentsRoutes from './routes/documents.js';
import resourcesRoutes from './routes/resources.js';
import shoppingListsRoutes from './routes/shoppingLists.js';
import checklistsRoutes from './routes/checklists.js';
import notesRoutes from './routes/notes.js';

// Inicializar Firebase Admin
initializeFirebase();

// Iniciar planificador
startScheduler();

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Crear servidor HTTP
const server = createServer(app);

// Configurar WebSocket
const wss = new WebSocketServer({ server });
setupWebSocket(wss);

// Inicializar base de datos y arrancar servidor
initDatabase()
    .then(() => {
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Servidor FlowSpace corriendo en http://0.0.0.0:${PORT}`);
            console.log(`📡 WebSocket disponible en ws://0.0.0.0:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('❌ Error al inicializar la base de datos:', error);
        process.exit(1);
    });










