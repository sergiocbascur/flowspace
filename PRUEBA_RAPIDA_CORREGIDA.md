# ⚡ Prueba Rápida - Corregida

## Primero: Verifica la URL de la API

El código necesita saber dónde está tu backend. Hay dos opciones:

### Opción 1: Si estás en desarrollo local
**Necesitas tener el backend corriendo:**
```bash
cd backend
npm run dev
# o
npm start
```

### Opción 2: Si estás usando producción
**Usa la URL correcta:**

```javascript
(async () => {
    // Detecta automáticamente la URL
    const getApiUrl = () => {
        // Si tienes variable de entorno
        if (import.meta?.env?.VITE_API_URL) {
            return import.meta.env.VITE_API_URL.endsWith('/api') 
                ? import.meta.env.VITE_API_URL 
                : `${import.meta.env.VITE_API_URL}/api`;
        }
        // Producción (según tu código)
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            return 'https://api.flowspace.farmavet-bodega.cl/api';
        }
        // Desarrollo local
        return 'http://localhost:3000/api';
    };

    const API = getApiUrl();
    console.log('🔗 Usando API:', API);
    
    const token = localStorage.getItem('flowspace_token');
    
    if (!token) {
        console.error('❌ No hay token. Por favor, inicia sesión primero.');
        return;
    }
    
    // Crear habitación
    const casa = await fetch(`${API}/resources`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            name: 'Cocina',
            resourceType: 'room',
            description: 'Cocina de prueba'
        })
    }).then(r => r.json());
    
    if (!casa.success) {
        console.error('❌ Error creando recurso:', casa.error);
        return;
    }
    
    console.log('✅ Recurso creado:', casa.resource);
    console.log('📱 QR Code:', casa.resource.qr_code);
    
    // Crear lista
    const lista = await fetch(`${API}/shopping-lists/resource/${casa.resource.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json());
    
    if (!lista.success) {
        console.error('❌ Error creando lista:', lista.error);
        return;
    }
    
    console.log('✅ Lista creada:', lista.shoppingList);
    
    // Agregar items
    const item1 = await fetch(`${API}/shopping-lists/${lista.shoppingList.id}/items`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: 'Leche', quantity: 2 })
    }).then(r => r.json());
    
    if (item1.success) {
        console.log('✅ Item agregado:', 'Leche');
    }
    
    const item2 = await fetch(`${API}/shopping-lists/${lista.shoppingList.id}/items`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: 'Pan', quantity: 1 })
    }).then(r => r.json());
    
    if (item2.success) {
        console.log('✅ Item agregado:', 'Pan');
    }
    
    // URL para probar
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/resource/${casa.resource.qr_code}/shopping`;
    console.log('🔗 Abre esta URL en ventana incógnito:', url);
    console.log('📱 O genera QR con esta URL:', url);
})();
```

---

## Versión Simplificada (Solo Producción)

Si estás en producción, usa esto:

```javascript
(async () => {
    const API = 'https://api.flowspace.farmavet-bodega.cl/api';
    const token = localStorage.getItem('flowspace_token');
    
    if (!token) {
        alert('Por favor, inicia sesión primero');
        return;
    }
    
    try {
        // Crear habitación
        const casa = await fetch(`${API}/resources`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'Cocina',
                resourceType: 'room',
                description: 'Cocina de prueba'
            })
        }).then(r => r.json());
        
        if (!casa.success) throw new Error(casa.error);
        
        console.log('✅ QR Code:', casa.resource.qr_code);
        
        // Crear lista
        const lista = await fetch(`${API}/shopping-lists/resource/${casa.resource.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json());
        
        if (!lista.success) throw new Error(lista.error);
        
        // Agregar items
        await fetch(`${API}/shopping-lists/${lista.shoppingList.id}/items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: 'Leche', quantity: 2 })
        });
        
        const url = `${window.location.origin}/resource/${casa.resource.qr_code}/shopping`;
        console.log('🔗 URL:', url);
        alert(`Lista creada! Abre: ${url}`);
    } catch (error) {
        console.error('❌ Error:', error);
        alert(`Error: ${error.message}`);
    }
})();
```

---

## Solución de Problemas

### Error: "ERR_CONNECTION_REFUSED"
- **Causa**: El backend no está corriendo
- **Solución**: 
  - Si estás en desarrollo: `cd backend && npm run dev`
  - Si estás en producción: Verifica que la URL de producción sea correcta

### Error: "No hay token"
- **Causa**: No has iniciado sesión
- **Solución**: Inicia sesión primero en la aplicación

### Error: "Failed to fetch"
- **Causa**: Problema de CORS o URL incorrecta
- **Solución**: Verifica la URL de la API y que el backend permita CORS desde tu origen

