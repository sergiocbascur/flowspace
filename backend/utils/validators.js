import { body, param, query } from 'express-validator';

/**
 * Validadores reutilizables para diferentes entidades
 */

// Validadores para grupos
export const groupValidators = {
    create: [
        body('name')
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('El nombre del grupo debe tener entre 1 y 100 caracteres')
            .escape(),
        body('type')
            .isIn(['work', 'personal'])
            .withMessage('El tipo debe ser "work" o "personal"'),
        body('description')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('La descripción no puede exceder 500 caracteres')
            .escape()
    ],
    
    update: [
        param('groupId')
            .trim()
            .notEmpty()
            .withMessage('ID de grupo requerido'),
        body('name')
            .optional()
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('El nombre del grupo debe tener entre 1 y 100 caracteres')
            .escape(),
        body('description')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('La descripción no puede exceder 500 caracteres')
            .escape()
    ],
    
    addMember: [
        param('groupId')
            .trim()
            .notEmpty()
            .withMessage('ID de grupo requerido'),
        body('userId')
            .trim()
            .notEmpty()
            .withMessage('ID de usuario requerido')
            .isLength({ max: 255 })
            .withMessage('ID de usuario inválido')
    ]
};

// Validadores para recursos
export const resourceValidators = {
    create: [
        body('name')
            .trim()
            .isLength({ min: 1, max: 255 })
            .withMessage('El nombre del recurso debe tener entre 1 y 255 caracteres')
            .escape(),
        body('type')
            .isIn(['equipment', 'document', 'other'])
            .withMessage('Tipo de recurso inválido'),
        body('groupId')
            .trim()
            .notEmpty()
            .withMessage('ID de grupo requerido')
            .isLength({ max: 255 })
            .withMessage('ID de grupo inválido'),
        body('description')
            .optional()
            .trim()
            .isLength({ max: 1000 })
            .withMessage('La descripción no puede exceder 1000 caracteres')
            .escape()
    ],
    
    update: [
        param('resourceId')
            .trim()
            .notEmpty()
            .withMessage('ID de recurso requerido'),
        body('name')
            .optional()
            .trim()
            .isLength({ min: 1, max: 255 })
            .withMessage('El nombre del recurso debe tener entre 1 y 255 caracteres')
            .escape(),
        body('description')
            .optional()
            .trim()
            .isLength({ max: 1000 })
            .withMessage('La descripción no puede exceder 1000 caracteres')
            .escape()
    ]
};

// Validadores para contactos
export const contactValidators = {
    request: [
        body('contactId')
            .trim()
            .notEmpty()
            .withMessage('ID de contacto requerido')
            .isLength({ max: 255 })
            .withMessage('ID de contacto inválido')
    ],
    
    accept: [
        body('contactId')
            .trim()
            .notEmpty()
            .withMessage('ID de contacto requerido')
            .isLength({ max: 255 })
            .withMessage('ID de contacto inválido')
    ],
    
    remove: [
        param('contactId')
            .trim()
            .notEmpty()
            .withMessage('ID de contacto requerido')
            .isLength({ max: 255 })
            .withMessage('ID de contacto inválido')
    ]
};

// Validadores para rankings
export const rankingValidators = {
    update: [
        body('points')
            .isInt({ min: 0 })
            .withMessage('Los puntos deben ser un número entero positivo'),
        body('completedOnTime')
            .optional()
            .isBoolean()
            .withMessage('completedOnTime debe ser un booleano'),
        body('completedEarly')
            .optional()
            .isBoolean()
            .withMessage('completedEarly debe ser un booleano'),
        body('completedLate')
            .optional()
            .isBoolean()
            .withMessage('completedLate debe ser un booleano')
    ],
    
    getRanking: [
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('El límite debe estar entre 1 y 100'),
        query('offset')
            .optional()
            .isInt({ min: 0 })
            .withMessage('El offset debe ser un número entero positivo')
    ]
};

// Validadores para challenges
export const challengeValidators = {
    create: [
        body('name')
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('El nombre del desafío debe tener entre 1 y 100 caracteres')
            .escape(),
        body('description')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('La descripción no puede exceder 500 caracteres')
            .escape(),
        body('type')
            .isIn(['weekly', 'monthly'])
            .withMessage('El tipo debe ser "weekly" o "monthly"'),
        body('goalPoints')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Los puntos objetivo deben ser un número entero positivo'),
        body('goalTasks')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Las tareas objetivo deben ser un número entero positivo'),
        body('startDate')
            .optional()
            .isISO8601()
            .withMessage('La fecha de inicio debe ser una fecha válida'),
        body('endDate')
            .optional()
            .isISO8601()
            .withMessage('La fecha de fin debe ser una fecha válida')
    ]
};

// Validadores para notas
export const noteValidators = {
    create: [
        body('groupId')
            .trim()
            .notEmpty()
            .withMessage('ID de grupo requerido')
            .isLength({ max: 255 })
            .withMessage('ID de grupo inválido'),
        body('content')
            .trim()
            .isLength({ min: 1, max: 5000 })
            .withMessage('El contenido debe tener entre 1 y 5000 caracteres')
            .escape(),
        body('title')
            .optional()
            .trim()
            .isLength({ max: 200 })
            .withMessage('El título no puede exceder 200 caracteres')
            .escape()
    ],
    
    update: [
        param('noteId')
            .trim()
            .notEmpty()
            .withMessage('ID de nota requerido'),
        body('content')
            .optional()
            .trim()
            .isLength({ min: 1, max: 5000 })
            .withMessage('El contenido debe tener entre 1 y 5000 caracteres')
            .escape(),
        body('title')
            .optional()
            .trim()
            .isLength({ max: 200 })
            .withMessage('El título no puede exceder 200 caracteres')
            .escape()
    ]
};

