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

// Obtener o crear lista de compras para un recurso
router.get('/resource/:resourceId', async (req, res) => {
    try {
        const { resourceId } = req.params;

        const result = await pool.query(
            `SELECT * FROM shopping_lists WHERE resource_id = $1`,
            [resourceId]
        );

        if (result.rows.length === 0) {
            // Crear lista vacía si no existe
            const listId = uuidv4();
            const userId = req.user?.userId || null;

            await pool.query(
                `INSERT INTO shopping_lists (id, resource_id, name, items, created_by)
                 VALUES ($1, $2, $3, $4, $5)`,
                [listId, resourceId, 'Lista de Compras', '[]', userId]
            );

            const newResult = await pool.query(
                `SELECT * FROM shopping_lists WHERE id = $1`,
                [listId]
            );

            return res.json({
                success: true,
                shoppingList: newResult.rows[0]
            });
        }

        res.json({
            success: true,
            shoppingList: result.rows[0]
        });
    } catch (error) {
        console.error('Error obteniendo lista de compras:', error);
        res.status(500).json({ success: false, error: 'Error al obtener lista de compras' });
    }
});

// Obtener lista de compras pública (por QR code)
router.get('/public/:qrCode', async (req, res) => {
    try {
        const { qrCode } = req.params;

        // Buscar recurso por QR code (incluye recursos creados desde equipment)
        let resourceResult = await pool.query(
            `SELECT id, qr_code FROM resources WHERE qr_code = $1 AND status = 'active'`,
            [qrCode]
        );

        // Si no existe en resources, buscar en equipment (compatibilidad)
        if (resourceResult.rows.length === 0) {
            const equipmentResult = await pool.query(
                `SELECT id, qr_code FROM equipment WHERE qr_code = $1`,
                [qrCode]
            );
            
            if (equipmentResult.rows.length > 0) {
                // Buscar si existe un resource asociado al equipment
                resourceResult = await pool.query(
                    `SELECT id, qr_code FROM resources WHERE qr_code = $1 AND status = 'active'`,
                    [qrCode]
                );
            }
        }

        if (resourceResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Recurso no encontrado',
                message: 'El código QR no corresponde a ningún recurso activo'
            });
        }

        const resourceId = resourceResult.rows[0].id;

        const result = await pool.query(
            `SELECT * FROM shopping_lists WHERE resource_id = $1`,
            [resourceId]
        );

        // Si no existe la lista, devolver una lista vacía (no es un error)
        if (result.rows.length === 0) {
            return res.json({
                success: true,
                shoppingList: {
                    id: null,
                    resource_id: resourceId,
                    name: 'Lista de Compras',
                    items: [],
                    shared_with: [],
                    created_at: null,
                    updated_at: null
                }
            });
        }

        res.json({
            success: true,
            shoppingList: result.rows[0]
        });
    } catch (error) {
        console.error('Error obteniendo lista de compras pública:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al obtener lista de compras',
            details: error.message 
        });
    }
});

// Actualizar lista de compras
router.patch('/:id', [
    body('items').optional().isArray(),
    body('name').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: errors.array()[0].msg });
        }

        const { id } = req.params;
        const { items, name } = req.body;

        // Verificar que la lista existe
        const checkResult = await pool.query(
            `SELECT id FROM shopping_lists WHERE id = $1`,
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Lista de compras no encontrada' });
        }

        const updateFields = [];
        const params = [];
        let paramCount = 1;

        if (items !== undefined) {
            updateFields.push(`items = $${paramCount}`);
            params.push(JSON.stringify(items));
            paramCount++;
        }

        if (name !== undefined) {
            updateFields.push(`name = $${paramCount}`);
            params.push(name);
            paramCount++;
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(id);

        await pool.query(
            `UPDATE shopping_lists SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
            params
        );

        const result = await pool.query(
            `SELECT * FROM shopping_lists WHERE id = $1`,
            [id]
        );

        res.json({
            success: true,
            shoppingList: result.rows[0]
        });
    } catch (error) {
        console.error('Error actualizando lista de compras:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar lista de compras' });
    }
});

// Agregar item a la lista
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
        const { name, quantity = 1 } = req.body;
        const userId = req.user?.userId || 'public';

        // Obtener lista actual
        const result = await pool.query(
            `SELECT items FROM shopping_lists WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Lista de compras no encontrada' });
        }

        const items = Array.isArray(result.rows[0].items) ? result.rows[0].items : [];
        
        // Agregar nuevo item
        const newItem = {
            id: uuidv4(),
            name: name.trim(),
            quantity: parseInt(quantity) || 1,
            checked: false,
            addedBy: userId,
            addedAt: new Date().toISOString()
        };

        items.push(newItem);

        // Actualizar lista
        await pool.query(
            `UPDATE shopping_lists SET items = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [JSON.stringify(items), id]
        );

        const updatedResult = await pool.query(
            `SELECT * FROM shopping_lists WHERE id = $1`,
            [id]
        );

        res.json({
            success: true,
            shoppingList: updatedResult.rows[0],
            newItem: newItem
        });
    } catch (error) {
        console.error('Error agregando item:', error);
        res.status(500).json({ success: false, error: 'Error al agregar item' });
    }
});

// Actualizar item (marcar como comprado, cambiar cantidad, etc.)
router.patch('/:id/items/:itemId', async (req, res) => {
    try {
        const { id, itemId } = req.params;
        const { checked, quantity, name } = req.body;

        // Obtener lista actual
        const result = await pool.query(
            `SELECT items FROM shopping_lists WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Lista de compras no encontrada' });
        }

        const items = Array.isArray(result.rows[0].items) ? result.rows[0].items : [];
        const itemIndex = items.findIndex(item => item.id === itemId);

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, error: 'Item no encontrado' });
        }

        // Actualizar item
        if (checked !== undefined) {
            items[itemIndex].checked = checked;
        }
        if (quantity !== undefined) {
            items[itemIndex].quantity = parseInt(quantity) || 1;
        }
        if (name !== undefined) {
            items[itemIndex].name = name.trim();
        }

        // Actualizar lista
        await pool.query(
            `UPDATE shopping_lists SET items = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [JSON.stringify(items), id]
        );

        const updatedResult = await pool.query(
            `SELECT * FROM shopping_lists WHERE id = $1`,
            [id]
        );

        res.json({
            success: true,
            shoppingList: updatedResult.rows[0]
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

        // Obtener lista actual
        const result = await pool.query(
            `SELECT items FROM shopping_lists WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Lista de compras no encontrada' });
        }

        const items = Array.isArray(result.rows[0].items) ? result.rows[0].items : [];
        const filteredItems = items.filter(item => item.id !== itemId);

        if (filteredItems.length === items.length) {
            return res.status(404).json({ success: false, error: 'Item no encontrado' });
        }

        // Actualizar lista
        await pool.query(
            `UPDATE shopping_lists SET items = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [JSON.stringify(filteredItems), id]
        );

        const updatedResult = await pool.query(
            `SELECT * FROM shopping_lists WHERE id = $1`,
            [id]
        );

        res.json({
            success: true,
            shoppingList: updatedResult.rows[0]
        });
    } catch (error) {
        console.error('Error eliminando item:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar item' });
    }
});

export default router;

