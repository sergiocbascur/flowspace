import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/connection.js';
import { generateVerificationCode } from '../utils/helpers.js';
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

        // Crear usuario
        const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await pool.query(
            `INSERT INTO users (id, username, email, password_hash, name, avatar, email_verified) 
             VALUES ($1, $2, $3, $4, $5, $6, true)`,
            [userId, username.trim(), emailLower, passwordHash, username.trim(), avatar]
        );

        // Eliminar código de verificación
        await pool.query('DELETE FROM verification_codes WHERE email = $1', [emailLower]);

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
        console.error('Error en register:', error);
        res.status(500).json({ success: false, error: 'Error al registrar usuario' });
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
            return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos' });
        }

        const user = result.rows[0];

        // Verificar contraseña
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos' });
        }

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

export default router;

