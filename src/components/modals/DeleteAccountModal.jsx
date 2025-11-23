import React from 'react';
import { X } from 'lucide-react';

const DeleteAccountModal = ({
    isOpen,
    onClose,
    onConfirm
}) => {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <X size={20} className="text-red-600" />
                        Eliminar Cuenta
                    </h2>
                    <button onClick={onClose}>
                        <X size={24} className="text-slate-400 hover:text-slate-600" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <X size={32} className="text-red-600" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 mb-2">¿Eliminar tu cuenta permanentemente?</h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Esta acción no se puede deshacer. Se eliminarán todos tus datos, grupos creados, tareas y puntuaciones.
                        </p>
                        <p className="text-xs text-red-600 font-medium">
                            ⚠️ Esta acción es irreversible
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                        >
                            Eliminar Cuenta
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteAccountModal;
