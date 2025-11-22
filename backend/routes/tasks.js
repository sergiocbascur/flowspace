import express from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../db/connection.js';
import { authenticateToken } from './auth.js';

import { broadcastToGroup, sendToUser } from '../websocket/websocket.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener tareas de un grupo
router.get('/group/:groupId', async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.userId;

        // Verificar que el usuario es miembro del grupo
        const memberCheck = await pool.query(
            'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
            [groupId, userId]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ success: false, error: 'No tienes acceso a este grupo' });
        }

        // Obtener tareas
        const result = await pool.query(
            `SELECT * FROM tasks WHERE group_id = $1 ORDER BY created_at DESC`,
            [groupId]
        );

        const tasks = result.rows.map(task => ({
            id: task.id,
            groupId: task.group_id,
            title: task.title,
            creatorId: task.creator_id,
            category: task.category,
            due: task.due,
            time: task.time,
            status: task.status,
            priority: task.priority,
            postponeCount: task.postpone_count,
            blockedBy: task.blocked_by,
            blockReason: task.block_reason,
            completedAt: task.completed_at,
            completedBy: task.completed_by,
            pointsAwarded: task.points_awarded,
            assignees: task.assignees || [],
            comments: task.comments || [],
            unreadComments: task.unread_comments || 0
        }));

        res.json({ success: true, tasks });
    } catch (error) {
        console.error('Error en GET /tasks/group/:groupId:', error);
        res.status(500).json({ success: false, error: 'Error al obtener tareas' });
    }
});

