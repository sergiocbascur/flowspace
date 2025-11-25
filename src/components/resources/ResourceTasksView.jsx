import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Circle, Plus, Trash2, ShoppingCart } from 'lucide-react';
import logger from '../../utils/logger';
import CheckableList from '../CheckableList';

const ResourceTasksView = ({ qrCode, onClose, toast }) => {
    const [checklist, setChecklist] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [resource, setResource] = useState(null);

    const getApiUrl = () => {
        if (import.meta.env.VITE_API_URL) {
            return import.meta.env.VITE_API_URL.endsWith('/api')
                ? import.meta.env.VITE_API_URL
                : `${import.meta.env.VITE_API_URL}/api`;
        } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000/api';
        } else {
            return 'https://api.flowspace.farmavet-bodega.cl/api';
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const apiUrl = getApiUrl();

                // Obtener información del recurso primero
                const resourceResponse = await fetch(`${apiUrl}/resources/public/${qrCode}`);
                if (!resourceResponse.ok) {
                    throw new Error('Recurso no encontrado');
                }
                const resourceData = await resourceResponse.json();
                if (!resourceData.success) {
                    throw new Error(resourceData.error || 'Recurso no encontrado');
                }
                setResource(resourceData.resource);

                // Obtener checklist de To-Do
                const checklistResponse = await fetch(`${apiUrl}/checklists/public/${qrCode}/todo`);
                if (!checklistResponse.ok) {
                    throw new Error('Error al cargar la lista de tareas');
                }
                const checklistData = await checklistResponse.json();
                if (checklistData.success) {
                    setChecklist(checklistData.checklist);
                } else {
                    throw new Error(checklistData.error || 'Error al cargar la lista');
                }
            } catch (err) {
                logger.error('Error cargando datos:', err);
                setError(err.message || 'Error al cargar los datos');
            } finally {
                setLoading(false);
            }
        };

        if (qrCode) {
            fetchData();
        }
    }, [qrCode]);

    const handleToggleItem = async (itemId) => {
        if (!checklist?.id) return;
        
        try {
            const item = checklist.items?.find(i => i.id === itemId);
            if (!item) return;

            const apiUrl = getApiUrl();
            const response = await fetch(`${apiUrl}/checklists/${checklist.id}/items/${itemId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ checked: !item.checked })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    setChecklist(result.checklist);
                }
            }
        } catch (error) {
            logger.error('Error actualizando item:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
                <div className="text-center text-white">
                    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg">Cargando tareas...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
                <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Error</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Cerrar
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 text-white p-4 flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <CheckCircle2 size={28} />
                        {resource?.name || 'To-Do'}
                    </h1>
                    <p className="text-white/80 text-sm mt-1">Lista de tareas</p>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
                <CheckableList
                    items={checklist?.items || []}
                    type="todo"
                    onToggleItem={handleToggleItem}
                    disabled={true}
                    showAddButton={false}
                />
            </div>
        </div>
    );
};

export default ResourceTasksView;

