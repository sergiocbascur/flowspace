import express from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../db/connection.js';
import { authenticateToken } from './auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Todas las rutas de notas requieren autenticación
router.use(authenticateToken);

// POST /api/notes/quick - Crear nota rápida contextual
router.post(
    '/quick',
    [
        body('content')
            .trim()
            .isLength({ min: 1 })
            .withMessage('El contenido de la nota no puede estar vacío.')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg
                });
            }

            const { content, groupId, contextExtras } = req.body;
            const userId = req.user.userId;

            const noteId = uuidv4();

            // Contexto base: work/personal y fuente "quick_capture"
            const baseContext = {
                source: 'quick_capture',
                created_from: contextExtras?.created_from || 'main',
                ui_context: contextExtras?.ui_context || null
            };

            await pool.query(
                `INSERT INTO notes (id, content, user_id, group_id, context, tags)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    noteId,
                    content.trim(),
                    userId,
                    groupId || null,
                    JSON.stringify(baseContext),
                    JSON.stringify([])
                ]
            );

            const result = await pool.query(
                `SELECT id, content, user_id, group_id, context, tags, created_at
                 FROM notes
                 WHERE id = $1`,
                [noteId]
            );

            return res.status(201).json({
                success: true,
                note: result.rows[0]
            });
        } catch (error) {
            console.error('Error creando nota rápida:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al crear nota rápida'
            });
        }
    }
);

// GET /api/notes/by-group/:groupId - Obtener notas rápidas por grupo (ordenadas recientes primero)
router.get('/by-group/:groupId', async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.userId;

        // Verificar que el usuario es miembro del grupo
        const membership = await pool.query(
            `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
            [groupId, userId]
        );

        if (membership.rows.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'No tienes acceso a este grupo'
            });
        }

        const result = await pool.query(
            `SELECT id, content, user_id, group_id, context, tags, created_at
             FROM notes
             WHERE group_id = $1
             ORDER BY created_at DESC
             LIMIT 50`,
            [groupId]
        );

        return res.json({
            success: true,
            notes: result.rows
        });
    } catch (error) {
        console.error('Error obteniendo notas del grupo:', error);
        return res.status(500).json({
            success: false,
            error: 'Error al obtener notas'
        });
    }
});

export default router;


