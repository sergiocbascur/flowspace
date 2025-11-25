import express from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../db/connection.js';
import { authenticateToken } from './auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Todas las rutas requieren autenticación excepto las públicas
router.use((req, res, next) => {
    if (req.path.startsWith('/public/')) {
        return next();
    }
    authenticateToken(req, res, next);
});

// Crear recurso
router.post('/', [
    body('name').trim().isLength({ min: 1 }),
    body('resourceType').isIn(['equipment', 'room', 'person', 'house', 'location', 'custom']),
    body('qrCode').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: errors.array()[0].msg });
        }

        const { name, resourceType, description, groupId, qrCode, metadata, latitude, longitude, geofenceRadius } = req.body;
        const userId = req.user.userId;

        // Generar QR code único si no se proporciona
        let finalQrCode = qrCode;
        if (!finalQrCode) {
            const prefix = resourceType.substring(0, 2).toUpperCase();
            finalQrCode = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        }

        // Verificar que el QR code no existe
        const qrCheck = await pool.query(
            'SELECT id FROM resources WHERE qr_code = $1',
            [finalQrCode]
        );

        if (qrCheck.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'El código QR ya existe' });
        }

        const resourceId = uuidv4();

        await pool.query(
            `INSERT INTO resources (id, qr_code, name, resource_type, group_id, description, status, creator_id, metadata, latitude, longitude, geofence_radius)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
                resourceId,
                finalQrCode,
                name,
                resourceType,
                groupId || null,
                description || null,
                'active',
                userId,
                metadata || {},
                latitude || null,
                longitude || null,
                geofenceRadius || 50
            ]
        );

        const result = await pool.query(
            `SELECT * FROM resources WHERE id = $1`,
            [resourceId]
        );

        res.json({
            success: true,
            resource: result.rows[0]
        });
    } catch (error) {
        console.error('Error creando recurso:', error);
        res.status(500).json({ success: false, error: 'Error al crear recurso' });
    }
});

// Listar recursos (solo de grupos a los que el usuario pertenece)
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { resourceType, groupId } = req.query;

        // Primero, obtener los grupos a los que pertenece el usuario
        let query = `
            SELECT DISTINCT r.id, r.qr_code, r.name, r.resource_type, r.group_id, r.description, r.status, 
                   r.creator_id, r.metadata, r.latitude, r.longitude, r.geofence_radius, r.created_at, r.updated_at,
                   g.name as group_name, g.type as group_type
            FROM resources r
            INNER JOIN group_members gm ON r.group_id = gm.group_id
            INNER JOIN groups g ON r.group_id = g.id
            WHERE gm.user_id = $1
        `;
        const params = [userId];
        let paramCount = 2;

        // Filtro por tipo
        if (resourceType) {
            query += ` AND r.resource_type = $${paramCount}`;
            params.push(resourceType);
            paramCount++;
        }

        // Filtro por grupo específico
        if (groupId) {
            query += ` AND r.group_id = $${paramCount}`;
            params.push(groupId);
            paramCount++;
        }

        query += ` ORDER BY r.created_at DESC`;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            resources: result.rows
        });
    } catch (error) {
        console.error('Error listando recursos:', error);
        res.status(500).json({ success: false, error: 'Error al listar recursos' });
    }
});

// Obtener recurso por QR code (autenticado, validando pertenencia a grupos del usuario y contexto)
router.get('/qr/:qrCode', async (req, res) => {
    try {
        const { qrCode } = req.params;
        const userId = req.user.userId;
        const { context } = req.query; // 'work' o 'personal'

        // Obtener el recurso y validar que pertenece a un grupo del usuario con el contexto correcto
        const result = await pool.query(
            `SELECT r.*, g.name as group_name, g.type as group_type
             FROM resources r
             INNER JOIN groups g ON r.group_id = g.id
             INNER JOIN group_members gm ON r.group_id = gm.group_id
             WHERE r.qr_code = $1 AND gm.user_id = $2 AND r.status = 'active'
             ${context ? 'AND g.type = $3' : ''}
             LIMIT 1`,
            context ? [qrCode, userId, context] : [qrCode, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Recurso no encontrado o no tienes acceso' 
            });
        }

        res.json({
            success: true,
            resource: result.rows[0]
        });
    } catch (error) {
        console.error('Error obteniendo recurso por QR:', error);
        res.status(500).json({ success: false, error: 'Error al obtener recurso' });
    }
});

// Obtener recurso por ID (validando pertenencia)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const result = await pool.query(
            `SELECT r.*, g.name as group_name, g.type as group_type
             FROM resources r
             INNER JOIN groups g ON r.group_id = g.id
             INNER JOIN group_members gm ON r.group_id = gm.group_id
             WHERE r.id = $1 AND gm.user_id = $2`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Recurso no encontrado o no tienes acceso' 
            });
        }

        res.json({
            success: true,
            resource: result.rows[0]
        });
    } catch (error) {
        console.error('Error obteniendo recurso:', error);
        res.status(500).json({ success: false, error: 'Error al obtener recurso' });
    }
});

// Obtener recurso por QR code (público)
router.get('/public/:qrCode', async (req, res) => {
    try {
        const { qrCode } = req.params;

        const result = await pool.query(
            `SELECT id, qr_code, name, resource_type, description, metadata, 
                    latitude, longitude, geofence_radius, created_at
             FROM resources WHERE qr_code = $1 AND status = 'active'`,
            [qrCode]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Recurso no encontrado' });
        }

        res.json({
            success: true,
            resource: result.rows[0]
        });
    } catch (error) {
        console.error('Error obteniendo recurso público:', error);
        res.status(500).json({ success: false, error: 'Error al obtener recurso' });
    }
});

// Actualizar recurso
router.patch('/:id', [
    body('name').optional().trim().isLength({ min: 1 }),
    body('description').optional().trim(),
    body('metadata').optional().isObject()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: errors.array()[0].msg });
        }

        const { id } = req.params;
        const { name, description, metadata, latitude, longitude, geofenceRadius, status } = req.body;

        // Verificar que el recurso existe
        const checkResult = await pool.query(
            `SELECT id, creator_id FROM resources WHERE id = $1`,
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Recurso no encontrado' });
        }

        const updateFields = [];
        const params = [];
        let paramCount = 1;

        if (name !== undefined) {
            updateFields.push(`name = $${paramCount}`);
            params.push(name);
            paramCount++;
        }

        if (description !== undefined) {
            updateFields.push(`description = $${paramCount}`);
            params.push(description);
            paramCount++;
        }

        if (metadata !== undefined) {
            updateFields.push(`metadata = $${paramCount}`);
            params.push(JSON.stringify(metadata));
            paramCount++;
        }

        if (latitude !== undefined) {
            updateFields.push(`latitude = $${paramCount}`);
            params.push(latitude);
            paramCount++;
        }

        if (longitude !== undefined) {
            updateFields.push(`longitude = $${paramCount}`);
            params.push(longitude);
            paramCount++;
        }

        if (geofenceRadius !== undefined) {
            updateFields.push(`geofence_radius = $${paramCount}`);
            params.push(geofenceRadius);
            paramCount++;
        }

        if (status !== undefined) {
            updateFields.push(`status = $${paramCount}`);
            params.push(status);
            paramCount++;
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(id);

        await pool.query(
            `UPDATE resources SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
            params
        );

        const result = await pool.query(
            `SELECT * FROM resources WHERE id = $1`,
            [id]
        );

        res.json({
            success: true,
            resource: result.rows[0]
        });
    } catch (error) {
        console.error('Error actualizando recurso:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar recurso' });
    }
});

// Eliminar recurso
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        // Verificar que el recurso existe y pertenece al usuario
        const checkResult = await pool.query(
            `SELECT id, creator_id FROM resources WHERE id = $1`,
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Recurso no encontrado' });
        }

        // Solo el creador puede eliminar
        if (checkResult.rows[0].creator_id !== userId) {
            return res.status(403).json({ success: false, error: 'No tienes permisos para eliminar este recurso' });
        }

        await pool.query(`DELETE FROM resources WHERE id = $1`, [id]);

        res.json({ success: true, message: 'Recurso eliminado correctamente' });
    } catch (error) {
        console.error('Error eliminando recurso:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar recurso' });
    }
});

export default router;

