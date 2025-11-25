# ✅ Plan: Sistema Unificado de Listas (To-Do y Compras)

## 🎯 Concepto

Tanto las "Tareas" de un recurso como las "Listas de Compras" son **listas de items checkeables**:

### To-Do / Tareas:
- Items por hacer relacionados al recurso
- Se marcan como completados
- Ejemplos: "Cambiar filtro", "Limpiar equipo", "Revisar calibración"

### Lista de Compras:
- Items para comprar
- Se marcan como comprados
- Solo en áreas/casas personales

**Ambos comparten la misma estructura y UI.**

---

## 🗄️ Opciones de Base de Datos

### Opción 1: Tabla Unificada (Recomendado)

```sql
CREATE TABLE resource_checklists (
    id VARCHAR(255) PRIMARY KEY,
    resource_id VARCHAR(255) REFERENCES resources(id) ON DELETE CASCADE,
    checklist_type VARCHAR(50) NOT NULL, -- 'todo' o 'shopping'
    name VARCHAR(255) NOT NULL,
    items JSONB DEFAULT '[]',
    created_by VARCHAR(255) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource_id, checklist_type)
);

-- Items estructura:
-- [{ id, name, checked, quantity?, createdBy, createdAt, completedAt? }]
```

**Ventajas:**
- Una sola tabla para ambos tipos
- Fácil agregar nuevos tipos en el futuro
- Misma lógica de negocio

### Opción 2: Reutilizar shopping_lists

```sql
-- Usar shopping_lists existente pero con metadata
-- items[].type = 'todo' | 'shopping'
```

**Ventajas:**
- No necesita nueva tabla
- Reutiliza código existente

**Desventajas:**
- Menos claro conceptualmente
- Shopping tiene campos específicos (quantity) que To-Do no necesita

### Opción 3: Tabla de To-Do separada (Actual)

```sql
-- Mantener shopping_lists como está
-- Crear resource_todos separada
CREATE TABLE resource_todos (
    id VARCHAR(255) PRIMARY KEY,
    resource_id VARCHAR(255) REFERENCES resources(id) ON DELETE CASCADE,
    items JSONB DEFAULT '[]',
    created_by VARCHAR(255) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Ventajas:**
- Separación clara de responsabilidades
- Campos específicos para cada tipo

---

## 📦 Estructura de Items

```javascript
// Item base (común para To-Do y Shopping)
{
    id: 'uuid',
    name: 'Cambiar filtro',
    checked: false,
    createdBy: 'user-id',
    createdAt: '2025-01-15T10:00:00Z',
    completedAt: null
}

// Item de Shopping (extiende base)
{
    ...baseItem,
    quantity: 2,  // Solo para shopping
    unit: 'litros' // Opcional
}
```

---

## 🎨 Componente Unificado

```javascript
const CheckableList = ({ 
    items, 
    type, // 'todo' | 'shopping'
    onAddItem, 
    onToggleItem, 
    onDeleteItem 
}) => {
    return (
        <div className="checkable-list">
            {/* Lista de items */}
            {items.map(item => (
                <CheckableItem
                    key={item.id}
                    item={item}
                    type={type}
                    onToggle={() => onToggleItem(item.id)}
                    onDelete={() => onDeleteItem(item.id)}
                />
            ))}
            
            {/* Input para agregar */}
            <AddItemInput
                onAdd={onAddItem}
                placeholder={type === 'shopping' ? 'Agregar item...' : 'Agregar tarea...'}
            />
        </div>
    );
};
```

---

## 🔧 Backend: Endpoints Unificados

### Opción 1: Checklist Unificado

```javascript
// GET /api/resources/:id/checklist/:type
// type = 'todo' | 'shopping'
router.get('/:id/checklist/:type', async (req, res) => {
    const { id, type } = req.params;
    
    const checklist = await pool.query(
        `SELECT * FROM resource_checklists 
         WHERE resource_id = $1 AND checklist_type = $2`,
        [id, type]
    );
    
    // Si no existe, crear vacío
    if (checklist.rows.length === 0) {
        // Crear checklist vacío
        // ...
    }
    
    res.json({ success: true, checklist: checklist.rows[0] });
});

// POST /api/resources/:id/checklist/:type/items
router.post('/:id/checklist/:type/items', async (req, res) => {
    // Agregar item al checklist
});

// PATCH /api/resources/:id/checklist/:type/items/:itemId
router.patch('/:id/checklist/:type/items/:itemId', async (req, res) => {
    // Actualizar item (marcar como completado, etc.)
});
```

### Opción 2: Endpoints Separados (Actual)

```javascript
// To-Do
// GET /api/resources/:id/todos
// POST /api/resources/:id/todos/items

// Shopping (ya existe)
// GET /api/shopping-lists/resource/:resourceId
// POST /api/shopping-lists/:id/items
```

---

## 🚀 Recomendación

**Usar Opción 1: Tabla Unificada `resource_checklists`**

**Razones:**
1. ✅ Ambas listas funcionan igual (items checkeables)
2. ✅ Código reutilizable
3. ✅ Fácil agregar nuevos tipos ("checklist", "wishlist", etc.)
4. ✅ Una sola vista pública para ambos tipos
5. ✅ Mantenimiento más simple

**Estructura:**
- `resource_checklists.type = 'todo'` → To-Do del recurso
- `resource_checklists.type = 'shopping'` → Lista de compras (solo personal)

---

## 📋 Implementación

### Paso 1: Migración
```sql
-- Crear tabla unificada
CREATE TABLE resource_checklists (...);

-- Migrar shopping_lists existentes
INSERT INTO resource_checklists (resource_id, checklist_type, items, ...)
SELECT resource_id, 'shopping', items, ...
FROM shopping_lists;

-- Crear To-Do vacíos para recursos existentes
INSERT INTO resource_checklists (resource_id, checklist_type, items)
SELECT id, 'todo', '[]'
FROM resources
WHERE NOT EXISTS (
    SELECT 1 FROM resource_checklists 
    WHERE resource_id = resources.id AND checklist_type = 'todo'
);
```

### Paso 2: Backend
- Crear endpoints unificados
- Mantener compatibilidad con shopping-lists (opcional)

### Paso 3: Frontend
- Componente `CheckableList` reutilizable
- Usar en `TodoListView` y `ShoppingListView`

---

¿Implementamos con tabla unificada?

