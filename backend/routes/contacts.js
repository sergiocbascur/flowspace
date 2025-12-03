import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from './auth.js';
import { pool } from '../db/connection.js';
import { contactValidators } from '../utils/validators.js';
import { createLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Enviar solicitud de contacto
router.post('/request', createLimiter, contactValidators.request, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: errors.array()[0].msg });
        }

        const userId = req.user.userId;
        const { contactId } = req.body;

        if (userId === contactId) {
            return res.status(400).json({ success: false, error: 'No puedes agregarte a ti mismo' });
        }

        // Verificar que el contacto existe
        const contactCheck = await pool.query(
            'SELECT id FROM users WHERE id = $1',
            [contactId]
        );

        if (contactCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }

        // Verificar si ya existe una relación
        const existingCheck = await pool.query(
            'SELECT * FROM user_contacts WHERE (user_id = $1 AND contact_id = $2) OR (user_id = $2 AND contact_id = $1)',
            [userId, contactId]
        );

        if (existingCheck.rows.length > 0) {
            const existing = existingCheck.rows[0];
            if (existing.status === 'accepted') {
                return res.status(400).json({ success: false, error: 'Ya son contactos' });
            }
            if (existing.status === 'pending') {
                return res.status(400).json({ success: false, error: 'Ya existe una solicitud pendiente' });
            }
        }

        // Crear solicitud
        await pool.query(`
            INSERT INTO user_contacts (user_id, contact_id, status, requested_by)
            VALUES ($1, $2, 'pending', $3)
            ON CONFLICT (user_id, contact_id) 
            DO UPDATE SET status = 'pending', requested_by = $3, updated_at = NOW()
        `, [userId, contactId, userId]);

        res.json({ success: true, message: 'Solicitud enviada' });
    } catch (error) {
        console.error('Error enviando solicitud de contacto:', error);
        res.status(500).json({ success: false, error: 'Error al enviar solicitud' });
    }
});

// Aceptar solicitud de contacto
router.post('/accept', [
    body('contactId').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: errors.array()[0].msg });
        }

        const userId = req.user.userId;
        const { contactId } = req.body;

        // Verificar que existe la solicitud pendiente
        const requestCheck = await pool.query(
            'SELECT * FROM user_contacts WHERE user_id = $1 AND contact_id = $2 AND status = $3',
            [userId, contactId, 'pending']
        );

        if (requestCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        // Aceptar solicitud
        await pool.query(`
            UPDATE user_contacts 
            SET status = 'accepted', updated_at = NOW()
            WHERE user_id = $1 AND contact_id = $2
        `, [userId, contactId]);

        res.json({ success: true, message: 'Solicitud aceptada' });
    } catch (error) {
        console.error('Error aceptando solicitud:', error);
        res.status(500).json({ success: false, error: 'Error al aceptar solicitud' });
    }
});

// Rechazar/Bloquear contacto
router.post('/reject', [
    body('contactId').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: errors.array()[0].msg });
        }

        const userId = req.user.userId;
        const { contactId } = req.body;

        await pool.query(
            'DELETE FROM user_contacts WHERE (user_id = $1 AND contact_id = $2) OR (user_id = $2 AND contact_id = $1)',
            [userId, contactId]
        );

        res.json({ success: true, message: 'Contacto eliminado' });
    } catch (error) {
        console.error('Error rechazando contacto:', error);
        res.status(500).json({ success: false, error: 'Error al rechazar contacto' });
    }
});

// Obtener solicitudes pendientes
router.get('/pending', async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(`
            SELECT 
                uc.contact_id as userId,
                u.name,
                u.username,
                u.avatar,
                uc.requested_by,
                uc.created_at
            FROM user_contacts uc
            INNER JOIN users u ON uc.contact_id = u.id
            WHERE uc.user_id = $1 AND uc.status = 'pending'
            ORDER BY uc.created_at DESC
        `, [userId]);

        const requests = result.rows.map(row => ({
            userId: row.userid,
            name: row.name,
            username: row.username,
            avatar: row.avatar,
            requestedBy: row.requested_by,
            createdAt: row.created_at
        }));

        res.json({ success: true, requests });
    } catch (error) {
        console.error('Error obteniendo solicitudes pendientes:', error);
        res.status(500).json({ success: false, error: 'Error al obtener solicitudes' });
    }
});

// Obtener contactos aceptados
router.get('/accepted', async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(`
            SELECT 
                CASE 
                    WHEN uc.user_id = $1 THEN uc.contact_id
                    ELSE uc.user_id
                END as userId,
                u.name,
                u.username,
                u.avatar
            FROM user_contacts uc
            INNER JOIN users u ON (
                CASE 
                    WHEN uc.user_id = $1 THEN u.id = uc.contact_id
                    ELSE u.id = uc.user_id
                END
            )
            WHERE (uc.user_id = $1 OR uc.contact_id = $1)
            AND uc.status = 'accepted'
            ORDER BY u.name
        `, [userId]);

        const contacts = result.rows.map(row => ({
            userId: row.userid,
            name: row.name,
            username: row.username,
            avatar: row.avatar
        }));

        res.json({ success: true, contacts });
    } catch (error) {
        console.error('Error obteniendo contactos:', error);
        res.status(500).json({ success: false, error: 'Error al obtener contactos' });
    }
});

// Buscar usuarios para agregar como contacto
router.get('/search', async (req, res) => {
    try {
        const { query } = req.query;
        const userId = req.user.userId;

        if (!query || query.length < 2) {
            return res.json({ success: true, users: [] });
        }

        const result = await pool.query(`
            SELECT id, name, username, avatar
            FROM users
            WHERE id != $1
            AND (
                LOWER(name) LIKE $2
                OR LOWER(username) LIKE $2
            )
            LIMIT 20
        `, [userId, `%${query.toLowerCase()}%`]);

        const users = result.rows.map(row => ({
            userId: row.id,
            name: row.name,
            username: row.username,
            avatar: row.avatar
        }));

        res.json({ success: true, users });
    } catch (error) {
        console.error('Error buscando usuarios:', error);
        res.status(500).json({ success: false, error: 'Error al buscar usuarios' });
    }
});

export default router;

