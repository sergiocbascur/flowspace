# 📋 Sistema de Acceso Público a Equipos con Secret

## 🎯 Objetivo Final Implementado

Permitir que cualquier persona pueda ver la información de un equipo escaneando un código QR físico, **sin necesidad de tener la aplicación instalada o estar autenticado**, pero **solo si tiene acceso físico al QR code**.

## 🔐 Seguridad

### ✅ Lo que SÍ funciona:
- Escanear el QR físico → Ver información completa
- Buscar equipo en la app con `PX-001` → Ver y editar (autenticado)

### ❌ Lo que NO funciona:
- Adivinar la URL sin el secret → Error 404
- Compartir el link sin el secret completo → No funciona

## 🏗️ Arquitectura del Sistema

### Componentes:

1. **QR Code Físico:** `PX-001-a3f9d2e1`
   - Primera parte: Código del equipo (`PX-001`)
   - Segunda parte: Secret público (`a3f9d2e1`)

2. **Base de Datos:**
   - Nueva columna: `public_secret VARCHAR(8)`
   - Se genera automáticamente al crear un equipo
   - Es único y aleatorio (8 caracteres hexadecimales)

3. **API Pública:**
   - Endpoint: `GET /api/equipment/public/:qrCode/:secret`
   - Sin autenticación
   - Valida que el código Y el secret coincidan

4. **Página Web Pública:**
   - URL: `https://flowspace.farmavet-bodega.cl/equipment/PX-001-a3f9d2e1`
   - Extrae código y secret de la URL
   - Llama a la API pública
   - Muestra información en modo lectura

## 📱 Flujos de Uso

### Caso 1: Usuario con la App

```
1. Escanea QR: PX-001-a3f9d2e1
2. App detecta que es un código de equipo
3. Extrae solo "PX-001" (ignora el secret)
4. Llama a /api/equipment/PX-001 (autenticado)
5. Abre modal de equipo (puede editar)
```

### Caso 2: Usuario sin la App

```
1. Escanea QR con cámara del teléfono: PX-001-a3f9d2e1
2. Abre navegador en: /equipment/PX-001-a3f9d2e1
3. Página extrae código y secret
4. Llama a /api/equipment/public/PX-001/a3f9d2e1
5. Muestra información (solo lectura)
```

### Caso 3: Intento de Acceso sin Secret

```
1. Alguien intenta: /equipment/PX-001
2. Página extrae código pero no encuentra secret
3. API retorna 404 - Equipo no encontrado
4. Muestra error
```

## 🔧 Implementación Técnica

### Backend

#### 1. Migración de Base de Datos

```sql
-- Archivo: backend/migrations/add_equipment_public_secret.sql
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS public_secret VARCHAR(8);

UPDATE equipment 
SET public_secret = substr(md5(random()::text), 1, 8)
WHERE public_secret IS NULL;

ALTER TABLE equipment ALTER COLUMN public_secret SET NOT NULL;
```

**Ejecutar:**
```bash
psql -d tu_base_de_datos -f backend/migrations/add_equipment_public_secret.sql
```

#### 2. Creación de Equipos

```javascript
// backend/routes/equipment.js
const publicSecret = crypto.randomBytes(4).toString('hex'); // Genera: "a3f9d2e1"

await pool.query(
    `INSERT INTO equipment (..., public_secret)
     VALUES (..., $8)`,
    [..., publicSecret]
);
```

#### 3. Endpoint Público

```javascript
// backend/routes/equipment.js
router.get('/public/:qrCode/:secret', async (req, res) => {
    const { qrCode, secret } = req.params;
    
    const result = await pool.query(
        `SELECT ... FROM equipment e
         WHERE e.qr_code = $1 AND e.public_secret = $2`,
        [qrCode, secret]
    );
    
    if (result.rows.length === 0) {
        return res.status(404).json({ 
            error: 'Equipo no encontrado o código inválido'
        });
    }
    
    // Retornar equipo + logs
});
```

### Frontend

#### 1. Generación de QR Codes

