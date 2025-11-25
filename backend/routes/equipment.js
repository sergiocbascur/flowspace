import express from 'express';
import { pool } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { calculateDistance } from '../utils/geolocation.js';

const router = express.Router();

/**
 * GET /api/equipment/public/:qrCode/logs
 * Obtener bitácora pública de un equipo (solo lectura, sin autenticación)
 * IMPORTANTE: Esta ruta debe estar ANTES de otras rutas para que Express la capture correctamente
 */
router.get('/public/:qrCode/logs', async (req, res) => {
    try {
        const { qrCode } = req.params;

        const result = await pool.query(
            `SELECT l.id, l.content, l.created_at, u.username, u.avatar 
             FROM equipment_logs l
             JOIN equipment e ON l.equipment_id = e.id
             JOIN users u ON l.user_id = u.id
             WHERE e.qr_code = $1
             ORDER BY l.created_at DESC
             LIMIT 50`,
            [qrCode]
        );

        res.json({
            success: true,
            logs: result.rows
        });
    } catch (error) {
        console.error('Error obteniendo logs públicos:', error);
        res.status(500).json({ error: 'Error al obtener logs' });
    }
});

/**
 * GET /api/equipment/public/:qrCode
 * Obtener información pública del equipo (solo lectura, sin autenticación)
 * IMPORTANTE: Esta ruta debe estar ANTES de /:qrCode para que Express la capture correctamente
 */
