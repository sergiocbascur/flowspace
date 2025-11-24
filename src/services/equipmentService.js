import { API_BASE_URL, apiRequest } from '../apiService';

export const apiEquipment = {
    // Obtener equipo por código QR
    getByQR: async (qrCode) => {
        return apiRequest(`${API_BASE_URL}/equipment/${qrCode}`, {
            method: 'GET'
        });
    },

    // Crear nuevo equipo
    create: async (equipmentData) => {
        return apiRequest(`${API_BASE_URL}/equipment`, {
            method: 'POST',
            body: JSON.stringify(equipmentData)
        });
    },

    // Actualizar equipo
    update: async (qrCode, updates) => {
        return apiRequest(`${API_BASE_URL}/equipment/${qrCode}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    },

    // Obtener logs de un equipo
    getLogs: async (qrCode) => {
        return apiRequest(`${API_BASE_URL}/equipment/${qrCode}/logs`, {
            method: 'GET'
        });
    },

    // Agregar log a un equipo
    addLog: async (qrCode, content) => {
        return apiRequest(`${API_BASE_URL}/equipment/${qrCode}/logs`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
    }
};
