import React, { useState } from 'react';
import { CheckCircle2, Circle, Plus, Trash2, X } from 'lucide-react';

const CheckableList = ({ 
    items = [], 
    type = 'todo', // 'todo' | 'shopping'
    onAddItem, 
    onToggleItem, 
    onDeleteItem,
    disabled = false,
    showAddButton = true
}) => {
    const [newItemName, setNewItemName] = useState('');
    const [newItemQuantity, setNewItemQuantity] = useState('1');
    const [showAddForm, setShowAddForm] = useState(false);
    const [addingItem, setAddingItem] = useState(false);

    const handleAdd = async () => {
        if (!newItemName.trim() || disabled || addingItem) return;

        try {
            setAddingItem(true);
            await onAddItem({
                name: newItemName.trim(),
                quantity: type === 'shopping' ? parseInt(newItemQuantity) || 1 : undefined
            });
            setNewItemName('');
            setNewItemQuantity('1');
            setShowAddForm(false);
        } catch (error) {
            console.error('Error agregando item:', error);
        } finally {
            setAddingItem(false);
        }
    };

    const checkedCount = items.filter(item => item.checked).length;
    const totalCount = items.length;

    return (
        <div className="w-full space-y-4">
            {/* Header con contador */}
            {totalCount > 0 && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm font-semibold text-slate-600">
                        {checkedCount} de {totalCount} completados
                    </p>
                    {checkedCount === totalCount && totalCount > 0 && (
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            ✓ Completado
                        </span>
                    )}
                </div>
            )}

            {/* Lista de items */}
            <div className="space-y-2">
                {items.length === 0 ? (
                    <div className="text-center py-12 px-4">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                            {type === 'shopping' ? (
                                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                            ) : (
                                <CheckCircle2 size={32} className="text-slate-400" />
                            )}
                        </div>
                        <p className="text-slate-500 font-medium mb-1">
                            {type === 'shopping' ? 'La lista está vacía' : 'No hay tareas pendientes'}
                        </p>
                        <p className="text-slate-400 text-sm">
                            {type === 'shopping' ? 'Agrega items para empezar' : 'Agrega tareas para empezar'}
                        </p>
                    </div>
                ) : (
                    items.map((item) => (
                        <div
                            key={item.id}
                            className={`group flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                                item.checked
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-slate-50 border-slate-200 hover:border-blue-300 hover:shadow-sm'
                            }`}
                        >
                            <button
                                onClick={() => !disabled && onToggleItem(item.id)}
                                disabled={disabled}
                                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                    item.checked
                                        ? 'bg-green-500 border-green-500 shadow-sm'
                                        : 'border-slate-300 hover:border-green-500 hover:scale-110'
                                } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                            >
                                {item.checked && <CheckCircle2 size={16} className="text-white" />}
                            </button>
                            
                            <div className="flex-1 min-w-0">
                                <p
                                    className={`font-medium transition-all ${
                                        item.checked
                                            ? 'text-slate-400 line-through'
                                            : 'text-slate-900'
                                    }`}
                                >
                                    {item.name}
                                </p>
                                {type === 'shopping' && item.quantity > 1 && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        Cantidad: {item.quantity}
                                    </p>
                                )}
                            </div>

                            {!disabled && (
                                <button
                                    onClick={() => onDeleteItem(item.id)}
                                    className="flex-shrink-0 w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={14} className="text-red-600" />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Formulario para agregar */}
            {showAddButton && (
                <div className="pt-4 border-t border-slate-200">
                    {!showAddForm ? (
                        <button
                            onClick={() => setShowAddForm(true)}
                            disabled={disabled}
                            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={20} />
                            {type === 'shopping' ? 'Agregar Item' : 'Agregar Tarea'}
                        </button>
                    ) : (
                        <div className="space-y-3 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !addingItem) {
                                            handleAdd();
                                        }
                                    }}
                                    placeholder={type === 'shopping' ? 'Ej: Leche' : 'Ej: Revisar calibración'}
                                    className="flex-1 px-4 py-3 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                                    autoFocus
                                    disabled={addingItem || disabled}
                                />
                                {type === 'shopping' && (
                                    <input
                                        type="number"
                                        value={newItemQuantity}
                                        onChange={(e) => setNewItemQuantity(e.target.value)}
                                        min="1"
                                        className="w-20 px-3 py-3 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-semibold"
                                        disabled={addingItem || disabled}
                                    />
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleAdd}
                                    disabled={!newItemName.trim() || addingItem || disabled}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {addingItem ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Agregando...
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={16} />
                                            Agregar
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setNewItemName('');
                                        setNewItemQuantity('1');
                                    }}
                                    disabled={addingItem}
                                    className="px-4 py-2.5 bg-white border border-blue-300 text-blue-700 rounded-xl font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CheckableList;





