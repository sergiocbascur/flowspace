// Servicio API para conectar con el backend
// Reemplaza localStorage con llamadas HTTP

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Helper para hacer requests
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('flowspace_token');

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
        },
        ...options
    };

    if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        // Intentar parsear JSON, pero manejar errores de parseo
        let data;
        try {
            const text = await response.text();
            data = text ? JSON.parse(text) : {};
        } catch (parseError) {
            // Si no se puede parsear JSON, crear un objeto de error
            data = { error: response.statusText || 'Error en la respuesta' };
        }

        if (!response.ok) {
            // Retornar el error en lugar de lanzarlo, para que pueda ser manejado consistentemente
            // Para 404, esto es esperado cuando un recurso no existe
            return {
                success: false,
                error: data.error || `Error ${response.status}: ${response.statusText}`,
                status: response.status
            };
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        // Si hay un error de red u otro error, retornar un objeto de error
        return {
            success: false,
            error: error.message || 'Error de conexi├│n. Intenta nuevamente.'
        };
    }
}

// ============ AUTENTICACI├ôN ============

export const apiAuth = {
    async sendVerificationCode(email, username) {
        return apiRequest('/auth/send-verification-code', {
            method: 'POST',
            body: { email, username }
        });
    },

    async verifyCode(email, code) {
        return apiRequest('/auth/verify-code', {
            method: 'POST',
            body: { email, code }
        });
    },

    async register(username, email, password, avatar = '­ƒæñ') {
        const result = await apiRequest('/auth/register', {
            method: 'POST',
            body: { username, email, password, avatar }
        });

        if (result.success && result.token) {
            localStorage.setItem('flowspace_token', result.token);
        }

        return result;
    },

    async login(username, password) {
        const result = await apiRequest('/auth/login', {
            method: 'POST',
            body: { username, password }
        });

        if (result.success && result.token) {
            localStorage.setItem('flowspace_token', result.token);
        }

        return result;
    },

    async getCurrentUser() {
        return apiRequest('/auth/me');
    },

    logout() {
        localStorage.removeItem('flowspace_token');
    },

    getToken() {
        return localStorage.getItem('flowspace_token');
    },

    async deleteAccount() {
        const result = await apiRequest('/auth/account', {
            method: 'DELETE'
        });
        // Limpiar token despu├®s de eliminar cuenta
        localStorage.removeItem('flowspace_token');
        return result;
    },

    async requestPasswordReset(email) {
        return apiRequest('/auth/forgot-password', {
            method: 'POST',
            body: { email }
        });
    },

    async resetPassword(token, newPassword) {
        return apiRequest('/auth/reset-password', {
            method: 'POST',
            body: { token, newPassword }
        });
    },

    async updateProfile(avatar) {
        const result = await apiRequest('/auth/profile', {
            method: 'PATCH',
            body: { avatar }
        });

        if (result.success && result.user) {
            return result;
        }

        return {
            success: false,
            error: result.error || 'Error al actualizar perfil'
        };
    },

    async getAllUsers() {
        const result = await apiRequest('/auth/users');
        if (result.success && result.users) {
            return result.users;
        }
        return [];
    },

    async changeName(name) {
        return apiRequest('/auth/change-name', {
            method: 'PATCH',
            body: { name }
        });
    }
};

// ============ GRUPOS ============

export const apiGroups = {
    async getAll() {
        const result = await apiRequest('/groups');
        return result.groups || [];
    },

    async create(name, type) {
        const result = await apiRequest('/groups', {
            method: 'POST',
            body: { name, type }
        });

        if (!result.success) {
            throw new Error(result.error || 'Error al crear el grupo');
        }

        return result.group;
    },

    async join(code) {
        const result = await apiRequest('/groups/join', {
            method: 'POST',
            body: { code }
        });

        if (!result.success) {
            throw new Error(result.error || 'Error al unirse al grupo');
        }

        return result.group;
    },

    async leave(groupId) {
        return apiRequest(`/groups/${groupId}/leave`, {
            method: 'POST'
        });
    },

    async delete(groupId) {
        return apiRequest(`/groups/${groupId}`, {
            method: 'DELETE'
        });
    },

    async updateScores(groupId, userId, points) {
        return apiRequest(`/groups/${groupId}/scores`, {
            method: 'PATCH',
            body: { userId, points }
        });
    }
};

// ============ TAREAS ============

export const apiTasks = {
    async getByGroup(groupId) {
        const result = await apiRequest(`/tasks/group/${groupId}`);
        return result.tasks || [];
    },

    async create(taskData) {
        const result = await apiRequest('/tasks', {
            method: 'POST',
            body: taskData
        });
        return result.task;
    },

    async update(taskId, updates) {
        const result = await apiRequest(`/tasks/${taskId}`, {
            method: 'PATCH',
            body: updates
        });
        return result.task;
    },

    async delete(taskId) {
        return apiRequest(`/tasks/${taskId}`, {
            method: 'DELETE'
        });
    }
};

// ============ WEBSOCKET ============

