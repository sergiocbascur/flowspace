import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, ShoppingCart, Plus, Trash2 } from 'lucide-react';
import logger from '../utils/logger';

const ResourceShoppingView = ({ qrCode, onClose }) => {
    const [shoppingList, setShoppingList] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newItemName, setNewItemName] = useState('');
    const [newItemQuantity, setNewItemQuantity] = useState('1');
    const [addingItem, setAddingItem] = useState(false);

    useEffect(() => {
        const fetchShoppingList = async () => {
            try {
                setLoading(true);
                setError(null);

                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const response = await fetch(`${apiUrl}/api/shopping-lists/public/${qrCode}`);

                if (!response.ok) {
                    throw new Error('Error al cargar la lista de compras');
                }

                const data = await response.json();
                if (data.success) {
                    setShoppingList(data.shoppingList);
                } else {
                    throw new Error(data.error || 'Error al cargar la lista');
                }
            } catch (err) {
                logger.error('Error cargando lista de compras:', err);
                setError(err.message || 'Error al cargar la lista de compras');
            } finally {
                setLoading(false);
            }
        };

        if (qrCode) {
            fetchShoppingList();
        }
    }, [qrCode]);

    const handleAddItem = async () => {
        if (!newItemName.trim() || !shoppingList) return;

        try {
            setAddingItem(true);

            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const listId = shoppingList.id;

            if (!listId) {
                // Si no hay lista, primero crear una
                // Por ahora, solo mostrar error
                setError('La lista no está inicializada. Accede desde la aplicación para crearla.');
                return;
            }

            const response = await fetch(`${apiUrl}/api/shopping-lists/${listId}/items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: newItemName.trim(),
                    quantity: parseInt(newItemQuantity) || 1
                })
            });

            const data = await response.json();

            if (data.success) {
                setShoppingList(data.shoppingList);
                setNewItemName('');
                setNewItemQuantity('1');
            } else {
                throw new Error(data.error || 'Error al agregar item');
            }
        } catch (err) {
            logger.error('Error agregando item:', err);
            setError(err.message || 'Error al agregar item');
        } finally {
            setAddingItem(false);
        }
    };

    const handleToggleItem = async (itemId) => {
        if (!shoppingList) return;

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const item = shoppingList.items.find(i => i.id === itemId);
            if (!item) return;

            const response = await fetch(`${apiUrl}/api/shopping-lists/${shoppingList.id}/items/${itemId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    checked: !item.checked
                })
            });

            const data = await response.json();

            if (data.success) {
                setShoppingList(data.shoppingList);
            }
        } catch (err) {
            logger.error('Error actualizando item:', err);
        }
    };

    const handleDeleteItem = async (itemId) => {
        if (!shoppingList) return;

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

            const response = await fetch(`${apiUrl}/api/shopping-lists/${shoppingList.id}/items/${itemId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                setShoppingList(data.shoppingList);
            }
        } catch (err) {
            logger.error('Error eliminando item:', err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600">Cargando lista de compras...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Error</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        Recargar
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="mt-3 w-full px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Cerrar
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const items = shoppingList?.items || [];
    const checkedCount = items.filter(item => item.checked).length;
    const totalCount = items.length;

    return (
        <div className="min-h-screen bg-[#F2F2F7] p-4">
            <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <ShoppingCart size={28} className="text-white" />
                            <h1 className="text-2xl font-bold">{shoppingList?.name || 'Lista de Compras'}</h1>
                        </div>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                    {totalCount > 0 && (
                        <p className="text-blue-100 text-sm">
                            {checkedCount} de {totalCount} completados
                        </p>
                    )}
                </div>

                {/* Lista de items */}
                <div className="p-6">
                    {items.length === 0 ? (
                        <div className="text-center py-12">
                            <ShoppingCart size={48} className="text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">La lista está vacía</p>
                            <p className="text-slate-400 text-sm mt-1">Agrega items para empezar</p>
                        </div>
                    ) : (
                        <div className="space-y-2 mb-6">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                                        item.checked
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-slate-50 border-slate-200 hover:border-blue-300'
                                    }`}
                                >
                                    <button
                                        onClick={() => handleToggleItem(item.id)}
                                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                            item.checked
                                                ? 'bg-green-500 border-green-500'
                                                : 'border-slate-300 hover:border-green-500'
                                        }`}
                                    >
                                        {item.checked && <CheckCircle2 size={16} className="text-white" />}
                                    </button>
                                    <div className="flex-1">
                                        <p
                                            className={`font-medium ${
                                                item.checked
                                                    ? 'text-slate-400 line-through'
                                                    : 'text-slate-900'
                                            }`}
                                        >
                                            {item.name}
                                        </p>
                                        {item.quantity > 1 && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                Cantidad: {item.quantity}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="flex-shrink-0 w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                                    >
                                        <Trash2 size={14} className="text-red-600" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Formulario para agregar item */}
                    <div className="border-t border-slate-200 pt-6">
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !addingItem) {
                                        handleAddItem();
                                    }
                                }}
                                placeholder="Agregar item..."
                                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                                disabled={addingItem || !shoppingList?.id}
                            />
                            <input
                                type="number"
                                value={newItemQuantity}
                                onChange={(e) => setNewItemQuantity(e.target.value)}
                                min="1"
                                className="w-20 px-3 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                disabled={addingItem || !shoppingList?.id}
                            />
                            <button
                                onClick={handleAddItem}
                                disabled={!newItemName.trim() || addingItem || !shoppingList?.id}
                                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <Plus size={20} />
                                {addingItem ? '...' : 'Agregar'}
                            </button>
                        </div>
                        {!shoppingList?.id && (
                            <p className="text-xs text-amber-600 mt-2">
                                Inicia sesión en la aplicación para crear la lista
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResourceShoppingView;

