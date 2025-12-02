import React, { useState, useEffect } from 'react';
import { Users, Trophy, Target, Flame, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { apiStats } from '../apiService';

const UserComparison = ({ currentUser, otherUserId, onClose }) => {
    const [comparison, setComparison] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadComparison();
    }, [otherUserId]);

    const loadComparison = async () => {
        setLoading(true);
        try {
            const result = await apiStats.compareUsers(otherUserId);
            if (result.success) {
                setComparison(result.comparison);
            }
        } catch (error) {
            console.error('Error cargando comparación:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderStatCard = (label, userValue, otherValue, Icon, color) => {
        const diff = userValue - otherValue;
        const isBetter = diff > 0;
        const isEqual = diff === 0;
        
        return (
            <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {Icon && <Icon className={`${color} text-slate-400`} size={16} />}
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</span>
                    </div>
                    {!isEqual && (
                        <div className={`flex items-center gap-1 text-xs font-bold ${
                            isBetter ? 'text-green-600' : 'text-red-600'
                        }`}>
                            {isBetter ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {Math.abs(diff)}
                        </div>
                    )}
                    {isEqual && (
                        <Minus className="text-slate-400" size={12} />
                    )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                        <div className="text-lg font-bold text-slate-900">{userValue}</div>
                        <div className="text-xs text-slate-500">Tú</div>
                    </div>
                    <div className="text-center border-l border-slate-200">
                        <div className="text-lg font-bold text-slate-600">{otherValue}</div>
                        <div className="text-xs text-slate-500">Otro</div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    if (!comparison) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-center py-12 text-slate-400">
                <Users size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No se pudo cargar la comparación</p>
            </div>
        );
    }

    const { user, other, differences } = comparison;

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <Users className="text-white" size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Comparación</h3>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <span className="text-slate-500">✕</span>
                    </button>
                )}
            </div>

            {/* Usuarios */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mx-auto mb-2 border-2 border-white shadow-sm">
                        <span style={{ fontSize: '2rem', lineHeight: '1', fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>
                            {user.avatar}
                        </span>
                    </div>
                    <div className="font-bold text-slate-900">{user.name}</div>
                    <div className="text-xs text-slate-500">@{user.username}</div>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-2 border-2 border-white shadow-sm">
                        <span style={{ fontSize: '2rem', lineHeight: '1', fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>
                            {other.avatar}
                        </span>
                    </div>
                    <div className="font-bold text-slate-900">{other.name}</div>
                    <div className="text-xs text-slate-500">@{other.username}</div>
                </div>
            </div>

            {/* Estadísticas comparativas */}
            <div className="space-y-3">
                {renderStatCard('Puntos Totales', user.totalPoints, other.totalPoints, Trophy, 'text-yellow-500')}
                {renderStatCard('Tareas Completadas', user.tasksCompleted, other.tasksCompleted, Target, 'text-blue-500')}
                {renderStatCard('Racha Actual', user.currentStreak, other.currentStreak, Flame, 'text-orange-500')}
                {renderStatCard('Tareas a Tiempo', user.tasksOnTime, other.tasksOnTime, Target, 'text-green-500')}
                {renderStatCard('Tareas Anticipadas', user.tasksEarly, other.tasksEarly, TrendingUp, 'text-purple-500')}
            </div>

            {/* Resumen */}
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                <div className="text-sm font-semibold text-slate-700 mb-2">Resumen</div>
                <div className="space-y-1 text-xs text-slate-600">
                    {differences.pointsDiff > 0 && (
                        <div>✅ Tienes {differences.pointsDiff} puntos más</div>
                    )}
                    {differences.pointsDiff < 0 && (
                        <div>⚠️ Te faltan {Math.abs(differences.pointsDiff)} puntos para igualar</div>
                    )}
                    {differences.tasksDiff > 0 && (
                        <div>✅ Has completado {differences.tasksDiff} tareas más</div>
                    )}
                    {differences.tasksDiff < 0 && (
                        <div>⚠️ Te faltan {Math.abs(differences.tasksDiff)} tareas para igualar</div>
                    )}
                    {differences.streakDiff > 0 && (
                        <div>🔥 Tu racha es {differences.streakDiff} días mayor</div>
                    )}
                    {differences.streakDiff < 0 && (
                        <div>❄️ Tu racha es {Math.abs(differences.streakDiff)} días menor</div>
                    )}
                    {differences.pointsDiff === 0 && differences.tasksDiff === 0 && differences.streakDiff === 0 && (
                        <div>🤝 Están empatados en todas las métricas</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserComparison;

