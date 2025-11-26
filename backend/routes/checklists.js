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

// Obtener o crear checklist para un recurso
router.get('/resource/:resourceId/:type', async (req, res) => {
    try {
        const { resourceId, type } = req.params;
        const userId = req.user.userId;
        
        if (type !== 'todo' && type !== 'shopping') {
            return res.status(400).json({ success: false, error: 'Tipo de checklist inválido' });
        }

        // Si el resourceId empieza con "EQUIP-", es un equipo antiguo sin recursos asociados
        // Los checklists solo funcionan con recursos nuevos
        if (resourceId.startsWith('EQUIP-')) {
            return res.status(404).json({ 
                success: false, 
                error: 'Los checklists no están disponibles para equipos antiguos. Migra el equipo al nuevo sistema para usar esta funcionalidad.' 
            });
        }

        // Verificar que el recurso existe y el usuario tiene acceso
        const resourceCheck = await pool.query(
            `SELECT r.id, r.group_id, g.type as group_type
             FROM resources r
             INNER JOIN groups g ON r.group_id = g.id
             INNER JOIN group_members gm ON r.group_id = gm.group_id
             WHERE r.id = $1 AND gm.user_id = $2 AND r.status = 'active'`,
            [resourceId, userId]
        );

        if (resourceCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Recurso no encontrado o no tienes acceso' 
            });
        }

        const result = await pool.query(
            `SELECT * FROM resource_checklists 
             WHERE resource_id = $1 AND checklist_type = $2`,
            [resourceId, type]
        );

        if (result.rows.length === 0) {
            // Crear checklist vacío si no existe
            const checklistId = uuidv4();
            const userId = req.user?.userId || null;
            const name = type === 'shopping' ? 'Lista de Compras' : 'To-Do';

            await pool.query(
                `INSERT INTO resource_checklists (id, resource_id, checklist_type, name, items, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [checklistId, resourceId, type, name, '[]', userId]
            );

            const newResult = await pool.query(
                `SELECT * FROM resource_checklists WHERE id = $1`,
                [checklistId]
            );

            return res.json({
                success: true,
                checklist: newResult.rows[0]
            });
        }

        res.json({
            success: true,
            checklist: result.rows[0]
        });
    } catch (error) {
        console.error('Error obteniendo checklist:', error);
        res.status(500).json({ success: false, error: 'Error al obtener checklist' });
    }
});

// Obtener checklist pública (por QR code)
router.get('/public/:qrCode/:type', async (req, res) => {
    try {
        const { qrCode, type } = req.params;

        if (type !== 'todo' && type !== 'shopping') {
            return res.status(400).json({ success: false, error: 'Tipo de checklist inválido' });
        }

        // Buscar recurso por QR code
        const resourceResult = await pool.query(
            `SELECT id FROM resources WHERE qr_code = $1 AND status = 'active'`,
            [qrCode]
        );

        if (resourceResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Recurso no encontrado' });
        }

        const resourceId = resourceResult.rows[0].id;

        const result = await pool.query(
            `SELECT * FROM resource_checklists 
             WHERE resource_id = $1 AND checklist_type = $2`,
            [resourceId, type]
        );

        // Si no existe, devolver lista vacía (no es error)
        if (result.rows.length === 0) {
            return res.json({
                success: true,
                checklist: {
                    id: null,
                    resource_id: resourceId,
                    checklist_type: type,
                    name: type === 'shopping' ? 'Lista de Compras' : 'To-Do',
                    items: [],
                    created_at: null,
                    updated_at: null
                }
            });
        }

        res.json({
            success: true,
            checklist: result.rows[0]
        });
    } catch (error) {
        console.error('Error obteniendo checklist pública:', error);
        res.status(500).json({ success: false, error: 'Error al obtener checklist' });
    }
});

// Agregar item al checklist
router.post('/:id/items', [
    body('name').trim().isLength({ min: 1 }),
    body('quantity').optional().isInt({ min: 1 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: errors.array()[0].msg });
        }

        const { id } = req.params;
        const { name, quantity } = req.body;
        const userId = req.user?.userId || 'public';

        // Obtener checklist actual
        const result = await pool.query(
            `SELECT items, checklist_type FROM resource_checklists WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Checklist no encontrado' });
        }

        const items = Array.isArray(result.rows[0].items) ? result.rows[0].items : [];
        const checklistType = result.rows[0].checklist_type;
        
        // Agregar nuevo item
        const newItem = {
            id: uuidv4(),
            name: name.trim(),
            checked: false,
            addedBy: userId,
            addedAt: new Date().toISOString()
        };

        // Solo agregar quantity si es shopping
        if (checklistType === 'shopping' && quantity) {
            newItem.quantity = parseInt(quantity) || 1;
        }

        items.push(newItem);

        // Actualizar checklist
        await pool.query(
            `UPDATE resource_checklists 
             SET items = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2`,
            [JSON.stringify(items), id]
        );

        const updatedResult = await pool.query(
            `SELECT * FROM resource_checklists WHERE id = $1`,
            [id]
        );

        res.json({
            success: true,
            checklist: updatedResult.rows[0],
            newItem: newItem
        });
    } catch (error) {
        console.error('Error agregando item:', error);
        res.status(500).json({ success: false, error: 'Error al agregar item' });
    }
});

