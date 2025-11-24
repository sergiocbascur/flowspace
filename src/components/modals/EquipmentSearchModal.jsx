import React, { useState } from 'react';
import { X, Search, ArrowRight } from 'lucide-react';

const EquipmentSearchModal = ({ onClose, onEquipmentFound, onEquipmentNotFound }) => {
    const [code, setCode] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async () => {
        if (!code.trim()) return;

        setIsSearching(true);
        try {
            const result = await onEquipmentFound(code.trim());

            if (result === false) {
                // Usamos un custom confirm modal si es posible, pero por ahora el nativo está bien
                // o mejor, delegamos al padre que maneje el "not found" visualmente
                onEquipmentNotFound(code.trim());
            }
        } catch (error) {
            console.error('Error buscando equipo:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh] p-4"
            style={{
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
                animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>

            <div
                className="w-full max-w-xl bg-white/80 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden border border-white/40"
                style={{
                    animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 40px 80px -20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.5) inset'
                }}
            >
                <div className="relative flex items-center p-4">
                    <Search className="absolute left-6 text-slate-400" size={24} />
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Buscar equipo por código..."
                        className="w-full bg-transparent border-none text-2xl font-medium text-slate-800 placeholder:text-slate-400 pl-12 pr-12 focus:ring-0 outline-none"
                        autoFocus
                        disabled={isSearching}
                    />
                    {isSearching ? (
                        <div className="absolute right-6 w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <button
                            onClick={onClose}
                            className="absolute right-4 p-2 bg-slate-200/50 hover:bg-slate-300/50 rounded-full text-slate-500 transition-colors"
                        >
                            <span className="text-xs font-bold px-1">ESC</span>
                        </button>
                    )}
                </div>

                {code.trim() && !isSearching && (
                    <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2">
                        <button
                            onClick={handleSearch}
                            className="w-full py-3 bg-blue-600/90 hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                        >
                            Buscar <span className="font-mono bg-white/20 px-1.5 rounded text-sm">{code}</span> <ArrowRight size={18} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EquipmentSearchModal;
