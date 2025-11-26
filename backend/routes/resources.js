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
// También busca en equipment antiguo si no encuentra en resources
router.get('/qr/:qrCode', async (req, res) => {
    try {
        const { qrCode } = req.params;
        const userId = req.user.userId;
        const { context } = req.query; // 'work' o 'personal'

        // Primero buscar en resources (sistema nuevo)
        // Solo buscar recursos de grupos a los que el usuario pertenece
        let result = await pool.query(
            `SELECT r.*, g.name as group_name, g.type as group_type
             FROM resources r
             INNER JOIN groups g ON r.group_id = g.id
             INNER JOIN group_members gm ON r.group_id = gm.group_id
             WHERE r.qr_code = $1 
               AND r.status = 'active'
               AND gm.user_id = $2
               ${context && context !== 'all' ? 'AND g.type = $3' : ''}
             LIMIT 1`,
            context && context !== 'all' ? [qrCode, userId, context] : [qrCode, userId]
        );

        // Si no encuentra en resources, buscar en equipment antiguo
        if (result.rows.length === 0) {
            console.log(`[DEBUG] Recurso no encontrado en resources, buscando en equipment antiguo: ${qrCode}`);
            // Buscar equipment sin filtros de grupo primero
            const equipmentQuery = `
                SELECT e.*, g.name as group_name, g.type as group_type
                FROM equipment e
                LEFT JOIN groups g ON e.group_id = g.id
                WHERE e.qr_code = $1
                LIMIT 1
            `;
            const equipmentResult = await pool.query(equipmentQuery, [qrCode]);

            if (equipmentResult.rows.length > 0) {
                const equip = equipmentResult.rows[0];
                let hasAccess = false;
                
                // Verificar permisos: si tiene grupo, el usuario debe ser miembro
                if (equip.group_id) {
                    const memberCheck = await pool.query(
                        'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
                        [equip.group_id, userId]
                    );
                    if (memberCheck.rows.length === 0) {
                        console.log(`[DEBUG] Usuario ${userId} no es miembro del grupo ${equip.group_id}`);
                        hasAccess = false;
                    } else {
                        // Verificar contexto si se especifica
                        if (context && context !== 'all' && equip.group_type && equip.group_type !== context) {
                            console.log(`[DEBUG] Contexto no coincide: ${equip.group_type} vs ${context}`);
                            hasAccess = false;
                        } else {
                            hasAccess = true;
                        }
                    }
                } else {
                    // Equipment sin grupo - solo permitir si no se especifica contexto o si es 'all'
                    if (!context || context === 'all') {
                        hasAccess = true;
                    } else {
                        console.log(`[DEBUG] Equipment sin grupo pero se requiere contexto ${context}`);
                        hasAccess = false;
                    }
                }
                
                if (hasAccess) {
                    // Convertir equipment a formato de resource
                    result = {
                        rows: [{
                            id: `EQUIP-${equip.id}`,
                            qr_code: equip.qr_code,
                            name: equip.name,
                            resource_type: 'equipment',
                            group_id: equip.group_id,
                            description: equip.description,
                            status: equip.status === 'operational' ? 'active' : 'maintenance',
                            creator_id: equip.creator_id,
                            metadata: {},
                            latitude: equip.latitude,
                            longitude: equip.longitude,
                            geofence_radius: equip.geofence_radius,
                            created_at: equip.created_at,
                            updated_at: equip.updated_at,
                            group_name: equip.group_name,
                            group_type: equip.group_type,
                            last_maintenance: equip.last_maintenance,
                            next_maintenance: equip.next_maintenance
                        }]
                    };
                }
            }
        }

        if (result.rows.length === 0) {
            console.log(`[DEBUG] Recurso ${qrCode} no encontrado para usuario ${userId} en contexto ${context || 'all'}`);
            return res.status(404).json({ 
                success: false, 
                error: 'Recurso no encontrado o no tienes acceso en este contexto' 
            });
        }

        // Verificar que el recurso encontrado pertenece al contexto solicitado (si se especifica)
        const resource = result.rows[0];
        if (context && context !== 'all' && resource.group_type && resource.group_type !== context) {
            console.log(`[DEBUG] Contexto no coincide: recurso es ${resource.group_type}, se busca ${context}`);
            return res.status(404).json({ 
                success: false, 
                error: `Este recurso pertenece a "${resource.group_type === 'work' ? 'Trabajo' : 'Personal'}", pero estás buscando en "${context === 'work' ? 'Trabajo' : 'Personal'}"` 
            });
        }
        
        // Validación adicional: si no tiene grupo_type pero se especifica contexto, rechazar
        if (context && context !== 'all' && !resource.group_type) {
            console.log(`[DEBUG] Recurso sin grupo_type pero se requiere contexto ${context}`);
            return res.status(404).json({ 
                success: false, 
                error: 'Recurso no encontrado en el contexto especificado' 
            });
        }

        res.json({
            success: true,
            resource: resource
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

// POST /api/resources/migrate-equipment
// Migrar automáticamente todos los equipos existentes a recursos en el grupo de Trabajo
router.post('/migrate-equipment', async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = req.user.userId;
        await client.query('BEGIN');

        // 1. Buscar o crear un grupo de tipo "work" para el usuario
        let workGroupResult = await client.query(
            `SELECT g.id FROM groups g
             INNER JOIN group_members gm ON g.id = gm.group_id
             WHERE gm.user_id = $1 AND g.type = 'work'
             LIMIT 1`,
            [userId]
        );

        let workGroupId;
        if (workGroupResult.rows.length === 0) {
            // Crear grupo de trabajo por defecto
            // Generar código único manualmente (similar a groups.js)
            const prefix = 'LAB';
            const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
            const code = `${prefix}-${randomPart}`;
            workGroupId = `group-${Date.now()}`;
            
            await client.query(
                `INSERT INTO groups (id, name, type, code, creator_id)
                 VALUES ($1, $2, $3, $4, $5)`,
                [workGroupId, 'Trabajo', 'work', code, userId]
            );
            
            await client.query(
                `INSERT INTO group_members (group_id, user_id)
                 VALUES ($1, $2)`,
                [workGroupId, userId]
            );
            
            console.log(`[Migrate] Grupo de trabajo creado: ${workGroupId}`);
        } else {
            workGroupId = workGroupResult.rows[0].id;
            console.log(`[Migrate] Usando grupo de trabajo existente: ${workGroupId}`);
        }

        // 2. Obtener todos los equipos
        const equipmentResult = await client.query(
            `SELECT * FROM equipment ORDER BY created_at DESC`
        );
        console.log(`[Migrate] Equipos encontrados: ${equipmentResult.rows.length}`);

        // 3. Obtener recursos existentes para evitar duplicados
        const existingResourcesResult = await client.query(
            `SELECT qr_code FROM resources WHERE qr_code IS NOT NULL`
        );
        const existingQRCodes = new Set(
            existingResourcesResult.rows.map(r => r.qr_code)
        );
        console.log(`[Migrate] Recursos existentes: ${existingQRCodes.size}`);

        // 4. Migrar cada equipo que no esté ya migrado
        const migrated = [];
        const skipped = [];

        for (const equipment of equipmentResult.rows) {
            // Si ya existe un recurso con este QR code, saltar
            if (equipment.qr_code && existingQRCodes.has(equipment.qr_code)) {
                skipped.push(equipment.qr_code);
                continue;
            }

            // Crear recurso desde equipment
            const resourceId = uuidv4();
            const resourceQRCode = equipment.qr_code || `QR-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

            await client.query(
                `INSERT INTO resources (
                    id, qr_code, name, resource_type, group_id, description, status,
                    creator_id, latitude, longitude, geofence_radius, metadata, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
                [
                    resourceId,
                    resourceQRCode,
                    equipment.name,
                    'equipment',
                    workGroupId,
                    equipment.description || null,
                    equipment.status === 'operational' ? 'active' : 'maintenance',
                    equipment.creator_id || userId,
                    equipment.latitude || null,
                    equipment.longitude || null,
                    equipment.geofence_radius || 50,
                    JSON.stringify({
                        last_maintenance: equipment.last_maintenance,
                        next_maintenance: equipment.next_maintenance,
                        migrated_from: 'equipment',
                        original_id: equipment.id
                    }),
                    equipment.created_at || new Date(),
                    equipment.updated_at || new Date()
                ]
            );

            // Actualizar equipment con el group_id para referencia
            if (equipment.qr_code) {
                await client.query(
                    `UPDATE equipment SET group_id = $1 WHERE qr_code = $2`,
                    [workGroupId, equipment.qr_code]
                );
            }

            migrated.push({
                name: equipment.name,
                qr_code: resourceQRCode
            });
        }

        await client.query('COMMIT');

        console.log(`[Migrate] Migración completada: ${migrated.length} equipos migrados, ${skipped.length} omitidos`);

        res.json({
            success: true,
            message: `Migración completada: ${migrated.length} equipos migrados a "Trabajo"`,
            migrated: migrated.length,
            skipped: skipped.length,
            workGroupId: workGroupId,
            details: {
                migrated: migrated,
                skipped: skipped
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en migración automática:', error);
        res.status(500).json({
            success: false,
            error: 'Error al migrar equipos',
            details: error.message
        });
    } finally {
        client.release();
    }
});

export default router;

