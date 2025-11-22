import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/connection.js';
import { generateVerificationCode, generateResetToken } from '../utils/helpers.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';
import { sendVerificationEmail } from '../utils/emailService.js';

const router = express.Router();

// Middleware para verificar token JWT
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Token no proporcionado' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// Enviar código de verificación
router.post('/send-verification-code', [
    body('email').isEmail().normalizeEmail(),
    body('username').trim().isLength({ min: 3 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: errors.array()[0].msg });
        }

        const { email, username } = req.body;
        const emailLower = email.toLowerCase().trim();
        const usernameLower = username.toLowerCase().trim();

        // Verificar que el email no esté registrado
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2',
            [emailLower, usernameLower]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'El email o usuario ya está registrado' });
        }

        // Generar código
        const code = generateVerificationCode();

        // Eliminar códigos anteriores para este email
        await pool.query('DELETE FROM verification_codes WHERE email = $1', [emailLower]);

        // Guardar nuevo código
        await pool.query(
            `INSERT INTO verification_codes (email, username, code, expires_at) 
             VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
            [emailLower, usernameLower, code]
        );

        // Enviar código por email
        const emailResult = await sendVerificationEmail(emailLower, code);
        if (!emailResult.success) {
            console.error('Error enviando email:', emailResult.error);
            return res.status(500).json({
                success: false,
                error: 'Error al enviar email. Verifica la configuración SMTP.'
            });
        }

        res.json({
            success: true,
            message: 'Código de verificación enviado a tu email',
            email: email
            // NO incluir 'code' aquí - solo se envía por email
        });
    } catch (error) {
        console.error('Error en send-verification-code:', error);
        res.status(500).json({ success: false, error: 'Error al enviar código' });
    }
});

// Verificar código
router.post('/verify-code', [
    body('email').isEmail().normalizeEmail(),
    body('code').trim().isLength({ min: 6, max: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: errors.array()[0].msg });
        }

        const { email, code } = req.body;
        const emailLower = email.toLowerCase().trim();

        const result = await pool.query(
            `SELECT * FROM verification_codes 
             WHERE email = $1 AND code = $2 AND verified = false AND expires_at > NOW()`,
            [emailLower, code]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, error: 'Código inválido o expirado' });
        }

        // Marcar como verificado
        await pool.query(
            'UPDATE verification_codes SET verified = true WHERE email = $1 AND code = $2',
            [emailLower, code]
        );

        res.json({
            success: true,
            email: result.rows[0].email,
            username: result.rows[0].username
        });
    } catch (error) {
        console.error('Error en verify-code:', error);
        res.status(500).json({ success: false, error: 'Error al verificar código' });
    }
});

// Registrar usuario
router.post('/register', [
    body('username').trim().isLength({ min: 3 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    const client = await pool.connect();
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: errors.array()[0].msg });
        }

        const { username, email, password, avatar = '👤' } = req.body;
        const emailLower = email.toLowerCase().trim();
        const usernameLower = username.toLowerCase().trim();

        // Verificar que el código esté verificado
        const verification = await pool.query(
            'SELECT * FROM verification_codes WHERE email = $1 AND username = $2 AND verified = true',
            [emailLower, usernameLower]
        );

        if (verification.rows.length === 0) {
            return res.status(400).json({ success: false, error: 'El email debe ser verificado primero' });
        }

        // Verificar que no exista el usuario
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2',
            [emailLower, usernameLower]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'El usuario ya existe' });
        }

        // Hashear contraseña
        const passwordHash = await bcrypt.hash(password, 10);

        // Iniciar transacción para crear usuario y datos de ejemplo
        await client.query('BEGIN');

        // Crear usuario
        const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await client.query(
            `INSERT INTO users (id, username, email, password_hash, name, avatar, email_verified) 
             VALUES ($1, $2, $3, $4, $5, $6, true)`,
            [userId, username.trim(), emailLower, passwordHash, username.trim(), avatar]
        );

        // Crear grupo de ejemplo "Familia"
        const { generateUniqueCode } = await import('./groups.js');
        const sampleGroupId = `group-${Date.now()}`;
        const sampleCode = await generateUniqueCode('personal');

        await client.query(
            `INSERT INTO groups (id, name, type, code, creator_id, scores) 
             VALUES ($1, $2, $3, $4, $5, '{}')`,
            [sampleGroupId, 'Familia', 'personal', sampleCode, userId]
        );

        // Agregar usuario como miembro del grupo
        await client.query(
            'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
            [sampleGroupId, userId]
        );

        // Crear tareas de ejemplo
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 5);

        const sampleTasks = [
            {
                id: `task-${Date.now()}-1`,
                title: 'Comprar víveres para la semana',
                category: 'Hogar',
                due: 'Hoy',
                priority: 'medium'
            },
            {
                id: `task-${Date.now()}-2`,
                title: 'Llamar al dentista para agendar cita',
                category: 'Salud',
                due: 'Mañana',
                priority: 'high'
            },
            {
                id: `task-${Date.now()}-3`,
                title: 'Organizar reunión familiar del fin de semana',
                category: 'Familia',
                due: nextWeek.toISOString().split('T')[0],
                priority: 'low'
            }
        ];

        for (const task of sampleTasks) {
            await client.query(
                `INSERT INTO tasks (id, group_id, title, creator_id, category, due, status, priority, assignees) 
                 VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)`,
                [task.id, sampleGroupId, task.title, userId, task.category, task.due, task.priority, JSON.stringify([userId])]
            );
        }

        // Eliminar código de verificación
        await client.query('DELETE FROM verification_codes WHERE email = $1', [emailLower]);

        await client.query('COMMIT');

        // Generar token JWT
        const token = jwt.sign(
            { userId, username: username.trim(), email: emailLower },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            user: {
                id: userId,
                username: username.trim(),
                name: username.trim(),
                email: emailLower,
                avatar
            },
            token
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en register:', error);
        res.status(500).json({ success: false, error: 'Error al registrar usuario' });
    } finally {
        client.release();
    }
});

// Login
router.post('/login', [
    body('username').trim().notEmpty(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: 'Usuario y contraseña requeridos' });
        }

        const { username, password } = req.body;
        const searchTerm = username.toLowerCase().trim();

        // Buscar usuario
        const result = await pool.query(
            'SELECT * FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $1',
            [searchTerm]
        );

        if (result.rows.length === 0) {
            console.log(`[LOGIN] Usuario no encontrado: ${searchTerm}`);
            return res.status(401).json({
                success: false,
                error: 'Usuario no encontrado. ¿No tienes cuenta? Regístrate para crear una nueva.'
            });
        }

        const user = result.rows[0];

        // Verificar que tenga password_hash
        if (!user.password_hash) {
            console.log(`[LOGIN] Usuario sin password_hash: ${user.id}`);
            return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos' });
        }

        // Verificar contraseña
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            console.log(`[LOGIN] Contraseña incorrecta para usuario: ${user.username}`);
            return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos' });
        }

        console.log(`[LOGIN] Login exitoso para usuario: ${user.username}`);

        // Generar token JWT
        const token = jwt.sign(
            { userId: user.id, username: user.username, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                avatar: user.avatar
            },
            token
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, error: 'Error al iniciar sesión' });
    }
});

// Obtener usuario actual
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, name, email, avatar FROM users WHERE id = $1', [req.user.userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }

        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error('Error en /me:', error);
        res.status(500).json({ success: false, error: 'Error al obtener usuario' });
    }
});

// Actualizar perfil (avatar)
router.patch('/profile', authenticateToken, [
    body('avatar').trim().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: errors.array()[0].msg });
        }

        const { avatar } = req.body;
        const userId = req.user.userId;

        // Actualizar avatar
        await pool.query(
            'UPDATE users SET avatar = $1 WHERE id = $2',
            [avatar, userId]
        );

        // Obtener usuario actualizado
        const result = await pool.query(
            'SELECT id, username, name, email, avatar FROM users WHERE id = $1',
            [userId]
        );

        res.json({
            success: true,
            user: result.rows[0],
            message: 'Avatar actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error en PATCH /profile:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar perfil' });
    }
});

// Solicitar recuperación de contraseña
router.post('/forgot-password', [
    body('email').isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: errors.array()[0].msg });
        }

        const { email } = req.body;
        const emailLower = email.toLowerCase().trim();

        // Buscar usuario
        const userResult = await pool.query('SELECT id, email FROM users WHERE email = $1', [emailLower]);

        // Por seguridad, no revelamos si el email existe o no
        if (userResult.rows.length === 0) {
            return res.json({
                success: true,
                message: 'Si el email existe, recibirás un código de recuperación.'
            });
        }

        const user = userResult.rows[0];

        // Generar token
        const token = generateResetToken();

        // Eliminar tokens anteriores
        await pool.query('DELETE FROM reset_tokens WHERE user_id = $1', [user.id]);

        // Guardar token
        await pool.query(
            `INSERT INTO reset_tokens (token, user_id, email, expires_at) 
             VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour')`,
            [token, user.id, emailLower]
        );

        // Enviar email
        const emailResult = await sendPasswordResetEmail(emailLower, token);
        if (!emailResult.success) {
            console.error('Error enviando email de recuperación:', emailResult.error);
            return res.status(500).json({
                success: false,
                error: 'Error al enviar email. Verifica la configuración SMTP.'
            });
        }

        res.json({
            success: true,
            message: 'Código de recuperación enviado a tu email'
        });
    } catch (error) {
        console.error('Error en /forgot-password:', error);
        res.status(500).json({ success: false, error: 'Error al solicitar recuperación' });
    }
});

