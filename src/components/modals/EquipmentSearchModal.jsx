import React, { useState } from 'react';
import { X, Search } from 'lucide-react';

const EquipmentSearchModal = ({ onClose, onEquipmentFound, onEquipmentNotFound }) => {
    const [code, setCode] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async () => {
        if (!code.trim()) {
            alert('Por favor ingresa un código');
            return;
        }

        setIsSearching(true);
        try {
            // Llamar al callback con el código
            // El padre decidirá qué hacer (buscar en API, etc.)
            const result = await onEquipmentFound(code.trim());

            // Si llegamos aquí y result es false, significa que no existe
            if (result === false) {
                const shouldCreate = window.confirm(
                    `El equipo con código "${code.trim()}" no existe.\n\n¿Deseas crear una nueva ficha para este equipo?`
                );

                if (shouldCreate) {
                    onEquipmentNotFound(code.trim());
                }
            }
            // Si result es true o un objeto, el padre ya manejó la apertura de la ficha
        } catch (error) {
            console.error('Error buscando equipo:', error);
            alert('Error al buscar el equipo: ' + error.message);
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
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Buscar Equipo</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-slate-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Código del Equipo
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ej: DX-001"
                            className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            autoFocus
                            disabled={isSearching}
                        />
                        <button
                            onClick={handleSearch}
                            disabled={!code.trim() || isSearching}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {isSearching ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <Search size={20} />
                            )}
                            Buscar
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        Ingresa el código del equipo para ver su ficha o crear una nueva.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EquipmentSearchModal;