// Crear tarea
router.post('/', [
    body('groupId').notEmpty(),
    body('title').trim().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: errors.array()[0].msg });
        }

        const { groupId, title, category, due, time, priority = 'medium', assignees = [] } = req.body;
        const userId = req.user.userId;

        // Verificar que el usuario es miembro del grupo
        const memberCheck = await pool.query(
            'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
            [groupId, userId]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ success: false, error: 'No tienes acceso a este grupo' });
        }

        const taskId = `task-${Date.now()}`;
        const finalAssignees = assignees.length > 0 ? assignees : [userId];

        await pool.query(
            `INSERT INTO tasks (id, group_id, title, creator_id, category, due, time, priority, assignees) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [taskId, groupId, title.trim(), userId, category, due, time, priority, JSON.stringify(finalAssignees)]
        );

        // Obtener tarea creada
        const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
        const task = result.rows[0];

        const taskData = {
            id: task.id,
            groupId: task.group_id,
            title: task.title,
            creatorId: task.creator_id,
            category: task.category,
            due: task.due,
            time: task.time,
            status: task.status,
            priority: task.priority,
            postponeCount: task.postpone_count,
            assignees: task.assignees || [],
            comments: task.comments || [],
            unreadComments: task.unread_comments || 0
        };

        // Emitir evento WebSocket
        broadcastToGroup(groupId, {
            type: 'task-created',
            task: taskData
        }, userId); // Excluir al creador (opcional, pero el frontend ya lo añade optimísticamente)

        res.json({
            success: true,
            task: taskData
        });
    } catch (error) {
        console.error('Error en POST /tasks:', error);
        res.status(500).json({ success: false, error: 'Error al crear tarea' });
    }
});

// Actualizar tarea
router.patch('/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user.userId;
        const updates = req.body;

        // Verificar que la tarea existe y el usuario tiene acceso
        const taskCheck = await pool.query(
            `SELECT t.*, gm.id as is_member
             FROM tasks t
             INNER JOIN group_members gm ON t.group_id = gm.group_id
             WHERE t.id = $1 AND gm.user_id = $2`,
            [taskId, userId]
        );

        if (taskCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Tarea no encontrada' });
        }

        const currentTask = taskCheck.rows[0];

        // Construir query de actualización dinámica
        const allowedFields = ['status', 'category', 'due', 'time', 'priority', 'blocked_by', 'block_reason',
            'completed_at', 'completed_by', 'points_awarded', 'assignees', 'comments',
            'unread_comments', 'postpone_count'];
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(updates)) {
            const dbKey = key === 'blockedBy' ? 'blocked_by' :
                key === 'blockReason' ? 'block_reason' :
                    key === 'completedAt' ? 'completed_at' :
                        key === 'completedBy' ? 'completed_by' :
                            key === 'pointsAwarded' ? 'points_awarded' :
                                key === 'unreadComments' ? 'unread_comments' :
                                    key === 'postponeCount' ? 'postpone_count' :
                                        key.toLowerCase();

            if (allowedFields.includes(dbKey)) {
                updateFields.push(`${dbKey} = $${paramIndex}`);
                updateValues.push(typeof value === 'object' ? JSON.stringify(value) : value);
                paramIndex++;
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, error: 'No hay campos válidos para actualizar' });
        }

        updateFields.push(`updated_at = NOW()`);
        updateValues.push(taskId);

        await pool.query(
            `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
            updateValues
        );

        // Obtener tarea actualizada
        const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
        const task = result.rows[0];

        const updatedTaskData = {
            id: task.id,
            groupId: task.group_id,
            title: task.title,
            creatorId: task.creator_id,
            category: task.category,
            due: task.due,
            time: task.time,
            status: task.status,
            priority: task.priority,
            postponeCount: task.postpone_count,
            blockedBy: task.blocked_by,
            blockReason: task.block_reason,
            completedAt: task.completed_at,
            completedBy: task.completed_by,
            pointsAwarded: task.points_awarded,
            assignees: task.assignees || [],
            comments: task.comments || [],
            unreadComments: task.unread_comments || 0
        };

        // Emitir evento WebSocket de actualización
        broadcastToGroup(task.group_id, {
            type: 'task-updated',
            task: updatedTaskData
        }, userId);

        // Notificación de validación
        try {
            if (updates.status === 'waiting_validation' && currentTask.status !== 'waiting_validation') {
                // Identificar a quiénes notificar: Creador y otros asignados (excluyendo al que completó la tarea)
                const usersToNotify = new Set();

                if (currentTask.creator_id && currentTask.creator_id !== userId) {
                    usersToNotify.add(currentTask.creator_id);
                }

                if (currentTask.assignees && Array.isArray(currentTask.assignees)) {
                    currentTask.assignees.forEach(assigneeId => {
                        if (assigneeId !== userId) {
                            usersToNotify.add(assigneeId);
                        }
                    });
                }

                // Enviar notificaciones
                usersToNotify.forEach(targetUserId => {
                    const notification = {
                        id: `notif-${Date.now()}-${targetUserId}`,
                        type: 'validation_request',
                        taskId: task.id,
                        taskTitle: task.title,
                        requestedBy: userId, // ID del usuario que completó la tarea
                        creatorId: task.creator_id,
                        groupId: task.group_id,
                        createdAt: new Date().toISOString(),
                        read: false,
                        subject: `Validación requerida: ${task.title}`,
                        context: 'Tarea completada',
                        suggestedAction: 'Validar'
                    };

                    sendToUser(targetUserId, {
                        type: 'notification',
                        notification: notification
                    });
                });
            }
        } catch (notifError) {
            console.error('Error enviando notificaciones:', notifError);
        }

        res.json({
            success: true,
            task: updatedTaskData
        });

    } catch (error) {
        console.error('Error en PATCH /tasks/:taskId:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar tarea' });
    }
});

// Eliminar tarea
router.delete('/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user.userId;

        // Verificar que la tarea existe y el usuario es el creador o miembro del grupo
        const taskCheck = await pool.query(
            `SELECT t.*, gm.id as is_member
             FROM tasks t
             INNER JOIN group_members gm ON t.group_id = gm.group_id
             WHERE t.id = $1 AND gm.user_id = $2`,
            [taskId, userId]
        );

        if (taskCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Tarea no encontrada' });
        }

        // Solo el creador puede eliminar
        if (taskCheck.rows[0].creator_id !== userId) {
            return res.status(403).json({ success: false, error: 'Solo el creador puede eliminar la tarea' });
        }

        const groupId = taskCheck.rows[0].group_id;

        await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);

        // Emitir evento WebSocket
        broadcastToGroup(groupId, {
            type: 'task-deleted',
            taskId: taskId
        }, userId);

        res.json({ success: true, message: 'Tarea eliminada' });
    } catch (error) {
        console.error('Error en DELETE /tasks/:taskId:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar tarea' });
    }
});

export default router;

