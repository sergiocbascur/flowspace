import React from 'react';
import { UserMinus, X } from 'lucide-react';

const LeaveGroupModal = ({
    isOpen,
    onClose,
    group,
    onConfirm
}) => {
    if (!isOpen || !group) return null;

    return (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <UserMinus size={20} className="text-amber-600" />
                        Dejar Espacio
                    </h2>
                    <button onClick={onClose}>
                        <X size={24} className="text-slate-400 hover:text-slate-600" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <UserMinus size={32} className="text-amber-600" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 mb-2">¿Dejar "{group.name}"?</h3>
                        <p className="text-sm text-slate-600">
                            Los demás miembros del espacio serán notificados. Podrás volver a unirte más tarde si tienes el código.
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
                            onClick={onConfirm}
                            className="flex-1 px-4 py-3 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20"
                        >
                            Dejar Espacio
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaveGroupModal;
