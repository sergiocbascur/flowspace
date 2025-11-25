# 🔐 Plan: Separación de Contextos Laboral vs Personal

## 🎯 Problema Clave
Los recursos deben estar **completamente separados** entre contexto laboral y personal:
- ❌ No ver recursos laborales desde personal
- ❌ No ver recursos personales desde laboral
- ✅ Validar contexto al escanear QR codes

---

## 📊 Estructura de Contextos

### Contexto Laboral (`group.type = 'work'`)
**Recursos permitidos:**
- ✅ Equipos (ficha técnica, manual, tareas, documentación)
- ✅ Áreas/Habitaciones (tareas, documentación)

**Grupos:**
- Todos los grupos con `type: 'work'`

### Contexto Personal (`group.type = 'personal'`)
**Recursos permitidos:**
- ✅ Equipos/Electrodomésticos (ficha técnica, manual, tareas, documentación)
- ✅ Áreas/Habitaciones (tareas, documentación)
- ✅ Casas (lista de compras, tareas)

**Grupos:**
- Todos los grupos con `type: 'personal'`

---

## 🔒 Validaciones Necesarias

### 1. Al Crear Recurso
```javascript
// Validar que el grupo pertenece al contexto correcto
const group = await getGroup(groupId);
if (currentContext === 'work' && group.type !== 'work') {
    throw new Error('No puedes crear recursos laborales en un grupo personal');
}
```

### 2. Al Listar Recursos
```javascript
// Solo mostrar recursos del contexto actual
const resources = await getResources({
    groupType: currentContext // 'work' o 'personal'
});
```

### 3. Al Escanear QR (desde app con login)
```javascript
// Validar que el recurso pertenece al contexto actual
const resource = await getResourceByQR(qrCode);
const group = await getGroup(resource.group_id);

if (currentContext === 'work' && group.type !== 'work') {
    // Mostrar error: "Este QR pertenece a tu área personal"
    return showError('Este recurso es personal. Accede desde la sección personal.');
}

if (currentContext === 'personal' && group.type !== 'personal') {
    // Mostrar error: "Este QR pertenece a tu área laboral"
    return showError('Este recurso es laboral. Accede desde la sección laboral.');
}
```

### 4. Vistas Públicas (sin login)
- Las vistas públicas **NO** validan contexto (ya tienen GPS/código temporal)
- Pero podemos agregar metadatos para mostrar un indicador

---

## 🏗️ Cambios en Base de Datos

### Tabla `resources`
Ya tiene `group_id` que referencia a `groups`.
- Los grupos ya tienen `type: 'work' | 'personal'`
- **No necesitamos cambios en BD**, solo validaciones

### Validación en Backend:
```sql
-- Al obtener recursos, filtrar por tipo de grupo
SELECT r.* FROM resources r
JOIN groups g ON r.group_id = g.id
WHERE g.type = 'work'  -- o 'personal'
AND g.id IN (
    SELECT group_id FROM group_members 
    WHERE user_id = $1
);
```

---

## 🎨 Cambios en Frontend

### 1. Contexto Actual
```javascript
// En LabSync.jsx, detectar contexto desde el grupo seleccionado
const currentContext = currentGroup?.type || 'work'; // 'work' | 'personal'

// Guardar en estado
const [context, setContext] = useState(null);

// Actualizar cuando cambia de grupo
useEffect(() => {
    if (currentGroup) {
        setContext(currentGroup.type);
    }
}, [currentGroup]);
```

### 2. Filtrado de Recursos
```javascript
// Solo cargar recursos del contexto actual
const loadResources = async () => {
    const resources = await apiResources.getAll({
        groupType: context
    });
    // ...
};
```

### 3. Escáner con Validación de Contexto
```javascript
const handleQRScanned = async (qrCode) => {
    // Obtener recurso
    const resource = await apiResources.getByQR(qrCode);
    
    // Obtener grupo del recurso
    const group = await apiGroups.getById(resource.group_id);
    
    // Validar contexto
    if (context === 'work' && group.type !== 'work') {
        toast.showError('Este QR pertenece a tu área personal. Accede desde la sección personal.');
        return;
    }
    
    if (context === 'personal' && group.type !== 'personal') {
        toast.showError('Este QR pertenece a tu área laboral. Accede desde la sección laboral.');
        return;
    }
    
    // Si pasa la validación, mostrar opciones de vista
    showViewOptions(resource);
};
```

---

## 📱 Flujo de Escaneo con Contexto

### Escenario 1: Escanear desde Laboral
```
Usuario en sección Laboral
    ↓
Escanea QR code
    ↓
Sistema verifica: ¿Recurso pertenece a grupo laboral?
    ├─ SÍ → Mostrar opciones de vista (ficha, manual, tareas, docs)
    └─ NO → Error: "Este recurso es personal. Accede desde la sección personal."
```

### Escenario 2: Escanear desde Personal
```
Usuario en sección Personal
    ↓
Escanea QR code
    ↓
Sistema verifica: ¿Recurso pertenece a grupo personal?
    ├─ SÍ → Mostrar opciones de vista
    └─ NO → Error: "Este recurso es laboral. Accede desde la sección laboral."
```

