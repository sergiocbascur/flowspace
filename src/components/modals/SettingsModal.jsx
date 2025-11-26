import React, { useState, useEffect } from 'react';
import { Settings, X, Pencil, Bell, Mail, User, ShieldAlert, ChevronRight, Save, Trash2, AlertTriangle } from 'lucide-react';
import { apiAuth, apiEquipment } from '../../apiService';
import logger from '../../utils/logger';

// Componente helper para renderizar emojis
const EmojiButton = ({ emoji, size = 24, className = '', onClick }) => {
    return (
        <span
            onClick={onClick}
            className={className}
            style={{
                fontSize: `${size}px`,
                lineHeight: '1',
                fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
                cursor: onClick ? 'pointer' : 'default'
            }}
        >
            {emoji}
        </span>
    );
};

const Toggle = ({ checked, onChange }) => (
    <button
        onClick={onChange}
        className={`w-12 h-7 rounded-full p-1 transition-all duration-300 ease-in-out ${checked ? 'bg-green-500 shadow-inner' : 'bg-slate-200'}`}
    >
        <div
            className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
    </button>
);

const SettingsSection = ({ title, icon: Icon, children }) => (
    <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-2 mb-3 px-1">
            {Icon && <Icon size={16} className="text-slate-400" />}
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</h3>
        </div>
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm overflow-hidden">
            {children}
        </div>
    </div>
);

const SettingsRow = ({ label, description, control, isLast }) => (
    <div className={`p-4 flex items-center justify-between ${!isLast ? 'border-b border-slate-100/50' : ''} hover:bg-white/50 transition-colors`}>
        <div className="pr-4">
            <span className="text-sm font-semibold text-slate-900 block">{label}</span>
            {description && <p className="text-xs text-slate-500 mt-0.5 font-medium">{description}</p>}
        </div>
        <div className="flex-shrink-0">
            {control}
        </div>
    </div>
);

