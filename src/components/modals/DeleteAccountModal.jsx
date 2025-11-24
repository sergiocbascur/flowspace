import React from 'react';
import { AlertTriangle } from 'lucide-react';

const DeleteAccountModal = ({
    isOpen,
    onClose,
    onConfirm
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(8px)',
                animation: 'fadeIn 0.2s ease-out'
            }}
        >
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes popIn { 
                    0% { transform: scale(0.9); opacity: 0; } 
                    100% { transform: scale(1); opacity: 1; } 
                }
            `}</style>

            <div
                className="w-full max-w-sm bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden"
                style={{
                    animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)'
                }}
            >
                <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <AlertTriangle size={40} className="text-red-600" />
                    </div>

                    <h3 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">
                        ¿Eliminar Cuenta?
                    </h3>

                    <p className="text-slate-600 mb-8 leading-relaxed">
                        Esta acción es <span className="font-bold text-red-600">irreversible</span>.
                        Perderás todos tus grupos, tareas y progreso acumulado.
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className="w-full py-4 bg-red-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-red-500/30 active:scale-95 transition-all hover:bg-red-700"
                        >
                            Sí, Eliminar Todo
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-white border border-slate-200 text-slate-900 rounded-xl font-bold text-lg active:scale-95 transition-all hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteAccountModal;
