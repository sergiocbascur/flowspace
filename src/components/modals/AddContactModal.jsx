import React, { useState, useEffect } from 'react';
import { Search, UserPlus, X, Check, User, Loader } from 'lucide-react';
import { apiContacts } from '../../apiService';

const AddContactModal = ({ isOpen, onClose, toast, currentUser }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [acceptedContacts, setAcceptedContacts] = useState([]);

    useEffect(() => {
        if (isOpen) {
            loadPendingRequests();
            loadAcceptedContacts();
        }
    }, [isOpen]);

    useEffect(() => {
        if (searchQuery.length >= 2) {
            const timeoutId = setTimeout(() => {
                searchUsers();
            }, 300);
            return () => clearTimeout(timeoutId);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    const searchUsers = async () => {
        setLoading(true);
        try {
            const result = await apiContacts.searchUsers(searchQuery);
            if (result.success) {
                // Filtrar usuarios que ya son contactos o tienen solicitud pendiente
                const filtered = result.users.filter(user => {
                    const isContact = acceptedContacts.some(c => c.userId === user.userId);
                    const hasPending = pendingRequests.some(r => r.userId === user.userId);
                    return !isContact && !hasPending;
                });
                setSearchResults(filtered);
            }
        } catch (error) {
            console.error('Error buscando usuarios:', error);
            toast?.error('Error al buscar usuarios');
        } finally {
            setLoading(false);
        }
    };

    const loadPendingRequests = async () => {
        try {
            const result = await apiContacts.getPendingRequests();
            if (result.success) {
                setPendingRequests(result.requests || []);
            }
        } catch (error) {
            console.error('Error cargando solicitudes pendientes:', error);
        }
    };

    const loadAcceptedContacts = async () => {
        try {
            const result = await apiContacts.getAcceptedContacts();
            if (result.success) {
                setAcceptedContacts(result.contacts || []);
            }
        } catch (error) {
            console.error('Error cargando contactos:', error);
        }
    };

    const handleSendRequest = async (userId) => {
        try {
            const result = await apiContacts.sendRequest(userId);
            if (result.success) {
                toast?.success('Solicitud enviada');
                await loadPendingRequests();
                // Remover de resultados de búsqueda
                setSearchResults(prev => prev.filter(u => u.userId !== userId));
            } else {
                toast?.error(result.error || 'Error al enviar solicitud');
            }
        } catch (error) {
            console.error('Error enviando solicitud:', error);
            toast?.error('Error al enviar solicitud');
        }
    };

    const handleAcceptRequest = async (userId) => {
        try {
            const result = await apiContacts.acceptRequest(userId);
            if (result.success) {
                toast?.success('Solicitud aceptada');
                await loadPendingRequests();
                await loadAcceptedContacts();
            } else {
                toast?.error(result.error || 'Error al aceptar solicitud');
            }
        } catch (error) {
            console.error('Error aceptando solicitud:', error);
            toast?.error('Error al aceptar solicitud');
        }
    };

    const handleRejectRequest = async (userId) => {
        try {
            const result = await apiContacts.rejectContact(userId);
            if (result.success) {
                toast?.success('Solicitud rechazada');
                await loadPendingRequests();
            } else {
                toast?.error(result.error || 'Error al rechazar solicitud');
            }
        } catch (error) {
            console.error('Error rechazando solicitud:', error);
            toast?.error('Error al rechazar solicitud');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-between border-b border-white/20">
                    <div className="flex items-center gap-3">
                        <UserPlus size={24} />
                        <h2 className="text-xl font-bold">Agregar Contactos</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X size={20} className="text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {/* Buscador */}
                    <div className="mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar por nombre o usuario..."
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                            />
                            {loading && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <Loader className="animate-spin text-blue-600" size={18} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Solicitudes Pendientes */}
                    {pendingRequests.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
                                Solicitudes Pendientes
                            </h3>
                            <div className="space-y-2">
                                {pendingRequests.map((request) => (
                                    <div
                                        key={request.userId}
                                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border-2 border-white shadow-sm">
                                            <span style={{ fontSize: '1.25rem', lineHeight: '1', fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>
                                                {request.avatar || '👤'}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-slate-900 truncate">
                                                {request.name || request.username}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {request.requestedBy === currentUser?.id ? 'Solicitud enviada' : 'Te envió una solicitud'}
                                            </div>
                                        </div>
                                        {request.requestedBy !== currentUser?.id && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleAcceptRequest(request.userId)}
                                                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                                    title="Aceptar"
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleRejectRequest(request.userId)}
                                                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                                    title="Rechazar"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Resultados de Búsqueda */}
                    {searchQuery.length >= 2 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
                                Resultados
                            </h3>
                            {searchResults.length === 0 && !loading ? (
                                <div className="text-center py-8 text-slate-400">
                                    <User size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No se encontraron usuarios</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {searchResults.map((user) => (
                                        <div
                                            key={user.userId}
                                            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border-2 border-white shadow-sm">
                                                <span style={{ fontSize: '1.25rem', lineHeight: '1', fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>
                                                    {user.avatar || '👤'}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-slate-900 truncate">
                                                    {user.name || user.username}
                                                </div>
                                                <div className="text-xs text-slate-500 space-y-0.5">
                                                    {user.username && (
                                                        <div className="flex items-center gap-1">
                                                            <span className="font-medium text-blue-600">@{user.username}</span>
                                                        </div>
                                                    )}
                                                    {user.email && (
                                                        <div className="flex items-center gap-1 text-slate-400">
                                                            <span className="font-mono text-[11px]">{user.email}</span>
                                                        </div>
                                                    )}
                                                    {user.name && user.username && user.name.toLowerCase() !== user.username.toLowerCase() && (
                                                        <div className="text-[10px] text-slate-400">
                                                            Nombre: {user.name}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleSendRequest(user.userId)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                                            >
                                                <UserPlus size={14} />
                                                Agregar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Contactos Actuales */}
                    {acceptedContacts.length > 0 && searchQuery.length < 2 && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
                                Mis Contactos ({acceptedContacts.length})
                            </h3>
                            <div className="space-y-2">
                                {acceptedContacts.map((contact) => (
                                    <div
                                        key={contact.userId}
                                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border-2 border-white shadow-sm">
                                            <span style={{ fontSize: '1.25rem', lineHeight: '1', fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>
                                                {contact.avatar || '👤'}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-slate-900 truncate">
                                                {contact.name || contact.username}
                                            </div>
                                            {contact.username && contact.name && (
                                                <div className="text-xs text-slate-500">
                                                    @{contact.username}
                                                </div>
                                            )}
                                        </div>
                                        <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                            Contacto
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddContactModal;

