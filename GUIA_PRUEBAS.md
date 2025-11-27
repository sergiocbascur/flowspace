# Guía de Pruebas - Sistema QR Extendido

## 🚀 Pruebas Rápidas

### 1. Crear un Recurso (Habitación/Casa/Persona)

#### Opción A: Desde el navegador (consola)
Abre la consola del navegador (F12) y ejecuta:

```javascript
// Obtener token
const token = localStorage.getItem('flowspace_token');
const API_URL = 'http://localhost:3000/api'; // o tu URL de producción

// Crear una habitación
fetch(`${API_URL}/resources`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        name: 'Cocina',
        resourceType: 'room',
        description: 'Cocina principal de la casa'
    })
})
.then(r => r.json())
.then(data => {
    console.log('Recurso creado:', data);
    console.log('QR Code:', data.resource.qr_code);
});

// Crear una casa
fetch(`${API_URL}/resources`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        name: 'Casa Principal',
        resourceType: 'house',
        description: 'Residencia principal'
    })
})
.then(r => r.json())
.then(data => {
    console.log('Casa creada:', data);
    console.log('QR Code:', data.resource.qr_code);
});
```

#### Opción B: Desde Postman/Thunder Client
- **URL**: `POST http://localhost:3000/api/resources`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer [TU_TOKEN]`
- **Body**:
```json
{
    "name": "Cocina",
    "resourceType": "room",
    "description": "Cocina principal"
}
```

### 2. Crear Lista de Compras para un Recurso

```javascript
// Primero, obtener el ID del recurso que creaste
const resourceId = 'ROOM-XXXXXX'; // Reemplaza con el ID real

// Obtener o crear lista de compras
fetch(`${API_URL}/shopping-lists/resource/${resourceId}`, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`
    }
})
.then(r => r.json())
.then(data => {
    console.log('Lista de compras:', data);
    
    // Agregar un item
    if (data.shoppingList.id) {
        return fetch(`${API_URL}/shopping-lists/${data.shoppingList.id}/items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'Leche',
                quantity: 2
            })
        }).then(r => r.json());
    }
})
.then(data => console.log('Item agregado:', data));
```

### 3. Generar QR Code

Usa cualquier generador de QR codes online (ej: https://www.qr-code-generator.com/) o desde código:

```javascript
const qrCode = 'ROOM-XXXXXX'; // El QR code del recurso
const baseUrl = 'https://flowspace.farmavet-bodega.cl'; // o localhost:5173 en desarrollo

// QR para lista de compras
const shoppingUrl = `${baseUrl}/resource/${qrCode}/shopping`;
console.log('URL para QR:', shoppingUrl);

// Generar imagen QR (requiere librería qrcode.js o usar servicio online)
```

### 4. Probar Vista Pública de Lista de Compras

1. Crea un recurso (habitación o casa)
2. Crea una lista de compras y agrega algunos items
3. Obtén el QR code del recurso
4. Construye la URL: `http://localhost:5173/resource/[QR_CODE]/shopping`
5. Abre la URL en una ventana incógnito (sin login)
6. Deberías ver la lista de compras y poder agregar/marcar items

### 5. Probar desde Móvil

1. Genera el QR code con la URL completa
2. Escanea desde tu teléfono
3. Debería abrir la vista pública directamente

---

## 📱 Ejemplo Completo Paso a Paso

### Crear Casa con Lista de Compras

```javascript
// 1. Crear casa
const createHouse = async () => {
    const response = await fetch(`${API_URL}/resources`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            name: 'Casa Principal',
            resourceType: 'house',
            description: 'Mi casa'
        })
    });
    const data = await response.json();
    console.log('✅ Casa creada:', data.resource);
    return data.resource;
};

// 2. Crear lista de compras
const createShoppingList = async (resourceId) => {
    const response = await fetch(`${API_URL}/shopping-lists/resource/${resourceId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    const data = await response.json();
    console.log('✅ Lista creada:', data.shoppingList);
    return data.shoppingList;
};

// 3. Agregar items
const addItems = async (listId) => {
    const items = ['Leche', 'Pan', 'Huevos', 'Mantequilla'];
    
    for (const item of items) {
        await fetch(`${API_URL}/shopping-lists/${listId}/items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: item, quantity: 1 })
        });
    }
    console.log('✅ Items agregados');
};

// 4. Ejecutar todo
createHouse().then(house => {
    createShoppingList(house.id).then(list => {
        addItems(list.id).then(() => {
            console.log('🎉 Todo listo!');
            console.log('QR URL:', `http://localhost:5173/resource/${house.qr_code}/shopping`);
        });
    });
});
```

---

## 🔍 Verificar que Todo Funciona

### Backend
```bash
# Verificar que el servidor esté corriendo
curl http://localhost:3000/health

# Verificar recursos (requiere token)
curl -H "Authorization: Bearer [TOKEN]" http://localhost:3000/api/resources
```

### Frontend
- Abre http://localhost:5173
- Abre consola (F12)
- Verifica que no hay errores
- Prueba crear un recurso desde la consola

---

## 🐛 Solución de Problemas

### Error: "Token inválido"
- Verifica que estés logueado
- Recarga la página
- Obtén el token: `localStorage.getItem('flowspace_token')`

### Error: "Recurso no encontrado"
- Verifica que el QR code sea correcto
- Asegúrate de que el recurso exista en la BD

### La lista de compras no se ve
- Verifica que hayas creado la lista primero (endpoint GET crea automáticamente)
- Revisa la consola del navegador para errores

### No puedo agregar items sin login
- Los endpoints de agregar items requieren autenticación
- Para acceso público, necesitaremos implementar código temporal (similar a equipment)

---

## 📝 Notas

- Las listas de compras públicas actualmente requieren que la lista exista primero (creada con login)
- Para acceso 100% público, implementaremos código temporal como en equipment
- Los QR codes deben apuntar a la URL completa de producción o desarrollo





