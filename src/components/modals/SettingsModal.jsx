import React from 'react';
import { Settings, X, Pencil } from 'lucide-react';

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
    setShowAvatarSelector
}) => {
    if (!isOpen) return null;

    const avatarEmojis = ['👤', '👨', '👩', '🧑', '👨‍💼', '👩‍💼', '👨‍🔬', '👩‍🔬', '👨‍💻', '👩‍💻', '👨‍🎨', '👩‍🎨', '👨‍🏫', '👩‍🏫', '👨‍⚕️', '👩‍⚕️', '👨‍🚀', '👩‍🚀', '👨‍✈️', '👩‍✈️', '👨‍🎓', '👩‍🎓', '👨‍🏭', '👩‍🏭', '🧑‍🌾', '🧑‍🍳', '🧑‍🎤', '🧑‍🎨', '🧑‍🏫', '🧑‍💼', '🧑‍🔬', '🧑‍💻', '🧑‍🎓', '🧑‍🏭', '🧑‍🚀', '🧑‍⚕️', '🤴', '👸', '🦸', '🦸‍♂️', '🦸‍♀️', '🧙', '🧙‍♂️', '🧙‍♀️', '🧚', '🧚‍♂️', '🧚‍♀️', '🧛', '🧛‍♂️', '🧛‍♀️', '🧜', '🧜‍♂️', '🧜‍♀️', '🧝', '🧝‍♂️', '🧝‍♀️', '🧞', '🧞‍♂️', '🧞‍♀️', '🧟', '🧟‍♂️', '🧟‍♀️', '🤵', '🤵‍♂️', '🤵‍♀️', '👰', '👰‍♂️', '👰‍♀️', '🤰', '🤱', '👼', '🎅', '🤶', '🦹', '🦹‍♂️', '🦹‍♀️', '🧑‍🎄', '👮', '👮‍♂️', '👮‍♀️', '🕵️', '🕵️‍♂️', '🕵️‍♀️', '💂', '💂‍♂️', '💂‍♀️', '👷', '👷‍♂️', '👷‍♀️', '👳', '👳‍♂️', '👳‍♀️', '👲', '🧕'];

    const getBaseEmoji = (e) => {
        return e.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '');
    };

    const handleSaveSettings = async () => {
        try {
            // Los toggles ya actualizan userConfig automáticamente
            // Aquí podrías guardar en el backend si es necesario
            onClose();
        } catch (error) {
            console.error('Error guardando configuración:', error);
        }
    };

    return (
        <div
            className={`${isMobile ? 'fixed' : 'absolute'} inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-[90] p-4 animate-in fade-in`}
            style={{ display: 'flex' }}
        >
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Settings size={20} /> Configuración
                    </h2>
                    <button onClick={onClose}>
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Selector de Avatar */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Avatar de Perfil</h3>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="relative group">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center border-2 border-slate-200">
                                    <span style={{ fontSize: '3rem', lineHeight: '1', fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>
                                        {currentUser?.avatar || '👤'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors border-2 border-white"
                                    title="Editar avatar"
                                >
                                    <Pencil size={12} className="text-white" />
                                </button>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-700">{currentUser?.name || currentUser?.username || 'Usuario'}</p>
                                <p className="text-xs text-slate-500">Toca el lápiz para cambiar tu avatar</p>
                            </div>
                        </div>
                        {showAvatarSelector && (
                            <div className="mt-4 animate-in slide-in-from-top-2 duration-200 z-[100] relative">
                                <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                                    {avatarEmojis.map((emoji) => {
                                        const baseEmoji = getBaseEmoji(emoji);
                                        const currentAvatarBase = currentUser?.avatar ? getBaseEmoji(currentUser.avatar) : null;

                                        return (
                                            <button
                                                key={emoji}
                                                onClick={async () => {
                                                    try {
                                                        // Llamar a la función de actualización pasada como prop
                                                        if (onUserUpdate) {
                                                            await onUserUpdate(baseEmoji);
                                                        }
                                                        setShowAvatarSelector(false);
                                                    } catch (error) {
                                                        console.error('Error actualizando avatar:', error);
                                                    }
                                                }}
                                                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${currentAvatarBase === baseEmoji
                                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                                                        : 'bg-white hover:bg-slate-100 border border-slate-200'
                                                    }`}
                                                title={baseEmoji}
                                            >
                                                <EmojiButton emoji={baseEmoji} size={20} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-200 pt-6">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Notificaciones Inteligentes</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700">Alertas de Vencimiento</span>
                                <button
                                    onClick={() => setUserConfig({ ...userConfig, notifyDeadline: !userConfig.notifyDeadline })}
                                    className={`w-10 h-6 rounded-full p-1 transition-colors ${userConfig.notifyDeadline ? 'bg-green-500' : 'bg-slate-200'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${userConfig.notifyDeadline ? 'translate-x-4' : ''}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700">Solicitudes de Validación</span>
                                <button
                                    onClick={() => setUserConfig({ ...userConfig, notifyValidation: !userConfig.notifyValidation })}
                                    className={`w-10 h-6 rounded-full p-1 transition-colors ${userConfig.notifyValidation ? 'bg-green-500' : 'bg-slate-200'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${userConfig.notifyValidation ? 'translate-x-4' : ''}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 pt-6">
                        <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-3">Zona de Peligro</h3>
                        <button
                            onClick={onDeleteAccount}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg font-medium transition-colors"
                        >
                            <X size={18} />
                            Eliminar Cuenta
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSaveSettings}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
