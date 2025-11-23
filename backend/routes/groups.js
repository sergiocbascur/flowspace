import express from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../db/connection.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener grupos del usuario
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId;

        // Obtener grupos donde el usuario es miembro
        const result = await pool.query(`
            SELECT g.*, 
                   COALESCE(
                       (SELECT json_agg(json_build_object('id', u.id, 'username', u.username, 'name', u.name, 'avatar', u.avatar))
                        FROM group_members gm
                        JOIN users u ON gm.user_id = u.id
                        WHERE gm.group_id = g.id),
                       '[]'::json
                   ) as members
            FROM groups g
            INNER JOIN group_members gm ON g.id = gm.group_id
            WHERE gm.user_id = $1
            ORDER BY g.created_at DESC
        `, [userId]);

        // Formatear resultados
        const groups = result.rows.map(group => ({
            id: group.id,
            name: group.name,
            type: group.type,
            code: group.code,
            creatorId: group.creator_id,
            scores: group.scores || {},
            members: group.members || []
        }));

        res.json({ success: true, groups });
    } catch (error) {
        console.error('Error en GET /groups:', error);
        res.status(500).json({ success: false, error: 'Error al obtener grupos' });
    }
});

// Helper function to generate unique invite code
export const generateUniqueCode = async (type) => {
    const prefix = type === 'work' ? 'LAB' : 'PER';
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        // Generate 4-character alphanumeric code (36^4 = 1,679,616 possibilities)
        // Using base36 (0-9, a-z) for better uniqueness than just numbers
        const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        const code = `${prefix}-${randomPart}`;

        // Check if code already exists in database
        const existing = await pool.query('SELECT id FROM groups WHERE code = $1', [code]);

        if (existing.rows.length === 0) {
            return code;
        }

        attempts++;
    }

    // Fallback: use timestamp-based code if all random attempts fail (extremely rare)
    const timestampPart = Date.now().toString(36).toUpperCase().slice(-4);
    return `${prefix}-${timestampPart}`;
};

// Crear grupo
router.post('/', [
    body('name').trim().notEmpty(),
    body('type').isIn(['work', 'personal'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: errors.array()[0].msg });
        }

        const { name, type } = req.body;
        const userId = req.user.userId;

        // Generar código único con retry logic
        const code = await generateUniqueCode(type);
        const groupId = `group-${Date.now()}`;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Crear grupo
            await client.query(
                `INSERT INTO groups (id, name, type, code, creator_id, scores) 
                 VALUES ($1, $2, $3, $4, $5, '{}')`,
                [groupId, name.trim(), type, code, userId]
            );

            // Agregar creador como miembro
            await client.query(
                'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
                [groupId, userId]
            );

            await client.query('COMMIT');

            // Obtener grupo creado
            const result = await pool.query(`
                SELECT g.*, 
                       COALESCE(
                           (SELECT json_agg(json_build_object('id', u.id, 'username', u.username, 'name', u.name, 'avatar', u.avatar))
                            FROM group_members gm
                            JOIN users u ON gm.user_id = u.id
                            WHERE gm.group_id = g.id),
                           '[]'::json
                       ) as members
                FROM groups g
                WHERE g.id = $1
            `, [groupId]);

            const group = {
                id: result.rows[0].id,
                name: result.rows[0].name,
                type: result.rows[0].type,
                code: result.rows[0].code,
                creatorId: result.rows[0].creator_id,
                scores: result.rows[0].scores || {},
                members: result.rows[0].members || []
            };

            res.json({ success: true, group });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error en POST /groups:', error);
        res.status(500).json({ success: false, error: 'Error al crear grupo' });
    }
});

