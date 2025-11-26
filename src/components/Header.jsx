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
                {/* Botón de métricas: solo en contexto Trabajo */}
                {currentContext === 'work' && (
                    <div className="relative">
                        <button
                            onClick={() => setShowMetrics(!showMetrics)}
                            className={`flex items-center justify-center w-10 h-10 rounded-full border shadow-sm transition-all ${showMetrics ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'}`}
                            title="Ver métricas de la semana"
                        >
                            <BarChart3 size={20} />
                        </button>

                        {showMetrics && (
                            <div className="absolute top-12 right-0 w-80 max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 animate-in fade-in zoom-in-95 origin-top-right overflow-y-auto custom-scrollbar">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-slate-800 text-sm">Métricas de la semana</h3>
                                    <button
                                        onClick={() => setShowMetrics(false)}
                                        className="text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                                {weeklyReport ? (
                                    <div className="space-y-3 text-xs text-slate-700">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold">Tareas completadas</span>
                                            <span className="text-blue-700 font-bold">
                                                {weeklyReport.metrics?.completed ?? 0}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold">Atrasadas</span>
                                            <span className="text-red-600 font-semibold">
                                                {weeklyReport.metrics?.overdue ?? 0}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold">Tasa de cumplimiento</span>
                                            <span className="font-bold">
                                                {weeklyReport.metrics?.completionRate ?? 0}%
                                            </span>
                                        </div>
                                        {weeklyReport.narrative && (
                                            <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] leading-relaxed text-slate-600 whitespace-pre-line">
                                                {weeklyReport.narrative}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-slate-400">
                                        <BarChart3 size={28} className="mx-auto mb-2 opacity-60" />
                                        <p>No hay datos suficientes todavía.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Botón Resumen (visible en Trabajo y Personal) */}
                <button
                    onClick={handleGenerateSummary}
                    disabled={showSummary || isThinking}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all shadow-sm ${isThinking ? 'bg-slate-100 text-slate-400 cursor-wait' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'}`}
                >
                    {isThinking ? <>Analizando...</> : <><BrainCircuit size={16} /> Resumen</>}
                </button>
            </div>
        </header>
    );
};

export default Header;
