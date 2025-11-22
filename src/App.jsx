import React, { useState, useEffect } from 'react';
import FlowSpace from './LabSync';
import Login from './Login';
import { apiAuth } from './apiService';
import { getAllUsers } from './authService';

function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Verificar si hay una sesión activa al cargar la app
    useEffect(() => {
        const checkSession = async () => {
            const token = apiAuth.getToken();
            if (token) {
                try {
                    const result = await apiAuth.getCurrentUser();
                    if (result.success && result.user) {
                        setCurrentUser(result.user);
                    }
                } catch (error) {
                    console.error('Error verificando sesión:', error);
                    // Si el token es inválido, limpiarlo
                    apiAuth.logout();
                }
            }
            // Cargar todos los usuarios para mostrar en la app
            setAllUsers(getAllUsers());
            setLoading(false);
        };

        checkSession();
    }, []);

    const handleLogin = (user) => {
        setCurrentUser(user);
        // Actualizar lista de usuarios
        setAllUsers(getAllUsers());
    };

    const handleLogout = () => {
        apiAuth.logout();
        setCurrentUser(null);
    };

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
        <FlowSpace currentUser={currentUser} onLogout={handleLogout} allUsers={allUsers} />
    );
}

export default App;
