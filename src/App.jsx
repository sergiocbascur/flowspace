import React, { useState, useEffect } from 'react';
import FlowSpace from './LabSync';
import Login from './Login';
import { apiAuth } from './apiService';
import ToastContainer from './components/ToastContainer';
import { useToast } from './hooks/useToast';
import EquipmentPublicView from './components/EquipmentPublicView';
import ResourceShoppingView from './components/ResourceShoppingView';
import logger from './utils/logger';

function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [publicQrCode, setPublicQrCode] = useState(null);
    const [publicViewType, setPublicViewType] = useState(null); // 'equipment', 'shopping'
    const toast = useToast();

    // Detectar si estamos en una ruta pública
    useEffect(() => {
        const path = window.location.pathname;
        
        // /equipment/:qrCode (vista antigua, mantener compatibilidad)
        const equipmentMatch = path.match(/^\/equipment\/([A-Z0-9-]+)$/i);
        if (equipmentMatch) {
            setPublicQrCode(equipmentMatch[1]);
            setPublicViewType('equipment');
            return;
        }

        // /resource/:qrCode/shopping
        const shoppingMatch = path.match(/^\/resource\/([A-Z0-9-]+)\/shopping$/i);
        if (shoppingMatch) {
            setPublicQrCode(shoppingMatch[1]);
            setPublicViewType('shopping');
            return;
        }

        // /resource/:qrCode (vista genérica)
        const resourceMatch = path.match(/^\/resource\/([A-Z0-9-]+)$/i);
        if (resourceMatch) {
            setPublicQrCode(resourceMatch[1]);
            setPublicViewType('equipment'); // Por ahora, usar vista de equipo como default
            return;
        }
    }, []);

    // Verificar si hay una sesión activa al cargar la app
    useEffect(() => {
        const checkSession = async () => {
            const token = apiAuth.getToken();
            if (token) {
                try {
                    const result = await apiAuth.getCurrentUser();
                    if (result.success && result.user) {
                        setCurrentUser(result.user);
                        // Cargar todos los usuarios después de autenticarse
                        const users = await apiAuth.getAllUsers();
                        setAllUsers(users);
                    }
                } catch (error) {
                    logger.error('Error verificando sesión:', error);
                    // Si el token es inválido, limpiarlo
                    apiAuth.logout();
                }
            }
            setLoading(false);
        };

        checkSession();
    }, []);

    const handleLogin = async (user) => {
        setCurrentUser(user);
        // Actualizar lista de usuarios
        try {
            const users = await apiAuth.getAllUsers();
            setAllUsers(users);
        } catch (error) {
            logger.error('Error cargando usuarios:', error);
        }
    };

    const handleLogout = () => {
        apiAuth.logout();
        setCurrentUser(null);
    };

    const handleUserUpdate = (updatedUser) => {
        setCurrentUser(updatedUser);
    };

    // Si estamos en una ruta pública, mostrar vista correspondiente
    if (publicQrCode) {
        if (publicViewType === 'shopping') {
            return (
                <ResourceShoppingView 
                    qrCode={publicQrCode} 
                    onClose={() => {
                        setPublicQrCode(null);
                        setPublicViewType(null);
                        window.history.pushState({}, '', '/');
                    }} 
                />
            );
        }
        
        // Default: vista de equipo (mantiene compatibilidad)
        return (
            <EquipmentPublicView 
                qrCode={publicQrCode} 
                onClose={() => {
                    setPublicQrCode(null);
                    setPublicViewType(null);
                    window.history.pushState({}, '', '/');
                }} 
            />
        );
    }

    // Mostrar loading mientras se verifica la sesión
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return <Login onLogin={handleLogin} />;
    }

    return (
        <>
            <FlowSpace 
                currentUser={currentUser} 
                onLogout={handleLogout} 
                allUsers={allUsers} 
                onUserUpdate={handleUserUpdate}
                toast={toast}
            />
            <ToastContainer 
                notifications={toast.notifications} 
                onClose={toast.removeToast} 
            />
        </>
    );
}

export default App;
