# Script de Eliminación de Equipos

Este script elimina **TODOS** los equipos antiguos de la tabla `equipment` y sus datos asociados.

## ⚠️ ADVERTENCIA

- **Este script es IRREVERSIBLE**
- Eliminará todos los equipos de TODOS los usuarios
- Eliminará todos los logs asociados (`equipment_logs`)
- Eliminará todos los códigos temporales (`equipment_temp_codes`)
- Esta acción **NO se puede deshacer**

## Requisitos

- Node.js instalado
- Acceso a la base de datos PostgreSQL
- Variables de entorno configuradas (`.env` en `backend/`)

## Cómo usar

1. Asegúrate de estar en el directorio del proyecto:
```bash
cd Genshiken
```

2. Ejecuta el script:
```bash
node scripts/delete-all-equipment.js
```

3. El script te pedirá dos confirmaciones:
   - Primera confirmación: Escribe `ELIMINAR TODO`
   - Segunda confirmación: Escribe `SI, ELIMINAR`

4. El script mostrará:
   - Cuántos equipos se encontraron
   - Cuántos logs se encontraron
   - Progreso de eliminación
   - Resumen final

## Ejemplo de salida

```
⚠️  ADVERTENCIA: Este script eliminará TODOS los equipos de la base de datos.
   - Se eliminarán todos los equipos de la tabla "equipment"
   - Se eliminarán todos los logs asociados de "equipment_logs"
   - Esta acción NO se puede deshacer

¿Estás seguro? Escribe "ELIMINAR TODO" para confirmar: ELIMINAR TODO

Última confirmación. Escribe "SI, ELIMINAR" para proceder: SI, ELIMINAR

🗑️  Eliminando equipos...
   📊 Equipos encontrados: 5
   📊 Logs encontrados: 23
   🗑️  Eliminando logs...
   ✅ 23 logs eliminados
   🗑️  Eliminando códigos temporales...
   ✅ 2 códigos temporales eliminados
   🗑️  Eliminando equipos...
   ✅ 5 equipos eliminados

✅ ¡Eliminación completada exitosamente!
   - 5 equipos eliminados
   - 23 logs eliminados
   - 2 códigos temporales eliminados
```

## Alternativa: Usar endpoint de API

Si prefieres usar el endpoint de API (solo elimina equipos del usuario actual):

```bash
# Primero, obtén un token de autenticación
# Luego, realiza una petición DELETE:
curl -X DELETE http://localhost:3000/api/equipment \
  -H "Authorization: Bearer TU_TOKEN"
```

**Nota:** El endpoint `/api/equipment` solo elimina los equipos del usuario autenticado, no todos los equipos.

## Si algo sale mal

Si necesitas restaurar los datos, deberás:
1. Usar un backup de la base de datos
2. O restaurar desde un punto de restauración previo

**Recomendación:** Haz un backup antes de ejecutar este script:
```bash
pg_dump -h localhost -U flowspace_user -d flowspace > backup_antes_eliminacion.sql
```


