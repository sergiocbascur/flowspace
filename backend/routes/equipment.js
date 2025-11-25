import express from 'express';
import { pool } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/equipment/:qrCode
 * Obtener equipo por código QR
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
        const { qrCode, name, groupId, status, lastMaintenance, nextMaintenance } = req.body;
        const userId = req.user.userId;

        // Verificar si ya existe un equipo con ese QR
        const existing = await pool.query('SELECT id FROM equipment WHERE qr_code = $1', [qrCode]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Ya existe un equipo con ese código QR' });
        }

        const result = await pool.query(
            `INSERT INTO equipment (qr_code, name, group_id, status, last_maintenance, next_maintenance, creator_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [qrCode, name, groupId, status || 'operational', lastMaintenance, nextMaintenance, userId]
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
        const { name, status, lastMaintenance, nextMaintenance } = req.body;
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

        if (name !== undefined) {
            updates.push(`name = $${paramCount++}`);
            values.push(name);
        }
        if (status !== undefined && status !== current.status) {
            updates.push(`status = $${paramCount++}`);
            values.push(status);
            // Log status change
            const statusLabels = {
                'operational': 'Operativo',
                'maintenance': 'En Mantención',
                'broken': 'Averiado',
                'retired': 'Retirado'
            };
            changes.push(`Estado cambiado a: ${statusLabels[status] || status}`);
        }
        if (lastMaintenance !== undefined && lastMaintenance !== current.last_maintenance) {
            updates.push(`last_maintenance = $${paramCount++}`);
            values.push(lastMaintenance);
            // Log last maintenance change
            const formattedDate = lastMaintenance ? new Date(lastMaintenance).toLocaleDateString('es-CL') : 'sin fecha';
            changes.push(`Última mantención actualizada: ${formattedDate}`);
        }
        if (nextMaintenance !== undefined && nextMaintenance !== current.next_maintenance) {
            updates.push(`next_maintenance = $${paramCount++}`);
            values.push(nextMaintenance);
            // Log next maintenance change
            const formattedDate = nextMaintenance ? new Date(nextMaintenance).toLocaleDateString('es-CL') : 'sin fecha';
            changes.push(`Próxima revisión programada: ${formattedDate}`);
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

export default router;
