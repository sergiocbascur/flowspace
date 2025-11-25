# ⚡ Prueba Rápida - 2 Minutos

## Paso 1: Crear Recurso y Lista desde Consola

Abre la aplicación, inicia sesión, y en la consola del navegador (F12) pega esto:

```javascript
(async () => {
    const API = 'http://localhost:3000/api'; // Cambia si es producción
    const token = localStorage.getItem('flowspace_token');
    
    // 1. Crear habitación
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
    
    console.log('✅ Recurso creado:', casa.resource);
    console.log('📱 QR Code:', casa.resource.qr_code);
    
    // 2. Crear lista de compras
    const lista = await fetch(`${API}/shopping-lists/resource/${casa.resource.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json());
    
    console.log('✅ Lista creada:', lista.shoppingList);
    
    // 3. Agregar items
    await fetch(`${API}/shopping-lists/${lista.shoppingList.id}/items`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: 'Leche', quantity: 2 })
    });
    
    await fetch(`${API}/shopping-lists/${lista.shoppingList.id}/items`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: 'Pan', quantity: 1 })
    });
    
    console.log('✅ Items agregados');
    
    // 4. URL para probar
    const url = `http://localhost:5173/resource/${casa.resource.qr_code}/shopping`;
    console.log('🔗 Abre esta URL en ventana incógnito:', url);
    console.log('📱 O genera QR con esta URL:', url);
})();
```

## Paso 2: Probar Vista Pública

1. Copia la URL que aparece en consola
2. Abre una ventana incógnito (sin login)
3. Pega la URL
4. Deberías ver la lista de compras
5. Prueba agregar un item nuevo
6. Prueba marcar items como comprados

## Paso 3: Generar QR Code

1. Ve a https://www.qr-code-generator.com/
2. Pega la URL que apareció en consola
3. Descarga el QR code
4. Escanéalo desde tu móvil

## ✅ Listo!

Ya tienes una lista de compras funcionando con QR code.