router.get('/public/:qrCode', async (req, res) => {
    try {
        const { qrCode } = req.params;

        const result = await pool.query(
            `SELECT e.id, e.qr_code, e.name, e.status, 
                    e.last_maintenance, e.next_maintenance, e.created_at,
                    u.username as creator_name
             FROM equipment e
             LEFT JOIN users u ON e.creator_id = u.id
             WHERE e.qr_code = $1`,
            [qrCode]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        // Devolver solo información pública (sin datos sensibles)
        const equipment = result.rows[0];
        res.json({
            success: true,
            equipment: {
                qr_code: equipment.qr_code,
                name: equipment.name,
                status: equipment.status,
                last_maintenance: equipment.last_maintenance,
                next_maintenance: equipment.next_maintenance,
                created_at: equipment.created_at,
                creator_name: equipment.creator_name
            }
        });
    } catch (error) {
        console.error('Error obteniendo equipo público:', error);
        res.status(500).json({ error: 'Error al obtener equipo' });
    }
});

/**
 * GET /api/equipment
 * Obtener todos los equipos del usuario (requiere autenticación)
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            `SELECT e.*, u.username as creator_name, g.name as group_name, g.type as group_type
             FROM equipment e
             LEFT JOIN users u ON e.creator_id = u.id
             LEFT JOIN groups g ON e.group_id = g.id
             ORDER BY e.created_at DESC`,
            []
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo equipos:', error);
        res.status(500).json({ error: 'Error al obtener equipos' });
    }
});

/**
 * GET /api/equipment/:qrCode
 * Obtener equipo por código QR (requiere autenticación)
 */
router.get('/:qrCode', authenticateToken, async (req, res) => {
    try {
        const { qrCode } = req.params;

        const result = await pool.query(
            `SELECT e.*, u.username as creator_name 
             FROM equipment e
             LEFT JOIN users u ON e.creator_id = u.id
             WHERE e.qr_code = $1`,
            [qrCode]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo equipo:', error);
        res.status(500).json({ error: 'Error al obtener equipo' });
    }
});

/**
 * POST /api/equipment
 * Crear nuevo equipo
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { qrCode, name, groupId, status, lastMaintenance, nextMaintenance, latitude, longitude, geofenceRadius } = req.body;
        const userId = req.user.userId;

        // Verificar si ya existe un equipo con ese QR
        const existing = await pool.query('SELECT id FROM equipment WHERE qr_code = $1', [qrCode]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Ya existe un equipo con ese código QR' });
        }

        const result = await pool.query(
            `INSERT INTO equipment (qr_code, name, group_id, status, last_maintenance, next_maintenance, creator_id, latitude, longitude, geofence_radius)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [qrCode, name, groupId, status || 'operational', lastMaintenance, nextMaintenance, userId, latitude, longitude, geofenceRadius || 50]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando equipo:', error);
        res.status(500).json({ error: 'Error al crear equipo' });
    }
});

/**
 * PATCH /api/equipment/:qrCode
 * Actualizar equipo
 */
router.patch('/:qrCode', authenticateToken, async (req, res) => {
    try {
        const { qrCode } = req.params;
        const { name, status, lastMaintenance, nextMaintenance, latitude, longitude, geofenceRadius } = req.body;
        const userId = req.user.userId;

        // Get current equipment data to compare changes
        const currentEquipment = await pool.query(
            'SELECT * FROM equipment WHERE qr_code = $1',
            [qrCode]
        );

        if (currentEquipment.rows.length === 0) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        const current = currentEquipment.rows[0];
        const changes = [];

        const updates = [];
        const values = [];
        let paramCount = 1;

        // Helper function to normalize dates for comparison
        const normalizeDateForComparison = (date) => {
            if (!date) return null;

            // If it's a Date object, convert to ISO string first
            if (date instanceof Date) {
                return date.toISOString().split('T')[0];
            }

            // If it's a string, extract just the date part (yyyy-MM-dd)
            if (typeof date === 'string') {
                return date.split('T')[0];
            }

            return date;
        };

        if (name !== undefined) {
            updates.push(`name = $${paramCount++}`);
            values.push(name);
        }
        if (status !== undefined) {
            updates.push(`status = $${paramCount++}`);
            values.push(status);
            // Only log if changed
            if (status !== current.status) {
                const statusLabels = {
                    'operational': 'Operativo',
                    'maintenance': 'En Mantención',
                    'broken': 'Averiado',
                    'retired': 'Retirado'
                };
                changes.push(`Estado cambiado a: ${statusLabels[status] || status}`);
            }
        }
        if (lastMaintenance !== undefined) {
            updates.push(`last_maintenance = $${paramCount++}`);
            values.push(lastMaintenance);
            // Only log if changed (normalize dates for comparison)
            const normalizedNew = normalizeDateForComparison(lastMaintenance);
            const normalizedCurrent = normalizeDateForComparison(current.last_maintenance);
            if (normalizedNew !== normalizedCurrent) {
                const formattedDate = lastMaintenance ? new Date(lastMaintenance).toLocaleDateString('es-CL') : 'sin fecha';
                changes.push(`Última mantención actualizada: ${formattedDate}`);
            }
        }
        if (nextMaintenance !== undefined) {
            updates.push(`next_maintenance = $${paramCount++}`);
            values.push(nextMaintenance);
            // Only log if changed (normalize dates for comparison)
            const normalizedNew = normalizeDateForComparison(nextMaintenance);
            const normalizedCurrent = normalizeDateForComparison(current.next_maintenance);
            if (normalizedNew !== normalizedCurrent) {
                const formattedDate = nextMaintenance ? new Date(nextMaintenance).toLocaleDateString('es-CL') : 'sin fecha';
                changes.push(`Próxima revisión programada: ${formattedDate}`);
            }
        }
        if (latitude !== undefined) {
            updates.push(`latitude = $${paramCount++}`);
            values.push(latitude);
        }
        if (longitude !== undefined) {
            updates.push(`longitude = $${paramCount++}`);
            values.push(longitude);
        }
        if (geofenceRadius !== undefined) {
            updates.push(`geofence_radius = $${paramCount++}`);
            values.push(geofenceRadius);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(qrCode);

        const result = await pool.query(
            `UPDATE equipment SET ${updates.join(', ')} WHERE qr_code = $${paramCount} RETURNING *`,
            values
        );

        // Create log entries for each change
        if (changes.length > 0) {
            for (const change of changes) {
                await pool.query(
                    `INSERT INTO equipment_logs (equipment_id, user_id, content)
                     VALUES ($1, $2, $3)`,
                    [current.id, userId, change]
                );
            }
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error actualizando equipo:', error);
        res.status(500).json({ error: 'Error al actualizar equipo' });
    }
});

/**
 * GET /api/equipment/:qrCode/logs
 * Obtener bitácora de un equipo
 */
router.get('/:qrCode/logs', authenticateToken, async (req, res) => {
    try {
        const { qrCode } = req.params;

        const result = await pool.query(
            `SELECT l.*, u.username, u.avatar 
             FROM equipment_logs l
             JOIN equipment e ON l.equipment_id = e.id
             JOIN users u ON l.user_id = u.id
             WHERE e.qr_code = $1
             ORDER BY l.created_at DESC`,
            [qrCode]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo logs:', error);
        res.status(500).json({ error: 'Error al obtener logs' });
    }
});

/**
 * POST /api/equipment/:qrCode/logs
 * Agregar entrada a la bitácora
 */
router.post('/:qrCode/logs', authenticateToken, async (req, res) => {
    try {
        const { qrCode } = req.params;
        const { content } = req.body;
        const userId = req.user.userId;

        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'El contenido no puede estar vacío' });
        }

        // Obtener ID del equipo
        const equipmentResult = await pool.query('SELECT id FROM equipment WHERE qr_code = $1', [qrCode]);
        if (equipmentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        const equipmentId = equipmentResult.rows[0].id;

        const result = await pool.query(
            `INSERT INTO equipment_logs (equipment_id, user_id, content)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [equipmentId, userId, content]
        );

        // Obtener datos completos del log con usuario
        const logWithUser = await pool.query(
            `SELECT l.*, u.username, u.avatar 
             FROM equipment_logs l
             JOIN users u ON l.user_id = u.id
             WHERE l.id = $1`,
            [result.rows[0].id]
        );

        res.status(201).json(logWithUser.rows[0]);
    } catch (error) {
        console.error('Error creando log:', error);
        res.status(500).json({ error: 'Error al crear log' });
    }
});

/**
 * POST /api/equipment/public/:qrCode/verify-location
 * Verificar ubicación y obtener equipo si está dentro de la geocerca
 * No requiere autenticación, pero valida que el usuario esté cerca del equipo
 */
router.post('/public/:qrCode/verify-location', async (req, res) => {
    try {
        const { qrCode } = req.params;
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({
                error: 'Ubicación requerida',
                message: 'Necesitamos tu ubicación para verificar que estás frente al equipo'
            });
        }

        // Obtener información del equipo
        const equipmentResult = await pool.query(
            `SELECT e.id, e.qr_code, e.name, e.status, 
                    e.last_maintenance, e.next_maintenance, e.created_at,
                    e.latitude, e.longitude, e.geofence_radius,
                    u.username as creator_name
             FROM equipment e
             LEFT JOIN users u ON e.creator_id = u.id
             WHERE e.qr_code = $1`,
            [qrCode]
        );

        if (equipmentResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Equipo no encontrado',
                message: 'No se encontró un equipo con este código'
            });
        }

        const equipment = equipmentResult.rows[0];

        // Verificar que el equipo tenga coordenadas configuradas
        if (!equipment.latitude || !equipment.longitude) {
            return res.status(400).json({
                error: 'Equipo sin ubicación configurada',
                message: 'Este equipo no tiene una ubicación registrada. Contacta al administrador.'
            });
        }

        // Convertir coordenadas a números (pueden venir como strings de la BD)
        const userLat = parseFloat(latitude);
        const userLon = parseFloat(longitude);
        const equipLat = parseFloat(equipment.latitude);
        const equipLon = parseFloat(equipment.longitude);

        // Validar que las coordenadas sean números válidos
        if (isNaN(userLat) || isNaN(userLon) || isNaN(equipLat) || isNaN(equipLon)) {
            return res.status(400).json({
                success: false,
                error: 'Coordenadas inválidas',
                message: 'Las coordenadas proporcionadas no son válidas'
            });
        }

        // Calcular distancia entre usuario y equipo
        const distance = calculateDistance(
            userLat,
            userLon,
            equipLat,
            equipLon
        );

        const radius = parseFloat(equipment.geofence_radius) || 50;

        // Verificar si está dentro de la geocerca
        // Agregar un margen de tolerancia del 20% para compensar errores de GPS
        const toleranceRadius = radius * 1.2;
        
        if (distance > toleranceRadius) {
            return res.json({
                success: false,
                authorized: false,
                message: `Debes estar a menos de ${radius} metros del equipo para ver esta información. Estás a ${Math.round(distance)} metros.`,
                distance: Math.round(distance),
                requiredRadius: radius
            });
        }

        // Está dentro de la geocerca, obtener logs
        const logsResult = await pool.query(
            `SELECT l.id, l.content, l.created_at,
                    u.username, u.avatar
             FROM equipment_logs l
             LEFT JOIN users u ON l.user_id = u.id
             WHERE l.equipment_id = $1
             ORDER BY l.created_at DESC
             LIMIT 50`,
            [equipment.id]
        );

        // No incluir las coordenadas en la respuesta por seguridad
        const { latitude: _, longitude: __, geofence_radius: ___, ...equipmentData } = equipment;

        res.json({
            success: true,
            authorized: true,
            equipment: {
                qr_code: equipment.qr_code,
                name: equipment.name,
                status: equipment.status,
                last_maintenance: equipment.last_maintenance,
                next_maintenance: equipment.next_maintenance,
                created_at: equipment.created_at,
                creator_name: equipment.creator_name
            },
            logs: logsResult.rows,
            distance: Math.round(distance)
        });
    } catch (error) {
        console.error('Error verificando ubicación:', error);
        res.status(500).json({ error: 'Error al verificar ubicación' });
    }
});

/**
 * POST /api/equipment/:qrCode/temp-code
 * Generar código temporal de acceso (requiere autenticación)
 * El código es válido por 30 segundos para ser ingresado
 */
router.post('/:qrCode/temp-code', authenticateToken, async (req, res) => {
    try {
        const { qrCode } = req.params;
        const userId = req.user.userId;

        // Verificar que el equipo existe
        const equipmentResult = await pool.query(
            'SELECT id FROM equipment WHERE qr_code = $1',
            [qrCode]
        );

        if (equipmentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        const equipmentId = equipmentResult.rows[0].id;

        // Generar código aleatorio de 8 caracteres (números y letras mayúsculas)
        const generateCode = () => {
            const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            let code = '';
            for (let i = 0; i < 8; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
        };

        let code = generateCode();
        let codeExists = true;
        
        // Asegurar que el código sea único
        while (codeExists) {
            const checkResult = await pool.query(
                'SELECT id FROM equipment_temp_codes WHERE code = $1',
                [code]
            );
            if (checkResult.rows.length === 0) {
                codeExists = false;
            } else {
                code = generateCode();
            }
        }

        // El código expira en 30 segundos
        const expiresAt = new Date(Date.now() + 30 * 1000);

        // Guardar código en la base de datos
        await pool.query(
            `INSERT INTO equipment_temp_codes (equipment_id, code, created_by, expires_at)
             VALUES ($1, $2, $3, $4)`,
            [equipmentId, code, userId, expiresAt]
        );

        res.json({
            success: true,
            code: code,
            expiresAt: expiresAt.toISOString(),
            message: 'Código generado. Válido por 30 segundos.'
        });
    } catch (error) {
        console.error('Error generando código temporal:', error);
        res.status(500).json({ error: 'Error al generar código temporal' });
    }
});

/**
 * POST /api/equipment/public/verify-temp-code
 * Verificar código temporal y otorgar acceso por 5 minutos
 * No requiere autenticación
 */
router.post('/public/verify-temp-code', async (req, res) => {
    try {
        const { qrCode, code } = req.body;

        if (!qrCode || !code) {
            return res.status(400).json({
                success: false,
                error: 'Código QR y código temporal requeridos'
            });
        }

        // Verificar que el equipo existe
        const equipmentResult = await pool.query(
            'SELECT id FROM equipment WHERE qr_code = $1',
            [qrCode]
        );

        if (equipmentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Equipo no encontrado'
            });
        }

        const equipmentId = equipmentResult.rows[0].id;

        // Buscar código temporal válido
        const codeResult = await pool.query(
            `SELECT * FROM equipment_temp_codes 
             WHERE code = $1 
             AND equipment_id = $2 
             AND expires_at > NOW() 
             AND used_at IS NULL
             ORDER BY created_at DESC
             LIMIT 1`,
            [code, equipmentId]
        );

        if (codeResult.rows.length === 0) {
            return res.json({
                success: false,
                error: 'Código inválido o expirado'
            });
        }

        const tempCode = codeResult.rows[0];

        // Marcar código como usado
        await pool.query(
            'UPDATE equipment_temp_codes SET used_at = NOW() WHERE id = $1',
            [tempCode.id]
        );

        // Obtener información del equipo
        const equipmentInfo = await pool.query(
            `SELECT e.id, e.qr_code, e.name, e.status, 
                    e.last_maintenance, e.next_maintenance, e.created_at,
                    u.username as creator_name
             FROM equipment e
             LEFT JOIN users u ON e.creator_id = u.id
             WHERE e.qr_code = $1`,
            [qrCode]
        );

        if (equipmentInfo.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Equipo no encontrado'
            });
        }

        const equipment = equipmentInfo.rows[0];

        // Obtener logs
        const logsResult = await pool.query(
            `SELECT l.id, l.content, l.created_at,
                    u.username, u.avatar
             FROM equipment_logs l
             LEFT JOIN users u ON l.user_id = u.id
             WHERE l.equipment_id = $1
             ORDER BY l.created_at DESC
             LIMIT 50`,
            [equipment.id]
        );

        // Generar token de sesión válido por 5 minutos
        const sessionExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

        res.json({
            success: true,
            authorized: true,
            equipment: {
                qr_code: equipment.qr_code,
                name: equipment.name,
                status: equipment.status,
                last_maintenance: equipment.last_maintenance,
                next_maintenance: equipment.next_maintenance,
                created_at: equipment.created_at
            },
            logs: logsResult.rows,
            sessionExpiresAt: sessionExpiresAt.toISOString()
        });
    } catch (error) {
        console.error('Error verificando código temporal:', error);
        res.status(500).json({ error: 'Error al verificar código temporal' });
    }
});

export default router;