const SettingsModal = ({
    isOpen,
    onClose,
    currentUser,
    onUserUpdate,
    userConfig,
    setUserConfig,
    onDeleteAccount,
    isMobile,
    showAvatarSelector,
    setShowAvatarSelector,
    toast
}) => {
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState(currentUser?.name || '');
    const [nameError, setNameError] = useState(null);
    const [isSavingName, setIsSavingName] = useState(false);
    const [showDeleteEquipmentConfirm, setShowDeleteEquipmentConfirm] = useState(false);
    const [isDeletingEquipment, setIsDeletingEquipment] = useState(false);

    useEffect(() => {
        if (currentUser?.name) {
            setNewName(currentUser.name);
        }
    }, [currentUser]);

    if (!isOpen) return null;

    const avatarEmojis = ['👤', '👨', '👩', '🧑', '👨‍💼', '👩‍💼', '👨‍🔬', '👩‍🔬', '👨‍💻', '👩‍💻', '👨‍🎨', '👩‍🎨', '👨‍🏫', '👩‍🏫', '👨‍⚕️', '👩‍⚕️', '👨‍🚀', '👩‍🚀', '👨‍✈️', '👩‍✈️', '👨‍🎓', '👩‍🎓', '👨‍🏭', '👩‍🏭', '🧑‍🌾', '🧑‍🍳', '🧑‍🎤', '🧑‍🎨', '🧑‍🏫', '🧑‍💼', '🧑‍🔬', '🧑‍💻', '🧑‍🎓', '🧑‍🏭', '🧑‍🚀', '🧑‍⚕️', '🤴', '👸', '🦸', '🦸‍♂️', '🦸‍♀️', '🧙', '🧙‍♂️', '🧙‍♀️', '🧚', '🧚‍♂️', '🧚‍♀️', '🧛', '🧛‍♂️', '🧛‍♀️', '🧜', '🧜‍♂️', '🧜‍♀️', '🧝', '🧝‍♂️', '🧝‍♀️', '🧞', '🧞‍♂️', '🧞‍♀️', '🧟', '🧟‍♂️', '🧟‍♀️', '🤵', '🤵‍♂️', '🤵‍♀️', '👰', '👰‍♂️', '👰‍♀️', '🤰', '🤱', '👼', '🎅', '🤶', '🦹', '🦹‍♂️', '🦹‍♀️', '🧑‍🎄', '👮', '👮‍♂️', '👮‍♀️', '🕵️', '🕵️‍♂️', '🕵️‍♀️', '💂', '💂‍♂️', '💂‍♀️', '👷', '👷‍♂️', '👷‍♀️', '👳', '👳‍♂️', '👳‍♀️', '👲', '🧕'];

    const getBaseEmoji = (e) => {
        return e.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '');
    };

    const handleSaveSettings = async () => {
        try {
            onClose();
        } catch (error) {
            console.error('Error guardando configuración:', error);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
                animation: 'fadeIn 0.3s ease-out'
            }}
        >
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>

            <div
                className="w-full max-w-2xl bg-[#F2F2F7]/90 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                style={{
                    animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.2) inset'
                }}
            >
                {/* Header */}
                <div className="px-6 py-4 bg-white/50 backdrop-blur-md border-b border-slate-200/50 flex justify-between items-center z-10 sticky top-0">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Configuración
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-200/50 hover:bg-slate-300/50 flex items-center justify-center text-slate-500 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

                    {/* Profile Section */}
                    <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="relative group mb-4">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                                <span style={{ fontSize: '4rem', lineHeight: '1', fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>
                                    {currentUser?.avatar || '👤'}
                                </span>
                            </div>
                            <button
                                onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                                className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-all hover:scale-110 border-2 border-white"
                            >
                                <Pencil size={14} className="text-white" />
                            </button>
                        </div>
                        <div className="flex flex-col items-center gap-2 w-full">
                            {editingName ? (
                                <div className="flex items-center gap-2 w-full max-w-xs">
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => {
                                            setNewName(e.target.value);
                                            setNameError(null);
                                        }}
                                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg font-bold text-slate-900"
                                        autoFocus
                                        maxLength={255}
                                        disabled={isSavingName}
                                    />
                                    <button
                                        onClick={async () => {
                                            if (!newName.trim()) {
                                                setNameError('El nombre no puede estar vacío');
                                                return;
                                            }
                                            if (newName.trim() === currentUser?.name) {
                                                setEditingName(false);
                                                setNameError(null);
                                                return;
                                            }
                                            try {
                                                setIsSavingName(true);
                                                setNameError(null);
                                                const result = await apiAuth.changeName(newName.trim());
                                                if (result.success) {
                                                    if (onUserUpdate) {
                                                        await onUserUpdate(result.user);
                                                    }
                                                    toast?.showSuccess('Nombre actualizado correctamente');
                                                    setEditingName(false);
                                                } else {
                                                    setNameError(result.error || 'Error al cambiar el nombre');
                                                    if (result.daysRemaining) {
                                                        toast?.showWarning(`Debes esperar ${result.daysRemaining} día(s) más`);
                                                    } else {
                                                        toast?.showError(result.error || 'Error al cambiar el nombre');
                                                    }
                                                }
                                            } catch (error) {
                                                console.error('Error cambiando nombre:', error);
                                                setNameError('Error al cambiar el nombre');
                                                toast?.showError('Error al cambiar el nombre');
                                            } finally {
                                                setIsSavingName(false);
                                            }
                                        }}
                                        disabled={isSavingName || !newName.trim()}
                                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Save size={16} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingName(false);
                                            setNewName(currentUser?.name || '');
                                            setNameError(null);
                                        }}
                                        disabled={isSavingName}
                                        className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-bold text-slate-900">{currentUser?.name || currentUser?.username || 'Usuario'}</h3>
                                    <button
                                        onClick={() => setEditingName(true)}
                                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                                        title="Cambiar nombre"
                                    >
                                        <Pencil size={14} className="text-slate-500" />
                                    </button>
                                </div>
                            )}
                            {nameError && (
                                <p className="text-xs text-red-600 font-medium">{nameError}</p>
                            )}
                            {currentUser?.last_name_change && (
                                <p className="text-xs text-slate-400">
                                    Último cambio: {new Date(currentUser.last_name_change).toLocaleDateString('es-CL')}
                                </p>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Gestiona tu perfil y preferencias</p>

                        {showAvatarSelector && (
                            <div className="mt-6 w-full animate-in zoom-in-95 duration-200">
                                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/50">
                                    <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                                        {avatarEmojis.map((emoji) => {
                                            const baseEmoji = getBaseEmoji(emoji);
                                            const currentAvatarBase = currentUser?.avatar ? getBaseEmoji(currentUser.avatar) : null;

                                            return (
                                                <button
                                                    key={emoji}
                                                    onClick={async () => {
                                                        try {
                                                            if (onUserUpdate) {
                                                                await onUserUpdate(baseEmoji);
                                                            }
                                                            setShowAvatarSelector(false);
                                                        } catch (error) {
                                                            console.error('Error actualizando avatar:', error);
                                                        }
                                                    }}
                                                    className={`aspect-square rounded-xl flex items-center justify-center transition-all hover:scale-110 ${currentAvatarBase === baseEmoji
                                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                                                        : 'bg-transparent hover:bg-slate-100'
                                                        }`}
                                                >
                                                    <EmojiButton emoji={baseEmoji} size={24} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <SettingsSection title="Notificaciones por Email" icon={Mail}>
                        <SettingsRow
                            label="Menciones"
                            description="Cuando alguien te menciona en un comentario"
                            control={
                                <Toggle
                                    checked={userConfig.emailNotifyMentions !== false}
                                    onChange={() => setUserConfig({ ...userConfig, emailNotifyMentions: !userConfig.emailNotifyMentions })}
                                />
                            }
                        />
                        <SettingsRow
                            label="Solicitudes de Validación"
                            description="Cuando te piden validar una tarea"
                            control={
                                <Toggle
                                    checked={userConfig.emailNotifyValidation !== false}
                                    onChange={() => setUserConfig({ ...userConfig, emailNotifyValidation: !userConfig.emailNotifyValidation })}
                                />
                            }
                        />
                        <SettingsRow
                            label="Tareas Vencidas"
                            description="Recordatorios de tareas próximas a vencer"
                            isLast
                            control={
                                <Toggle
                                    checked={userConfig.emailNotifyOverdue !== false}
                                    onChange={() => setUserConfig({ ...userConfig, emailNotifyOverdue: !userConfig.emailNotifyOverdue })}
                                />
                            }
                        />
                    </SettingsSection>

                    <SettingsSection title="Notificaciones Push" icon={Bell}>
                        <SettingsRow
                            label="Alertas de Vencimiento"
                            control={
                                <Toggle
                                    checked={userConfig.notifyDeadline}
                                    onChange={() => setUserConfig({ ...userConfig, notifyDeadline: !userConfig.notifyDeadline })}
                                />
                            }
                        />
                        <SettingsRow
                            label="Solicitudes de Validación"
                            isLast
                            control={
                                <Toggle
                                    checked={userConfig.notifyValidation}
                                    onChange={() => setUserConfig({ ...userConfig, notifyValidation: !userConfig.notifyValidation })}
                                />
                            }
                        />
                    </SettingsSection>

                    {/* TEMPORAL: Eliminar todos los equipos antiguos */}
                    <SettingsSection title="Herramientas de Limpieza" icon={AlertTriangle}>
                        <div className="p-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                                <div className="flex items-start gap-2 mb-2">
                                    <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-amber-900 mb-1">⚠️ Zona de Peligro</p>
                                        <p className="text-xs text-amber-700 leading-relaxed">
                                            Esta acción eliminará <strong>TODOS</strong> los equipos antiguos de la tabla <code>equipment</code> y sus datos asociados (logs, códigos temporales). Esta acción es <strong>IRREVERSIBLE</strong>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {!showDeleteEquipmentConfirm ? (
                                <button
                                    onClick={() => setShowDeleteEquipmentConfirm(true)}
                                    className="w-full p-3 flex items-center justify-center gap-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold text-sm"
                                >
                                    <Trash2 size={16} />
                                    Eliminar Todos los Equipos Antiguos
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
                                        <p className="text-sm font-bold text-red-900 mb-2">⚠️ Confirmación Requerida</p>
                                        <p className="text-xs text-red-700 mb-3">
                                            Estás a punto de eliminar <strong>TODOS</strong> los equipos antiguos del sistema. Esta acción <strong>NO se puede deshacer</strong>.
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        setIsDeletingEquipment(true);
                                                        const result = await apiEquipment.deleteAll(true); // Pasar ?all=true
                                                        if (result.success) {
                                                            toast?.showSuccess(`✅ ${result.deleted} equipo(s) eliminado(s) correctamente`);
                                                            setShowDeleteEquipmentConfirm(false);
                                                        } else {
                                                            toast?.showError(result.error || 'Error al eliminar equipos');
                                                        }
                                                    } catch (error) {
                                                        logger.error('Error eliminando equipos:', error);
                                                        toast?.showError('Error al eliminar equipos');
                                                    } finally {
                                                        setIsDeletingEquipment(false);
                                                    }
                                                }}
                                                disabled={isDeletingEquipment}
                                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isDeletingEquipment ? 'Eliminando...' : 'Confirmar Eliminación'}
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteEquipmentConfirm(false)}
                                                disabled={isDeletingEquipment}
                                                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold text-sm disabled:opacity-50"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </SettingsSection>

                    <SettingsSection title="Cuenta" icon={User}>
                        <button
                            onClick={onDeleteAccount}
                            className="w-full p-4 flex items-center justify-between text-red-600 hover:bg-red-50 transition-colors text-left"
                        >
                            <span className="font-medium">Eliminar Cuenta</span>
                            <ChevronRight size={16} className="text-red-300" />
                        </button>
                    </SettingsSection>

                </div>

                {/* Footer */}
                <div className="p-4 bg-white/50 backdrop-blur-md border-t border-slate-200/50 flex justify-end gap-3 z-10">
                    <button
                        onClick={handleSaveSettings}
                        disabled={isSavingName}
                        className="w-full bg-slate-900 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-slate-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSavingName ? 'Guardando...' : 'Listo'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
