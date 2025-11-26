# 📋 Sistema de Identificación de Recursos

## 🎯 Concepto Clave

**Los nombres de recursos pueden repetirse, pero cada recurso tiene un identificador único.**

## 🔍 Escenario: Pedro busca "DX-001"

### ¿Qué verá Pedro?

**Pedro solo verá recursos llamados "DX-001" que están en grupos a los que él pertenece.**

### Ejemplo Práctico:

```
Situación:
- Usuario A crea recurso "DX-001" en Grupo "Laboratorio Principal"
- Usuario B crea recurso "DX-001" en Grupo "Laboratorio Secundario"  
- Pedro pertenece a: "Laboratorio Principal"

Resultado cuando Pedro busca "DX-001":
✅ Verá: El recurso del Usuario A (mismo grupo)
❌ No verá: El recurso del Usuario B (grupo diferente)
```

## 🔐 Seguridad y Privacidad

### Filtrado por Grupos

El sistema filtra automáticamente para que:
- ✅ Solo veas recursos de grupos a los que perteneces
- ✅ No veas recursos de otros usuarios/grupos
- ✅ Mantienes privacidad de tus recursos

### Backend Implementation

```sql
-- El query filtra por membresía en grupos
SELECT r.* 
FROM resources r
INNER JOIN group_members gm ON r.group_id = gm.group_id
WHERE gm.user_id = $1  -- Solo recursos de grupos del usuario
```

## 📊 Estructura de Identificación

Cada recurso tiene **3 niveles de identificación**:

### 1. **Nombre** (`name`)
- ❌ **NO es único**
- ✅ Puede repetirse entre usuarios
- 📝 Lo que ves en la aplicación
- Ejemplo: `"DX-001"`

### 2. **Código QR** (`qr_code`)
- ✅ **Es único globalmente**
- 🔗 Identificador técnico para QR codes
- 🌐 Usado para compartir públicamente
- Ejemplo: `"EQUIP-A1B2C3D4"`

### 3. **ID Interno** (`id`)
- ✅ **Es único globalmente** (UUID)
- 🔐 Identificador técnico en base de datos
- 🔧 Usado internamente por el sistema
- Ejemplo: `"550e8400-e29b-41d4-a716-446655440000"`

## 💡 Ventajas de este Sistema

1. **Flexibilidad**: Cada usuario/grupo puede usar sus propios nombres
2. **Privacidad**: Solo ves recursos de tus grupos
3. **Escalabilidad**: No hay conflictos de nombres
4. **Simplicidad**: Los usuarios usan nombres simples como "DX-001"
5. **Identificación única**: El QR code garantiza unicidad

## 🚀 Uso en la Aplicación

Cuando Pedro busca "DX-001":
- El sistema busca en **sus grupos**
- Encuentra recursos con nombre "DX-001"
- Muestra solo los que puede ver (de sus grupos)
- Si hay múltiples, se muestran todos con contexto del grupo

## 📝 Notas Técnicas

- Los recursos están asociados a `group_id`
- Solo miembros del grupo pueden ver sus recursos
- El `qr_code` es único y se usa para acceso público
- El `name` es solo un label descriptivo