### Escenario 3: Crear Recurso
```
Usuario en sección Laboral/Personal
    ↓
Elige tipo: Equipo / Área / etc.
    ↓
Sistema valida: ¿Grupo seleccionado coincide con contexto?
    ├─ SÍ → Permitir creación
    └─ NO → Error: "No puedes crear recursos laborales en grupo personal"
```

---

## 🔧 Cambios en Backend

### 1. Endpoints de Recursos
```javascript
// GET /api/resources
// Filtrar por tipo de grupo
router.get('/', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { resourceType, groupType } = req.query; // Nuevo: groupType
    
    let query = `
        SELECT r.* 
        FROM resources r
        JOIN groups g ON r.group_id = g.id
        JOIN group_members gm ON g.id = gm.group_id
        WHERE gm.user_id = $1
    `;
    
    const params = [userId];
    let paramCount = 2;
    
    // Filtro por tipo de grupo (contexto)
    if (groupType) {
        query += ` AND g.type = $${paramCount}`;
        params.push(groupType);
        paramCount++;
    }
    
    // ... resto de filtros
});
```

### 2. Validación al Crear Recurso
```javascript
// POST /api/resources
router.post('/', authenticateToken, async (req, res) => {
    const { groupId } = req.body;
    
    // Verificar que el usuario es miembro del grupo
    const memberCheck = await pool.query(
        'SELECT g.type FROM groups g JOIN group_members gm ON g.id = gm.group_id WHERE g.id = $1 AND gm.user_id = $2',
        [groupId, userId]
    );
    
    if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: 'No eres miembro de este grupo' });
    }
    
    // El tipo del grupo determina el contexto
    // No necesitamos validar más, el grupo ya define el contexto
});
```

### 3. Validación al Obtener Recurso por QR (desde app)
```javascript
// GET /api/resources/qr/:qrCode
router.get('/qr/:qrCode', authenticateToken, async (req, res) => {
    const { qrCode } = req.params;
    const userId = req.user.userId;
    
    // Obtener recurso
    const resourceResult = await pool.query(
        `SELECT r.*, g.type as group_type 
         FROM resources r
         JOIN groups g ON r.group_id = g.id
         WHERE r.qr_code = $1`,
        [qrCode]
    );
    
    if (resourceResult.rows.length === 0) {
        return res.status(404).json({ error: 'Recurso no encontrado' });
    }
    
    const resource = resourceResult.rows[0];
    
    // Verificar que el usuario es miembro del grupo
    const memberCheck = await pool.query(
        'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
        [resource.group_id, userId]
    );
    
    if (memberCheck.rows.length === 0) {
        return res.status(403).json({ 
            error: 'No tienes acceso a este recurso',
            groupType: resource.group_type // Para mostrar mensaje específico
        });
    }
    
    res.json({ success: true, resource, groupType: resource.group_type });
});
```

---

## 🎨 UI: Indicadores de Contexto

### Badge de Contexto
```javascript
// Mostrar badge en recursos
{resource.groupType === 'work' && (
    <span className="badge badge-blue">Laboral</span>
)}
{resource.groupType === 'personal' && (
    <span className="badge badge-green">Personal</span>
)}
```

### Mensaje de Error Contextual
```javascript
const ContextError = ({ scannedGroupType, currentContext }) => {
    const isPersonal = scannedGroupType === 'personal';
    const isLaboral = scannedGroupType === 'work';
    
    return (
        <div className="error-modal">
            <AlertCircle />
            <h3>Recurso no disponible en este contexto</h3>
            <p>
                {isPersonal && 'Este recurso pertenece a tu área personal.'}
                {isLaboral && 'Este recurso pertenece a tu área laboral.'}
            </p>
            <button onClick={() => switchToContext(scannedGroupType)}>
                Ir a {isPersonal ? 'Personal' : 'Laboral'}
            </button>
        </div>
    );
};
```

---

## 📋 Checklist de Implementación

### Backend:
- [ ] Agregar filtro `groupType` en GET `/api/resources`
- [ ] Validar tipo de grupo al crear recurso
- [ ] Endpoint `/api/resources/qr/:qrCode` con validación de contexto
- [ ] Retornar `groupType` en respuestas de recursos

### Frontend:
- [ ] Detectar contexto actual desde grupo seleccionado
- [ ] Filtrar recursos por contexto
- [ ] Validar contexto al escanear QR
- [ ] Mostrar mensaje de error contextual
- [ ] Agregar indicadores visuales de contexto
- [ ] Prevenir crear recursos en grupo incorrecto

### Testing:
- [ ] Crear recurso laboral desde contexto personal (debe fallar)
- [ ] Escanear QR personal desde contexto laboral (debe mostrar error)
- [ ] Verificar que recursos se filtran correctamente

---

## 🚀 Orden de Implementación

1. **Backend**: Validaciones y filtros por contexto
2. **Frontend**: Detección de contexto y filtrado
3. **Escáner**: Validación de contexto al escanear
4. **UI**: Mensajes de error y indicadores visuales

¿Empezamos con las validaciones del backend?

