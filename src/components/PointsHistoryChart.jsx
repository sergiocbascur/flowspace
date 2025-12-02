import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar } from 'lucide-react';
import { apiStats } from '../apiService';

const PointsHistoryChart = ({ currentUser, days = 30 }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDays, setSelectedDays] = useState(days);

    useEffect(() => {
        loadHistory();
    }, [selectedDays]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const result = await apiStats.getPointsHistory(selectedDays);
            if (result.success) {
                setHistory(result.history || []);
            }
        } catch (error) {
            console.error('Error cargando historial:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calcular estadísticas
    const totalPoints = history.reduce((sum, day) => sum + day.points, 0);
    const totalTasks = history.reduce((sum, day) => sum + day.tasksCount, 0);
    const avgPoints = history.length > 0 ? Math.round(totalPoints / history.length) : 0;
    const maxPoints = history.length > 0 ? Math.max(...history.map(d => d.points)) : 0;

    // Preparar datos para el gráfico
    const chartData = history.map(day => ({
        ...day,
        dateObj: new Date(day.date)
    }));

    // Encontrar altura máxima para escalar el gráfico
    const maxHeight = maxPoints || 1;

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <TrendingUp className="text-blue-600" size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Evolución de Puntos</h3>
                        <p className="text-xs text-slate-500">Últimos {selectedDays} días</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {[7, 30, 90].map(d => (
                        <button
                            key={d}
                            onClick={() => setSelectedDays(d)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                selectedDays === d
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {d}d
                        </button>
                    ))}
                </div>
            </div>

            {/* Estadísticas rápidas */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                    <div className="text-2xl font-bold text-blue-700">{totalPoints}</div>
                    <div className="text-xs text-blue-600 font-medium">Total puntos</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                    <div className="text-2xl font-bold text-green-700">{totalTasks}</div>
                    <div className="text-xs text-green-600 font-medium">Tareas</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                    <div className="text-2xl font-bold text-purple-700">{avgPoints}</div>
                    <div className="text-xs text-purple-600 font-medium">Promedio/día</div>
                </div>
            </div>

            {/* Gráfico de barras */}
            {chartData.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                    <Calendar size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">No hay datos disponibles</p>
                    <p className="text-xs mt-1">Completa tareas para ver tu evolución</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="flex items-end justify-between gap-1 h-48">
                        {chartData.map((day, index) => {
                            const height = maxHeight > 0 ? (day.points / maxHeight) * 100 : 0;
                            const isToday = new Date(day.date).toDateString() === new Date().toDateString();
                            
                            return (
                                <div key={index} className="flex-1 flex flex-col items-center group relative">
                                    <div
                                        className={`w-full rounded-t-lg transition-all hover:opacity-80 cursor-pointer ${
                                            isToday
                                                ? 'bg-gradient-to-t from-blue-600 to-blue-400'
                                                : 'bg-gradient-to-t from-slate-400 to-slate-300'
                                        }`}
                                        style={{ height: `${Math.max(height, 2)}%` }}
                                        title={`${day.date}: ${day.points} puntos, ${day.tasksCount} tareas`}
                                    />
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                        <div className="font-semibold">{day.points} pts</div>
                                        <div className="text-xs opacity-80">{day.tasksCount} tareas</div>
                                        <div className="text-xs opacity-60">{new Date(day.date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}</div>
                                    </div>
                                    {index % Math.ceil(chartData.length / 7) === 0 && (
                                        <div className="text-[10px] text-slate-400 mt-1">
                                            {new Date(day.date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PointsHistoryChart;