// Actualizar item
router.patch('/:id/items/:itemId', async (req, res) => {
    try {
        const { id, itemId } = req.params;
        const { checked, quantity, name } = req.body;

        // Obtener checklist actual
        const result = await pool.query(
            `SELECT items FROM resource_checklists WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Checklist no encontrado' });
        }

        const items = Array.isArray(result.rows[0].items) ? result.rows[0].items : [];
        const itemIndex = items.findIndex(item => item.id === itemId);

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, error: 'Item no encontrado' });
        }

        // Actualizar item
        if (checked !== undefined) {
            items[itemIndex].checked = checked;
            if (checked && !items[itemIndex].completedAt) {
                items[itemIndex].completedAt = new Date().toISOString();
            } else if (!checked) {
                items[itemIndex].completedAt = null;
            }
        }
        if (quantity !== undefined) {
            items[itemIndex].quantity = parseInt(quantity) || 1;
        }
        if (name !== undefined) {
            items[itemIndex].name = name.trim();
        }

        // Actualizar checklist
        await pool.query(
            `UPDATE resource_checklists 
             SET items = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2`,
            [JSON.stringify(items), id]
        );

        const updatedResult = await pool.query(
            `SELECT * FROM resource_checklists WHERE id = $1`,
            [id]
        );

        res.json({
            success: true,
            checklist: updatedResult.rows[0]
        });
    } catch (error) {
        console.error('Error actualizando item:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar item' });
    }
});

// Eliminar item
router.delete('/:id/items/:itemId', async (req, res) => {
    try {
        const { id, itemId } = req.params;

        // Obtener checklist actual
        const result = await pool.query(
            `SELECT items FROM resource_checklists WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Checklist no encontrado' });
        }

        const items = Array.isArray(result.rows[0].items) ? result.rows[0].items : [];
        const filteredItems = items.filter(item => item.id !== itemId);

        if (filteredItems.length === items.length) {
            return res.status(404).json({ success: false, error: 'Item no encontrado' });
        }

        // Actualizar checklist
        await pool.query(
            `UPDATE resource_checklists 
             SET items = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2`,
            [JSON.stringify(filteredItems), id]
        );

        const updatedResult = await pool.query(
            `SELECT * FROM resource_checklists WHERE id = $1`,
            [id]
        );

        res.json({
            success: true,
            checklist: updatedResult.rows[0]
        });
    } catch (error) {
        console.error('Error eliminando item:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar item' });
    }
});

export default router;

