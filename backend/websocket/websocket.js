import jwt from 'jsonwebtoken';

const clients = new Map(); // userId -> Set of WebSocket connections

export function setupWebSocket(wss) {
    wss.on('connection', (ws, req) => {
        let userId = null;

        // Autenticar conexión
        const token = new URL(req.url, 'http://localhost').searchParams.get('token');
        
        if (!token) {
            ws.close(1008, 'Token requerido');
            return;
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.userId;

            // Agregar a la lista de clientes
            if (!clients.has(userId)) {
                clients.set(userId, new Set());
            }
            clients.get(userId).add(ws);

            console.log(`✅ Cliente conectado: ${userId} (Total: ${clients.size})`);

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    handleMessage(userId, data, ws);
                } catch (error) {
                    console.error('Error procesando mensaje:', error);
                }
            });

            ws.on('close', () => {
                if (userId && clients.has(userId)) {
                    clients.get(userId).delete(ws);
                    if (clients.get(userId).size === 0) {
                        clients.delete(userId);
                    }
                }
                console.log(`❌ Cliente desconectado: ${userId}`);
            });

            ws.on('error', (error) => {
                console.error('Error en WebSocket:', error);
            });

        } catch (error) {
            console.error('Error autenticando WebSocket:', error);
            ws.close(1008, 'Token inválido');
        }
    });
}

function handleMessage(userId, data, ws) {
    switch (data.type) {
        case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        default:
            console.log('Mensaje desconocido:', data);
    }
}

// Broadcast a todos los miembros de un grupo
export function broadcastToGroup(groupId, message, excludeUserId = null) {
    // Esta función se llamaría desde las rutas cuando hay cambios
    // Por ahora es un placeholder - necesitarías una tabla de grupos -> usuarios activos
    clients.forEach((connections, userId) => {
        if (userId !== excludeUserId) {
            connections.forEach(ws => {
                if (ws.readyState === 1) { // OPEN
                    ws.send(JSON.stringify(message));
                }
            });
        }
    });
}

// Broadcast a un usuario específico
export function sendToUser(userId, message) {
    const connections = clients.get(userId);
    if (connections) {
        connections.forEach(ws => {
            if (ws.readyState === 1) { // OPEN
                ws.send(JSON.stringify(message));
            }
        });
    }
}

