import React, { useState, useEffect } from 'react';
import { Target, Trophy, Calendar, Flame, Award, CheckCircle2, Clock } from 'lucide-react';
import { apiChallenges } from '../apiService';

const ChallengesView = ({ currentUser, onClose, isMobile }) => {
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadChallenges();
    }, []);

    const loadChallenges = async () => {
        setLoading(true);
        try {
            const result = await apiChallenges.getMyProgress();
            if (result.success) {
                setChallenges(result.progress || []);
            }
        } catch (error) {
            console.error('Error cargando desafíos:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDaysRemaining = (endDate) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
    };

    if (loading) {
        return (
            <div className={`${isMobile ? 'fixed inset-0 z-50' : 'rounded-2xl'} bg-white flex flex-col overflow-hidden shadow-xl`}>
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className={`${isMobile ? 'fixed inset-0 z-50' : 'rounded-2xl'} bg-white flex flex-col overflow-hidden shadow-xl`}>
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white flex items-center justify-between border-b border-white/20">
                <div className="flex items-center gap-3">
                    <Target size={24} />
                    <h2 className="text-xl font-bold">Desafíos</h2>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <span className="text-white">✕</span>
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {challenges.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <Target size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-sm font-medium mb-1">No hay desafíos activos</p>
                        <p className="text-xs">Los desafíos aparecerán aquí cuando estén disponibles</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {challenges.map((challenge) => {
                            const daysRemaining = getDaysRemaining(challenge.endDate);
                            const isCompleted = challenge.completed;
                            
                            return (
                                <div
                                    key={challenge.challengeId}
                                    className={`rounded-xl border-2 overflow-hidden transition-all ${
                                        isCompleted
                                            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
                                            : 'bg-white border-slate-200 hover:shadow-lg'
                                    }`}
                                >
                                    {/* Header del desafío */}
                                    <div className={`p-4 ${isCompleted ? 'bg-green-100' : 'bg-gradient-to-r from-purple-50 to-pink-50'}`}>
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {challenge.type === 'weekly' ? (
                                                        <Calendar className="text-purple-600" size={18} />
                                                    ) : (
                                                        <Trophy className="text-purple-600" size={18} />
                                                    )}
                                                    <h3 className="font-bold text-slate-900">{challenge.name}</h3>
                                                    {isCompleted && (
                                                        <CheckCircle2 className="text-green-600" size={18} />
                                                    )}
                                                </div>
                                                {challenge.description && (
                                                    <p className="text-sm text-slate-600">{challenge.description}</p>
                                                )}
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                challenge.type === 'weekly'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-pink-100 text-pink-700'
                                            }`}>
                                                {challenge.type === 'weekly' ? 'Semanal' : 'Mensual'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            <span>{formatDate(challenge.startDate)} - {formatDate(challenge.endDate)}</span>
                                            {daysRemaining > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {daysRemaining} días restantes
                                                </span>
                                            )}
                                            {daysRemaining <= 0 && (
                                                <span className="text-red-600 font-semibold">Finalizado</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Progreso */}
                                    <div className="p-4">
                                        {/* Barra de progreso general */}
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-semibold text-slate-700">Progreso General</span>
                                                <span className="text-sm font-bold text-slate-900">{challenge.progress}%</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-500 ${
                                                        isCompleted
                                                            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                                            : 'bg-gradient-to-r from-purple-500 to-pink-500'
                                                    }`}
                                                    style={{ width: `${challenge.progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Métricas específicas */}
                                        <div className="grid grid-cols-2 gap-3">
                                            {challenge.targetPoints && (
                                                <div className="bg-slate-50 rounded-lg p-3">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs text-slate-600">Puntos</span>
                                                        <Trophy size={14} className="text-yellow-500" />
                                                    </div>
                                                    <div className="text-lg font-bold text-slate-900">
                                                        {challenge.pointsEarned} / {challenge.targetPoints}
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                                                        <div
                                                            className="bg-yellow-500 h-1.5 rounded-full transition-all"
                                                            style={{ width: `${Math.min(100, (challenge.pointsEarned / challenge.targetPoints) * 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            {challenge.targetTasks && (
                                                <div className="bg-slate-50 rounded-lg p-3">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs text-slate-600">Tareas</span>
                                                        <Target size={14} className="text-blue-500" />
                                                    </div>
                                                    <div className="text-lg font-bold text-slate-900">
                                                        {challenge.tasksCompleted} / {challenge.targetTasks}
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                                                        <div
                                                            className="bg-blue-500 h-1.5 rounded-full transition-all"
                                                            style={{ width: `${Math.min(100, (challenge.tasksCompleted / challenge.targetTasks) * 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Recompensa */}
                                        {challenge.rewardBadge && (
                                            <div className={`mt-4 p-3 rounded-lg border ${
                                                isCompleted
                                                    ? 'bg-green-50 border-green-200'
                                                    : 'bg-amber-50 border-amber-200'
                                            }`}>
                                                <div className="flex items-center gap-2">
                                                    <Award className={isCompleted ? 'text-green-600' : 'text-amber-600'} size={16} />
                                                    <span className="text-sm font-semibold text-slate-700">
                                                        Recompensa: {challenge.rewardBadge}
                                                    </span>
                                                    {isCompleted && (
                                                        <span className="ml-auto text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-medium">
                                                            Obtenido
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChallengesView;