// Unirse a grupo por código
router.post('/join', [
    body('code').trim().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: 'Código requerido' });
        }

        const { code } = req.body;
        const userId = req.user.userId;

        // Buscar grupo por código
        const groupResult = await pool.query(
            'SELECT * FROM groups WHERE code = $1',
            [code.toUpperCase()]
        );

        if (groupResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Código de grupo inválido' });
        }

        const group = groupResult.rows[0];

        // Verificar si ya es miembro
        const memberCheck = await pool.query(
            'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
            [group.id, userId]
        );

        if (memberCheck.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Ya eres miembro de este grupo' });
        }

        // Agregar como miembro
        await pool.query(
            'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
            [group.id, userId]
        );

        // Obtener grupo actualizado
        const result = await pool.query(`
            SELECT g.*, 
                   COALESCE(
                       (SELECT json_agg(json_build_object('id', u.id, 'username', u.username, 'name', u.name, 'avatar', u.avatar))
                        FROM group_members gm
                        JOIN users u ON gm.user_id = u.id
                        WHERE gm.group_id = g.id),
                       '[]'::json
                   ) as members
            FROM groups g
            WHERE g.id = $1
        `, [group.id]);

        const updatedGroup = {
            id: result.rows[0].id,
            name: result.rows[0].name,
            type: result.rows[0].type,
            code: result.rows[0].code,
            creatorId: result.rows[0].creator_id,
            scores: result.rows[0].scores || {},
            members: result.rows[0].members || []
        };

        res.json({ success: true, group: updatedGroup });
    } catch (error) {
        console.error('Error en POST /groups/join:', error);
        res.status(500).json({ success: false, error: 'Error al unirse al grupo' });
    }
});

// Dejar grupo
router.post('/:groupId/leave', async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.userId;

        // Verificar que es miembro
        const memberCheck = await pool.query(
            'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
            [groupId, userId]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'No eres miembro de este grupo' });
        }

        // Verificar que no es el creador
        const groupCheck = await pool.query(
            'SELECT creator_id FROM groups WHERE id = $1',
            [groupId]
        );

        if (groupCheck.rows[0].creator_id === userId) {
            return res.status(400).json({ success: false, error: 'El creador no puede dejar el grupo. Elimínalo en su lugar.' });
        }

        // Eliminar miembro
        await pool.query(
            'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
            [groupId, userId]
        );

        res.json({ success: true, message: 'Has dejado el grupo' });
    } catch (error) {
        console.error('Error en POST /groups/:groupId/leave:', error);
        res.status(500).json({ success: false, error: 'Error al dejar el grupo' });
    }
});

// Eliminar grupo (solo creador)
router.delete('/:groupId', async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.userId;

        // Verificar que es el creador
        const groupCheck = await pool.query(
            'SELECT creator_id FROM groups WHERE id = $1',
            [groupId]
        );

        if (groupCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Grupo no encontrado' });
        }

        if (groupCheck.rows[0].creator_id !== userId) {
            return res.status(403).json({ success: false, error: 'Solo el creador puede eliminar el grupo' });
        }

        // Eliminar grupo (CASCADE eliminará miembros y tareas)
        await pool.query('DELETE FROM groups WHERE id = $1', [groupId]);

        res.json({ success: true, message: 'Grupo eliminado' });
    } catch (error) {
        console.error('Error en DELETE /groups/:groupId:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar grupo' });
    }
});

// Actualizar puntajes del grupo
router.patch('/:groupId/scores', [
    body('userId').notEmpty(),
    body('points').isInt()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: errors.array()[0].msg });
        }

        const { groupId } = req.params;
        const { userId, points } = req.body;

        // Obtener scores actuales
        const result = await pool.query(
            'SELECT scores FROM groups WHERE id = $1',
            [groupId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Grupo no encontrado' });
        }

        const scores = result.rows[0].scores || {};
        const currentScore = scores[userId] || 0;
        scores[userId] = Math.max(0, currentScore + points);

        // Actualizar scores
        await pool.query(
            'UPDATE groups SET scores = $1, updated_at = NOW() WHERE id = $2',
            [JSON.stringify(scores), groupId]
        );

        res.json({ success: true, scores });
    } catch (error) {
        console.error('Error en PATCH /groups/:groupId/scores:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar puntajes' });
    }
});

export default router;