```javascript
// En el modal de equipo (móvil y desktop)
{!currentEquipment.isNew && currentEquipment.public_secret && (
    <img 
        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${
            encodeURIComponent(
                `https://flowspace.farmavet-bodega.cl/equipment/${currentEquipment.qr_code}-${currentEquipment.public_secret}`
            )
        }`}
        alt="QR Code"
    />
)}
```

#### 2. Página Pública

```javascript
// public/equipment.html
const qrData = pathParts[pathParts.length - 1]; // "PX-001-a3f9d2e1"
const lastDashIndex = qrData.lastIndexOf('-');
const qrCode = qrData.substring(0, lastDashIndex); // "PX-001"
const secret = qrData.substring(lastDashIndex + 1); // "a3f9d2e1"

const response = await fetch(`/api/equipment/public/${qrCode}/${secret}`);
```

#### 3. Detección en la App

```javascript
// src/LabSync.jsx - handleEquipmentQRScanned
const urlPattern = /equipment\/([A-Z0-9-]+)/i;
const match = code.match(urlPattern);

let equipmentCode;
if (match) {
    // Es una URL, extraer solo el código (sin secret)
    const fullCode = match[1];
    equipmentCode = fullCode.split('-')[0]; // "PX-001"
} else {
    // Es solo el código
    equipmentCode = code.trim().toUpperCase();
}
```

## 📊 Datos Expuestos Públicamente

### ✅ Visible (Solo Lectura)
- Nombre del equipo
- Código QR
- Estado operativo
- Última mantención
- Próxima revisión
- Bitácora de eventos (últimos 50)
- Usuarios que registraron eventos

### ❌ NO Visible
- ID interno del equipo
- Group ID
- Información de otros equipos
- Capacidad de editar

## 🎨 Cómo Generar QR Codes para Imprimir

### Opción 1: Desde la App

1. Abre el equipo en la app
2. El QR code se muestra automáticamente
3. Haz captura de pantalla
4. Imprime la captura

### Opción 2: Generar Manualmente

```
URL del QR: https://flowspace.farmavet-bodega.cl/equipment/[CODIGO]-[SECRET]

Ejemplo:
https://flowspace.farmavet-bodega.cl/equipment/PX-001-a3f9d2e1
```

Usa cualquier generador de QR codes online con esta URL.

### Opción 3: API de Generación

```
https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=https://flowspace.farmavet-bodega.cl/equipment/PX-001-a3f9d2e1
```

## 🔍 Troubleshooting

### Problema: "Equipo no encontrado"

**Causas posibles:**
1. El secret no coincide
2. El equipo no existe
3. La URL está mal formada

**Solución:**
- Escanea el QR nuevamente
- Verifica que el equipo existe en la base de datos
- Revisa que tenga `public_secret` asignado

### Problema: No se muestra el QR en la app

**Causas posibles:**
1. El equipo es nuevo (aún no se ha guardado)
2. No tiene `public_secret` (equipos antiguos)

**Solución:**
- Guarda el equipo primero
- Ejecuta la migración SQL para equipos existentes

### Problema: El QR redirige pero no carga

**Causas posibles:**
1. El servidor no está corriendo
2. La ruta no está configurada
3. El archivo `equipment.html` no existe

**Solución:**
- Verifica que el servidor esté corriendo
- Revisa `backend/server.js` tiene la ruta configurada
- Confirma que `public/equipment.html` existe

## 📝 Notas Importantes

1. **Secrets son permanentes:** Una vez generado, el secret no cambia
2. **No se puede regenerar:** Si pierdes el secret, no puedes recuperarlo
3. **Cada equipo tiene su propio secret:** Son únicos y aleatorios
4. **El secret NO es sensible:** No da acceso a editar, solo a ver

## 🚀 Próximos Pasos Opcionales

### Mejoras Futuras

1. **Analytics:** Rastrear cuántas veces se escanea cada QR
2. **Expiración:** Opción para que los secrets expiren
3. **Regeneración:** Permitir regenerar el secret si es necesario
4. **Múltiples secrets:** Tener diferentes niveles de acceso
5. **Descarga PDF:** Generar ficha en PDF para imprimir

---

**Implementado por:** Antigravity AI  
**Fecha:** 25 de noviembre de 2025  
**Commit:** `feat: Sistema de acceso publico a equipos con secret`
