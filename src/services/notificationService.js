import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Guarda el token FCM del usuario en el backend
 * @param {string} token - Token FCM del dispositivo
 * @returns {Promise<boolean>} true si se guardó correctamente
 */
export const saveFCMToken = async (token) => {
    try {
        const response = await axios.post(`${API_URL}/api/notifications/fcm-token`, {
            token,
            platform: 'web',
            userAgent: navigator.userAgent
        }, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('flowspace_token')}`
            }
        });

        console.log('✅ Token FCM guardado en el backend');
        return response.data.success;
    } catch (error) {
        console.error('❌ Error guardando token FCM:', error);
        return false;
    }
};

/**
 * Elimina el token FCM del usuario del backend (al cerrar sesión)
 * @param {string} token - Token FCM a eliminar
 * @returns {Promise<boolean>} true si se eliminó correctamente
 */
export const removeFCMToken = async (token) => {
    try {
        await axios.delete(`${API_URL}/api/notifications/fcm-token`, {
            data: { token },
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('flowspace_token')}`
            }
        });

        console.log('✅ Token FCM eliminado del backend');
        return true;
    } catch (error) {
        console.error('❌ Error eliminando token FCM:', error);
        return false;
    }
};

/**
 * Obtiene las preferencias de notificaciones del usuario
 * @returns {Promise<Object>} Preferencias de notificaciones
 */
export const getNotificationPreferences = async () => {
    try {
        const response = await axios.get(`${API_URL}/api/notifications/preferences`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('flowspace_token')}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error obteniendo preferencias:', error);
        return {
            mentions: true,
            validations: true,
            overdue: true,
            assignments: true
        };
    }
};

/**
 * Actualiza las preferencias de notificaciones del usuario
 * @param {Object} preferences - Nuevas preferencias
 * @returns {Promise<boolean>} true si se actualizó correctamente
 */
export const updateNotificationPreferences = async (preferences) => {
    try {
        await axios.put(`${API_URL}/api/notifications/preferences`, preferences, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('flowspace_token')}`
            }
        });

        console.log('✅ Preferencias de notificaciones actualizadas');
        return true;
    } catch (error) {
        console.error('Error actualizando preferencias:', error);
        return false;
    }
};
