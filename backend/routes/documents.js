import express from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../db/connection.js';
import { authenticateToken } from './auth.js';
import { upload, deleteFile, getFileTypeFromMime } from '../utils/fileUpload.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Todas las rutas requieren autenticación excepto las públicas
router.use((req, res, next) => {
    // Las rutas /public/ no requieren autenticación
    if (req.path.startsWith('/public/')) {
        return next();
    }
    authenticateToken(req, res, next);
});

// Subir documento
router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No se proporcionó ningún archivo' });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Eliminar archivo subido si hay error de validación
            deleteFile(req.file.filename);
            return res.status(400).json({ success: false, error: errors.array()[0].msg });
        }

        const { name, description, linkedToType, linkedToId } = req.body;
        const userId = req.user.userId;
        const documentId = uuidv4();

        await pool.query(
            `INSERT INTO documents (id, name, description, file_path, file_type, file_size, uploaded_by, linked_to_type, linked_to_id, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                documentId,
                name || req.file.originalname,
                description || null,
                req.file.filename,
                getFileTypeFromMime(req.file.mimetype),
                req.file.size,
                userId,
                linkedToType || null,
                linkedToId || null,
                {}
            ]
        );

        res.json({
            success: true,
            document: {
                id: documentId,
                name: name || req.file.originalname,
                fileType: getFileTypeFromMime(req.file.mimetype),
                fileSize: req.file.size,
                linkedToType: linkedToType || null,
                linkedToId: linkedToId || null
            }
        });
    } catch (error) {
        console.error('Error subiendo documento:', error);
        // Eliminar archivo si hay error
        if (req.file) {
            deleteFile(req.file.filename);
        }
        res.status(500).json({ success: false, error: 'Error al subir documento' });
    }
});

// Listar documentos (con filtros)
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { linkedToType, linkedToId, type } = req.query;

        let query = `
            SELECT id, name, description, file_type, file_size, uploaded_by, 
                   linked_to_type, linked_to_id, created_at, updated_at
            FROM documents
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        // Filtro por tipo de enlace
        if (linkedToType && linkedToId) {
            query += ` AND linked_to_type = $${paramCount} AND linked_to_id = $${paramCount + 1}`;
            params.push(linkedToType, linkedToId);
            paramCount += 2;
        }

        // Filtro por tipo de archivo
        if (type) {
            query += ` AND file_type = $${paramCount}`;
            params.push(type);
            paramCount++;
        }

        query += ` ORDER BY created_at DESC`;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            documents: result.rows
        });
    } catch (error) {
        console.error('Error listando documentos:', error);
        res.status(500).json({ success: false, error: 'Error al listar documentos' });
    }
});

// Obtener documento
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT id, name, description, file_path, file_type, file_size, 
                    uploaded_by, linked_to_type, linked_to_id, created_at, updated_at
             FROM documents
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Documento no encontrado' });
        }

        res.json({
            success: true,
            document: result.rows[0]
        });
    } catch (error) {
        console.error('Error obteniendo documento:', error);
        res.status(500).json({ success: false, error: 'Error al obtener documento' });
    }
});

// Descargar archivo (servir archivo)
router.get('/:id/download', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT file_path, name, file_type
             FROM documents
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Documento no encontrado' });
        }

        const document = result.rows[0];
        const filePath = path.join(__dirname, '..', 'uploads', document.file_path);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: 'Archivo no encontrado en el servidor' });
        }

        // Determinar content-type
        const contentTypeMap = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'txt': 'text/plain',
            'md': 'text/markdown',
            'jpg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif'
        };

        const contentType = contentTypeMap[document.file_type] || 'application/octet-stream';
        const originalName = document.name || `document.${document.file_type}`;

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error descargando documento:', error);
        res.status(500).json({ success: false, error: 'Error al descargar documento' });
    }
});

// Actualizar metadatos del documento
router.patch('/:id', [
    body('name').optional().trim(),
    body('description').optional().trim(),
    body('linkedToType').optional().trim(),
    body('linkedToId').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: errors.array()[0].msg });
        }

        const { id } = req.params;
        const { name, description, linkedToType, linkedToId } = req.body;

        // Verificar que el documento existe y pertenece al usuario (o tiene permisos)
        const checkResult = await pool.query(
            `SELECT id, uploaded_by FROM documents WHERE id = $1`,
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Documento no encontrado' });
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

        if (linkedToType !== undefined) {
            updateFields.push(`linked_to_type = $${paramCount}`);
            params.push(linkedToType);
            paramCount++;
        }

        if (linkedToId !== undefined) {
            updateFields.push(`linked_to_id = $${paramCount}`);
            params.push(linkedToId);
            paramCount++;
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(id);

        await pool.query(
            `UPDATE documents 
             SET ${updateFields.join(', ')}
             WHERE id = $${paramCount}`,
            params
        );

        res.json({ success: true, message: 'Documento actualizado correctamente' });
    } catch (error) {
        console.error('Error actualizando documento:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar documento' });
    }
});

// Eliminar documento
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        // Obtener información del documento
        const result = await pool.query(
            `SELECT file_path, uploaded_by FROM documents WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Documento no encontrado' });
        }

        const document = result.rows[0];

        // Verificar permisos (solo el que subió puede eliminar, o admin)
        if (document.uploaded_by !== userId) {
            return res.status(403).json({ success: false, error: 'No tienes permisos para eliminar este documento' });
        }

        // Eliminar de la BD
        await pool.query(`DELETE FROM documents WHERE id = $1`, [id]);

        // Eliminar archivo físico
        deleteFile(document.file_path);

        res.json({ success: true, message: 'Documento eliminado correctamente' });
    } catch (error) {
        console.error('Error eliminando documento:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar documento' });
    }
});

export default router;