// Resetear contraseña
router.post('/reset-password', [
    body('token').trim().notEmpty(),
    body('newPassword').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: errors.array()[0].msg });
        }

        const { token, newPassword } = req.body;

        // Verificar token
        const tokenResult = await pool.query(
            `SELECT * FROM reset_tokens 
             WHERE token = $1 AND used = false AND expires_at > NOW()`,
            [token]
        );

        if (tokenResult.rows.length === 0) {
            return res.status(400).json({ success: false, error: 'Código inválido o expirado' });
        }

        const resetToken = tokenResult.rows[0];

        // Hashear nueva contraseña
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Actualizar contraseña
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [passwordHash, resetToken.user_id]
        );

        // Marcar token como usado
        await pool.query('UPDATE reset_tokens SET used = true WHERE token = $1', [token]);

        res.json({ success: true, message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        console.error('Error en /reset-password:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar contraseña' });
    }
});

// Eliminar cuenta
router.delete('/account', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Verificar que el usuario existe
        const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }

        // Eliminar usuario (CASCADE eliminará grupos donde es creador, miembros, tareas, etc.)
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);

        res.json({ success: true, message: 'Cuenta eliminada exitosamente' });
    } catch (error) {
        console.error('Error en DELETE /account:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar cuenta' });
    }
});

export default router;

