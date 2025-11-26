import React from 'react';
import {
    List, Calendar, ChevronDown, Grid3X3, BarChart3, X, BrainCircuit
} from 'lucide-react';

const Header = ({
    viewMode,
    setViewMode,
    showViewSelector,
    setShowViewSelector,
    currentContext,
    activeGroupId,
    activeGroupObj,
    showMetrics,
    setShowMetrics,
    weeklyReport,
    teamMembers,
    groups,
    allUsers,
    handleGenerateSummary,
    showSummary,
    isThinking
}) => {
    return (
        <header className="flex justify-between items-end mb-8">
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="relative z-30">
                        <button
                            onClick={() => setShowViewSelector(!showViewSelector)}
                            className={`flex items-center gap-2 text-xs font-bold px-2 py-1 rounded-lg uppercase transition-colors ${currentContext === 'work' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                        >
                            {viewMode === 'list' ? <List size={12} /> : <Calendar size={12} />}
                            {viewMode === 'list' ? 'Vista General' : 'Vista Mensual'}
                            <ChevronDown size={10} />
                        </button>

                        {showViewSelector && (
                            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-100 p-1 z-20 min-w-[140px] animate-in fade-in zoom-in-95">
                                <button onClick={() => { setViewMode('list'); setShowViewSelector(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-md text-left hover:text-blue-600">
                                    <List size={14} /> Lista
                                </button>
                                <button onClick={() => { setViewMode('calendar'); setShowViewSelector(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-md text-left hover:text-blue-600">
                                    <Grid3X3 size={14} /> Calendario
                                </button>
                            </div>
                        )}
                    </div>

                    <span className="text-slate-300">/</span>
                    <span className="text-slate-500 text-xs font-bold uppercase">
                        {activeGroupId === 'all' ? 'Unificado' : activeGroupObj?.name}
                    </span>
                </div>
                <h1 className="text-4xl font-bold text-slate-800 mb-1">Hoy</h1>
                <p className="text-slate-500 font-medium">{(() => {
                    const today = new Date();
                    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                    return `${dayNames[today.getDay()]}, ${today.getDate()} de ${monthNames[today.getMonth()]}`;
                })()}</p>
            </div>

            {/* Bloque de métricas / resumen (solo desktop para no saturar móvil) */}
            <div className="hidden md:flex items-center gap-3">
                {/* BOTÓN MÉTRICAS (SOLO EN TRABAJO) */}
                {currentContext === 'work' && (
                    <div className="relative">
                        <button
                            onClick={() => setShowMetrics(!showMetrics)}
                            className={`flex items-center justify-center w-10 h-10 rounded-full border shadow-sm transition-all ${showMetrics ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'}`}
                            title="Métricas y Reportes"
                        >
                            <BarChart3 size={20} />
                        </button>

                        {showMetrics && (
                            <div className="absolute top-12 right-0 w-96 max-h-[80vh] bg-white rounded-2xl shadow-xl border border-slate-100 p-5 z-50 animate-in fade-in zoom-in-95 origin-top-right overflow-y-auto custom-scrollbar">
                                {weeklyReport ? (
                                    <>
                                        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b border-slate-100">
                                            <h3 className="font-bold text-slate-800 text-base">Reporte Semanal</h3>
                                            <button
                                                onClick={() => setShowMetrics(false)}
                                                className="text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>

                                        {/* Métricas principales visuales */}
                                        <div className="mb-4 space-y-3">
                                            <div>
                                                <div className="flex justify-between text-xs mb-2 text-slate-600">
                                                    <span className="font-semibold">Tasa de Cumplimiento</span>
                                                    <span className={`font-bold ${weeklyReport.metrics.completionRate >= 85 ? 'text-green-600' : weeklyReport.metrics.completionRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                                                        {weeklyReport.metrics.completionRate}%
                                                    </span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${weeklyReport.metrics.completionRate >= 85 ? 'bg-green-500' :
                                                            weeklyReport.metrics.completionRate >= 70 ? 'bg-amber-500' :
                                                                'bg-red-500'
                                                            }`}
                                                        style={{ width: `${weeklyReport.metrics.completionRate}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-100">
                                                    <span className="block text-2xl font-bold text-blue-700">{weeklyReport.metrics.completed}</span>
                                                    <span className="text-[10px] text-blue-600 uppercase font-semibold">Completadas</span>
                                                </div>
                                                <div className="bg-red-50 p-3 rounded-lg text-center border border-red-100">
                                                    <span className="block text-2xl font-bold text-red-700">{weeklyReport.metrics.overdue}</span>
                                                    <span className="text-[10px] text-red-600 uppercase font-semibold">Atrasadas</span>
                                                </div>
                                                <div className="bg-amber-50 p-3 rounded-lg text-center border border-amber-100">
                                                    <span className="block text-2xl font-bold text-amber-700">{weeklyReport.metrics.blocked}</span>
                                                    <span className="text-[10px] text-amber-600 uppercase font-semibold">Bloqueadas</span>
                                                </div>
                                                <div className="bg-purple-50 p-3 rounded-lg text-center border border-purple-100">
                                                    <span className="block text-2xl font-bold text-purple-700">{weeklyReport.metrics.validation}</span>
                                                    <span className="text-[10px] text-purple-600 uppercase font-semibold">Por Validar</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ranking de participantes */}
                                        {weeklyReport.ranking && weeklyReport.ranking.length > 0 && (
                                            <div className="mb-4">
                                                <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1">
                                                    <span>🏆</span> Ranking del Equipo
                                                </h4>
                                                <div className="space-y-2">
                                                    {weeklyReport.ranking.map((member, index) => {
                                                        const memberObj = teamMembers.find(m => m.id === member.memberId);
                                                        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                                                        const isTop3 = index < 3;
                                                        const bgColor = index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200' :
                                                            index === 1 ? 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200' :
                                                                index === 2 ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200' :
                                                                    'bg-white border-slate-100';
                                                        return (
                                                            <div key={member.memberId} className={`${bgColor} border rounded-lg p-2.5 flex items-center justify-between`}>
                                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                    <span className="text-sm font-bold text-slate-600 flex-shrink-0">{medal}</span>
                                                                    <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-base shadow-sm border border-slate-200 flex-shrink-0">
                                                                        {memberObj?.avatar || member.avatar || '👤'}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-xs font-bold text-slate-800 truncate">{member.name}</div>
                                                                        <div className="text-[10px] text-slate-500">
                                                                            {member.completed} {member.completed === 1 ? 'completada' : 'completadas'}
                                                                            {member.overdue > 0 && ` • ${member.overdue} ${member.overdue === 1 ? 'atrasada' : 'atrasadas'}`}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                                    {member.completionRate === 100 && (
                                                                        <span className="text-xs">✨</span>
                                                                    )}
                                                                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${member.completionRate === 100 ? 'bg-green-100 text-green-700' :
                                                                        member.completionRate >= 80 ? 'bg-blue-100 text-blue-700' :
                                                                            member.completionRate >= 60 ? 'bg-amber-100 text-amber-700' :
                                                                                'bg-red-100 text-red-700'
                                                                        }`}>
                                                                        {member.completionRate}%
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Ranking de Puntuación (Sistema de Puntos) */}
                                        {(() => {
                                            const activeGroup = groups.find(g => g.id === activeGroupId);
                                            if (!activeGroup || !activeGroup.scores || Object.keys(activeGroup.scores).length === 0) return null;

                                            const scoresArray = Object.entries(activeGroup.scores)
                                                .map(([userId, score]) => {
                                                    const user = allUsers.find(u => u.id === userId) || teamMembers.find(m => m.id === userId);
                                                    return {
                                                        userId,
                                                        name: user?.name || 'Usuario',
                                                        avatar: user?.avatar || '👤',
                                                        score: score || 0
                                                    };
                                                })
                                                .filter(item => item.score > 0) // Solo mostrar usuarios con puntos
                                                .sort((a, b) => b.score - a.score); // Ordenar por puntaje descendente

                                            if (scoresArray.length === 0) return null;

                                            const maxScore = Math.max(...scoresArray.map(s => s.score));

                                            return (
                                                <div className="mb-4 border-t border-slate-200 pt-4">
                                                    <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1">
                                                        <span>⭐</span> Ranking de Puntuación
                                                    </h4>
                                                    <p className="text-[10px] text-slate-500 mb-3">
                                                        Puntos basados en prioridad, plazo, atrasos y postergaciones
                                                    </p>
                                                    <div className="space-y-2">
                                                        {scoresArray.map((member, index) => {
                                                            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                                                            const bgColor = index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200' :
                                                                index === 1 ? 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200' :
                                                                    index === 2 ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200' :
                                                                        'bg-white border-slate-100';
                                                            const percentage = maxScore > 0 ? (member.score / maxScore) * 100 : 0;

                                                            return (
                                                                <div key={member.userId} className={`${bgColor} border rounded-lg p-2.5`}>
                                                                    <div className="flex items-center justify-between mb-1.5">
                                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                            <span className="text-sm font-bold text-slate-600 flex-shrink-0">{medal}</span>
                                                                            <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-base shadow-sm border border-slate-200 flex-shrink-0">
                                                                                {member.avatar}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="text-xs font-bold text-slate-800 truncate">{member.name}</div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                                            <span className={`text-sm font-bold ${index === 0 ? 'text-yellow-600' :
                                                                                index === 1 ? 'text-slate-600' :
                                                                                    index === 2 ? 'text-orange-600' :
                                                                                        'text-slate-700'
                                                                                }`}>
                                                                                {member.score.toLocaleString()} pts
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                        <div
                                                                            className={`h-full rounded-full transition-all ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                                                                                index === 1 ? 'bg-gradient-to-r from-slate-400 to-gray-500' :
                                                                                    index === 2 ? 'bg-gradient-to-r from-orange-400 to-amber-500' :
                                                                                        'bg-blue-500'
                                                                                }`}
                                                                            style={{ width: `${percentage}%` }}
                                                                        ></div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Reporte narrativo corto y amigable */}
                                        <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
                                            <div className="text-slate-700 leading-relaxed whitespace-pre-line text-xs">
                                                {weeklyReport.narrative.split('**').map((part, idx) => {
                                                    if (idx % 2 === 1) {
                                                        return <strong key={idx} className="font-bold text-slate-900">{part}</strong>;
                                                    }
                                                    return <span key={idx}>{part}</span>;
                                                })}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-8 text-slate-400">
                                        <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                                        <p className="text-xs">No hay datos suficientes para generar el reporte</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={handleGenerateSummary}
                            disabled={showSummary || isThinking}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all shadow-sm ${isThinking ? 'bg-slate-100 text-slate-400 cursor-wait' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'}`}
                        >
                            {isThinking ? <>Analizando...</> : <><BrainCircuit size={16} /> Resumen</>}
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