export function createWebSocketConnection(onMessage) {
    const token = apiAuth.getToken();
    if (!token) {
        console.error('No hay token para WebSocket');
        return null;
    }

    const wsUrl = (import.meta.env.VITE_WS_URL || 'ws://localhost:3000') + `?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('Ô£à WebSocket conectado');
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (onMessage) onMessage(data);
        } catch (error) {
            console.error('Error parseando mensaje WebSocket:', error);
        }
    };

    ws.onerror = (error) => {
        console.error('Error en WebSocket:', error);
    };

    ws.onclose = () => {
        console.log('ÔØî WebSocket desconectado');
        // Reconectar despu├®s de 3 segundos
        setTimeout(() => {
            if (apiAuth.getToken()) {
                createWebSocketConnection(onMessage);
            }
        }, 3000);
    };

    return ws;
}

// ============ EQUIPOS ============

export const apiEquipment = {
    async getByQR(qrCode) {
        return apiRequest(`/equipment/${qrCode}`);
    },

    async create(equipmentData) {
        return apiRequest('/equipment', {
            method: 'POST',
            body: equipmentData
        });
    },

    async update(qrCode, updates) {
        return apiRequest(`/equipment/${qrCode}`, {
            method: 'PATCH',
            body: updates
        });
    },

    async getLogs(qrCode) {
        const result = await apiRequest(`/equipment/${qrCode}/logs`);
        return result || [];
    },

    async addLog(qrCode, content) {
        return apiRequest(`/equipment/${qrCode}/logs`, {
            method: 'POST',
            body: { content }
        });
    },

    async generateTempCode(qrCode) {
        return apiRequest(`/equipment/${qrCode}/temp-code`, {
            method: 'POST'
        });
    },

    async verifyTempCode(qrCode, code) {
        return apiRequest('/equipment/public/verify-temp-code', {
            method: 'POST',
            body: { qrCode, code }
        });
    }
};

// ============ RECURSOS GEN├ëRICOS ============

export const apiResources = {
    async create(data) {
        return apiRequest('/resources', {
            method: 'POST',
            body: data
        });
    },

    async getAll(filters = {}) {
        const params = new URLSearchParams();
        if (filters.resourceType) params.append('resourceType', filters.resourceType);
        if (filters.groupId) params.append('groupId', filters.groupId);
        
        const query = params.toString() ? `?${params.toString()}` : '';
        return apiRequest(`/resources${query}`);
    },

    async getById(id) {
        return apiRequest(`/resources/${id}`);
    },

    async getByQR(qrCode, context) {
        const query = context ? `?context=${context}` : '';
        return apiRequest(`/resources/qr/${qrCode}${query}`);
    },

    async update(id, data) {
        return apiRequest(`/resources/${id}`, {
            method: 'PATCH',
            body: data
        });
    },

    async delete(id) {
        return apiRequest(`/resources/${id}`, {
            method: 'DELETE'
        });
    }
};

// ============ LISTAS DE COMPRAS ============

export const apiShoppingLists = {
    async getByResource(resourceId) {
        return apiRequest(`/shopping-lists/resource/${resourceId}`);
    },

    async update(listId, data) {
        return apiRequest(`/shopping-lists/${listId}`, {
            method: 'PATCH',
            body: data
        });
    },

    async addItem(listId, item) {
        return apiRequest(`/shopping-lists/${listId}/items`, {
            method: 'POST',
            body: item
        });
    },

    async updateItem(listId, itemId, data) {
        return apiRequest(`/shopping-lists/${listId}/items/${itemId}`, {
            method: 'PATCH',
            body: data
        });
    },

    async deleteItem(listId, itemId) {
        return apiRequest(`/shopping-lists/${listId}/items/${itemId}`, {
            method: 'DELETE'
        });
    }
};

// ============ DOCUMENTOS ============

export const apiDocuments = {
    async upload(file, data) {
        const formData = new FormData();
        formData.append('file', file);
        if (data.name) formData.append('name', data.name);
        if (data.description) formData.append('description', data.description);
        if (data.linkedToType) formData.append('linkedToType', data.linkedToType);
        if (data.linkedToId) formData.append('linkedToId', data.linkedToId);

        const token = localStorage.getItem('flowspace_token');
        const response = await fetch(`${API_BASE_URL}/documents`, {
            method: 'POST',
            headers: {
                ...(token && { Authorization: `Bearer ${token}` })
            },
            body: formData
        });

        const result = await response.json();
        if (!response.ok) {
            return {
                success: false,
                error: result.error || `Error ${response.status}`
            };
        }
        return result;
    },

    async getAll(filters = {}) {
        const params = new URLSearchParams();
        if (filters.linkedToType) params.append('linkedToType', filters.linkedToType);
        if (filters.linkedToId) params.append('linkedToId', filters.linkedToId);
        
        const query = params.toString() ? `?${params.toString()}` : '';
        return apiRequest(`/documents${query}`);
    },

    async getById(id) {
        return apiRequest(`/documents/${id}`);
    },

    getDownloadUrl(id) {
        const baseUrl = API_BASE_URL.replace('/api', '');
        return `${baseUrl}/api/documents/${id}/download`;
    },

    async delete(id) {
        return apiRequest(`/documents/${id}`, {
            method: 'DELETE'
        });
    }
};

// ============ CHECKLISTS ============

export const apiChecklists = {
    async getByResource(resourceId, type) {
        return apiRequest(`/checklists/resource/${resourceId}/${type}`);
    },

    async addItem(checklistId, item) {
        return apiRequest(`/checklists/${checklistId}/items`, {
            method: 'POST',
            body: item
        });
    },

    async updateItem(checklistId, itemId, data) {
        return apiRequest(`/checklists/${checklistId}/items/${itemId}`, {
            method: 'PATCH',
            body: data
        });
    },

    async deleteItem(checklistId, itemId) {
        return apiRequest(`/checklists/${checklistId}/items/${itemId}`, {
            method: 'DELETE'
        });
    }
};
