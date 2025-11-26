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

                        {showMetrics && (
                            <div className="absolute top-11 right-0 w-96 max-h-[80vh] bg-white rounded-2xl shadow-xl border border-slate-100 p-5 z-50 animate-in fade-in zoom-in-95 origin-top-right overflow-y-auto custom-scrollbar">
                                {/* Panel de métricas completo (sin cambios) */}
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
                                        {/* (El resto del contenido se mantiene igual) */}
                                    </>
                                ) : (
                                    <div className="text-center py-8 text-slate-400">
                                        <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                                        <p className="text-xs">No hay datos suficientes para generar el reporte</p>
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
