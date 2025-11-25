import React from 'react';
import {
    CheckCircle2, CheckCircle, Circle, Clock, AlertTriangle, Mail, BrainCircuit, Plus, Search, Calendar, Users, MoreHorizontal, LogOut, Lock, ArrowRight, X, QrCode, MapPin, History, Save, Moon, MessageSquare, Send, Ban, Unlock, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Settings, CalendarCheck, Sparkles, Flag, Lightbulb, Check, Tag, Briefcase, Home, Layers, UserPlus, Copy, LogIn, LayoutGrid, Folder, Share2, ScanLine, Eye, Bell, ShieldCheck, CheckSquare, BarChart3, Wrench, Activity, Maximize2, Minimize2, List, Grid3X3, UserMinus, Pencil, FolderPlus
} from 'lucide-react';

const SidebarItem = ({ icon, label, count, active, onClick }) => (
    <div
        onClick={onClick}
        className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${active ? 'bg-slate-200 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-200/50'}`}
    >
        <div className="flex items-center gap-3">
            {icon}
            <span className="text-sm">{label}</span>
        </div>
        {count > 0 && <span className="text-xs font-semibold text-slate-400 bg-white px-2 py-0.5 rounded-md shadow-sm">{count}</span>}
    </div>
);

const Sidebar = ({
    currentUser,
    onLogout,
    currentContext,
    setCurrentContext,
    activeGroupId,
    setActiveGroupId,
    searchQuery,
    setSearchQuery,
    tasks,
    groups,
    activeFilter,
    setActiveFilter,
    setViewMode,
    isSpacesExpanded,
    setIsSpacesExpanded,
    setShowGroupModal,
    setGroupModalTab,
    handleLeaveGroup,
    handleDeleteGroup,
    isIntelligenceExpanded,
    toggleIntelligence,
    filteredSuggestions,
    unreadNotifications,
    handleProcessSuggestion,
    handleScanQR,
    setShowSettings,
    setShowEndDay,
    onCreateResource,
    onMigrateEquipment
}) => {
    // Filter helpers
    const currentGroups = groups.filter(g => g.type === currentContext);

    return (
        <aside className="w-80 bg-slate-100/80 backdrop-blur-xl border-r border-slate-200 flex flex-col p-4 hidden md:flex relative z-30 h-full">

            {/* HEADER: LOGO */}
            <div className="mb-8 flex items-center gap-3 px-2">
                <div className="w-10 h-10 flex items-center justify-center">
                    <img
                        src="/logo_flowspace.png"
                        alt="FlowSpace Logo"
                        className="w-full h-full object-contain"
                    />
                </div>
                <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">FlowSpace</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tu Segundo Cerebro</p>
                </div>
            </div>

            {/* 1. CONTEXT TOGGLE */}
            <div className="bg-slate-200/60 p-1 rounded-2xl flex mb-6 shrink-0">
                <button onClick={() => { setCurrentContext('work'); setActiveGroupId('all'); }} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all ${currentContext === 'work' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Briefcase size={16} /> Trabajo</button>
                <button onClick={() => { setCurrentContext('personal'); setActiveGroupId('all'); }} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all ${currentContext === 'personal' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Home size={16} /> Personal</button>
            </div>

            <div className="relative mb-6 shrink-0">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full bg-slate-200/50 pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
            </div>

            {/* 2. STANDARD FILTERS */}
            <div className="space-y-1 mb-6 shrink-0">
                <SidebarItem
                    icon={<Calendar size={18} />}
                    label="Hoy"
                    count={tasks.filter(t => {
                        // Apply same date logic as main filter
                        const today = new Date().toISOString().split('T')[0];
                        const taskDate = t.due;

                        let actualTaskDate;
                        if (taskDate === 'Hoy') {
                            actualTaskDate = today;
                        } else if (taskDate === 'Mañana') {
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            actualTaskDate = tomorrow.toISOString().split('T')[0];
                        } else {
                            actualTaskDate = taskDate;
                        }

                        const isToday = actualTaskDate === today;
                        const isOverdue = actualTaskDate < today;

                        return (isToday || isOverdue) &&
                            (t.status === 'pending' || t.status === 'blocked') &&
                            groups.find(g => g.id === t.groupId)?.type === currentContext;
                    }).length}
                    active={activeFilter === 'today'}
                    onClick={() => { setActiveFilter('today'); setViewMode('list'); }}
                />
                <SidebarItem
                    icon={<Clock size={18} />}
                    label="Programado"
                    count={tasks.filter(t => {
                        if (groups.find(g => g.id === t.groupId)?.type !== currentContext) return false;
                        if (t.status === 'upcoming') return true;
                        if (t.status !== 'pending') return false;

                        const today = new Date().toISOString().split('T')[0];
                        let date = t.due;
                        if (date === 'Hoy') date = today;
                        else if (date === 'Mañana') {
                            const d = new Date(); d.setDate(d.getDate() + 1);
                            date = d.toISOString().split('T')[0];
                        }
                        return date > today;
                    }).length}
                    active={activeFilter === 'scheduled'}
                    onClick={() => { setActiveFilter('scheduled'); setViewMode('list'); }}
                />
                <SidebarItem
                    icon={<AlertTriangle size={18} className="text-red-500" />}
                    label="Críticos"
                    count={tasks.filter(t => {
                        const taskGroup = groups.find(g => g.id === t.groupId);
                        if (!taskGroup || taskGroup.type !== currentContext) return false;
                        // Excluir tareas completadas
                        if (t.status === 'completed') return false;
                        // Incluir solo tareas críticas pendientes
                        return (t.priority === 'high' || t.category === 'Crítico' || t.status === 'overdue');
                    }).length}
                    active={activeFilter === 'critical'}
                    onClick={() => { setActiveFilter('critical'); setViewMode('list'); }}
                />
                <SidebarItem
                    icon={<ShieldCheck size={18} className="text-blue-500" />}
                    label="Para Validar (de otros)"
                    count={tasks.filter(t => t.status === 'waiting_validation' && !t.assignees.includes(currentUser?.id || 'user') && groups.find(g => g.id === t.groupId)?.type === currentContext).length}
                    active={activeFilter === 'validation'}
                    onClick={() => { setActiveFilter('validation'); setViewMode('list'); }}
                />
                <SidebarItem
                    icon={<Clock size={18} className="text-amber-500" />}
                    label="En Validación (tuyas)"
                    count={tasks.filter(t => t.status === 'waiting_validation' && t.assignees.includes(currentUser?.id || 'user') && groups.find(g => g.id === t.groupId)?.type === currentContext).length}
                    active={activeFilter === 'awaiting_validation'}
                    onClick={() => { setActiveFilter('awaiting_validation'); setViewMode('list'); }}
                />
                <SidebarItem
                    icon={<CheckCircle2 size={18} className="text-green-500" />}
                    label="Finalizados"
                    count={tasks.filter(t => t.status === 'completed' && groups.find(g => g.id === t.groupId)?.type === currentContext).length}
                    active={activeFilter === 'completed'}
                    onClick={() => { setActiveFilter('completed'); setViewMode('list'); }}
                />
            </div>

            {/* 3. DYNAMIC GROUP LIST (SCROLLABLE & SHRINKABLE) */}
            <div
                className={`overflow-y-auto pr-2 border-t border-slate-200 pt-4 transition-all duration-300 ease-in-out
        ${isSpacesExpanded ? 'flex-1 min-h-0' : 'shrink-0'}`}
            >
                <div className="space-y-1">
                    <div className="flex items-center justify-between px-3 mb-2 cursor-pointer hover:bg-slate-100 rounded-lg py-1" onClick={() => setIsSpacesExpanded(!isSpacesExpanded)}>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Tus Espacios {isSpacesExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowGroupModal(true); setGroupModalTab('create'); }}
                            className="text-slate-400 hover:text-blue-600 bg-white border border-slate-200 p-1 rounded-md transition-colors shadow-sm"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    {isSpacesExpanded && (
                        <div className="animate-in slide-in-from-top-2 duration-200 space-y-1">
                            <button onClick={() => setActiveGroupId('all')} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm font-medium ${activeGroupId === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-600 hover:bg-slate-200/50'}`}>
                                <div className="flex items-center gap-3"><LayoutGrid size={16} className={activeGroupId === 'all' ? (currentContext === 'work' ? 'text-blue-600' : 'text-emerald-600') : 'text-slate-400'} /><span>Vista Unificada</span></div>
                            </button>

                            {currentGroups.map(group => (
                                <div
                                    key={group.id}
                                    className="group relative flex items-center"
                                    onMouseEnter={(e) => e.currentTarget.classList.add('hover-state')}
                                    onMouseLeave={(e) => e.currentTarget.classList.remove('hover-state')}
                                >
                                    <button
                                        onClick={() => setActiveGroupId(group.id)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm font-medium ${activeGroupId === group.id ? 'bg-white shadow-sm text-slate-800' : 'text-slate-600 hover:bg-slate-200/50'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Folder size={16} className={activeGroupId === group.id ? (currentContext === 'work' ? 'text-blue-600 fill-blue-100' : 'text-emerald-600 fill-emerald-100') : 'text-slate-400'} />
                                            <span className="truncate w-36 text-left">{group.name}</span>
                                        </div>
                                    </button>
                                    <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1">
                                        {/* Botón para dejar grupo (si el usuario es miembro pero NO es el creador) */}
                                        {(group.members || []).includes(currentUser?.id || 'user') && group.creatorId !== currentUser?.id && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleLeaveGroup(group.id);
                                                }}
                                                className="p-1.5 rounded-md hover:bg-amber-50 active:bg-amber-100 text-slate-400 hover:text-amber-600 active:text-amber-700"
                                                title="Salir del espacio (el espacio seguirá existiendo)"
                                            >
                                                <UserMinus size={13} strokeWidth={2.5} />
                                            </button>
                                        )}
                                        {/* Botón para eliminar grupo (solo si es el creador) */}
                                        {group.creatorId === currentUser?.id && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`¿Eliminar completamente "${group.name}"? Esto eliminará el espacio y todas sus tareas.`)) {
                                                        handleDeleteGroup(group.id);
                                                    }
                                                }}
                                                className="p-1.5 rounded-md hover:bg-red-50 active:bg-red-100 text-slate-400 hover:text-red-500 active:text-red-600"
                                                title="Eliminar espacio permanentemente (solo creador)"
                                            >
                                                <X size={13} strokeWidth={2.5} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 4. INTELIGENCIA (EXPANDABLE) */}
            <div
                className={`mb-4 transition-all duration-300 border-t border-slate-200 pt-3 flex flex-col
        ${isIntelligenceExpanded ? 'flex-1 min-h-0' : 'mt-auto shrink-0'}`}
            >
                <div className="flex items-center justify-between px-2 mb-2 cursor-pointer shrink-0" onClick={toggleIntelligence}>
                    <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 hover:text-slate-600">
                            <Sparkles size={12} className={filteredSuggestions.length > 0 ? "text-blue-500" : "text-slate-400"} /> Inteligencia
                        </h3>
                        {!isIntelligenceExpanded && unreadNotifications > 0 && (
                            <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-sm border border-white"></span>
                        )}
                    </div>
                    <button className="text-slate-400 hover:text-slate-600">
                        {isIntelligenceExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                </div>

                {/* CONTENT */}
                <div className={`space-y-2 overflow-y-auto pr-1 custom-scrollbar ${isIntelligenceExpanded ? 'flex-1' : 'max-h-[0px] opacity-0 pointer-events-none'}`}>
                    {(() => {
                        return filteredSuggestions;
                    })().map(item => (
                        <div key={item.id} className={`p-3 rounded-xl shadow-sm border group hover:shadow-md transition-all cursor-pointer ${item.type === 'member_left' ? 'bg-slate-50 border-slate-200' : item.type === 'comment' ? 'bg-blue-50 border-blue-100' : item.type === 'mention' ? 'bg-purple-50 border-purple-100' : item.type?.startsWith('equipment_alert') ? 'bg-red-50 border-red-100' : item.type === 'system_alert' ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'} ${!item.read ? 'ring-1 ring-blue-200' : ''}`}>
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase flex items-center gap-1 ${item.type === 'member_left' ? 'text-slate-700 bg-slate-200' : item.type === 'comment' ? 'text-blue-700 bg-blue-100' : item.type === 'mention' ? 'text-purple-700 bg-purple-100' : item.type?.startsWith('equipment_alert') ? 'text-red-700 bg-red-100' : item.type === 'system_alert' ? 'text-amber-700 bg-amber-100' : 'text-blue-600 bg-blue-50'}`}>
                                    {item.type === 'member_left' ? <UserMinus size={8} /> :
                                        item.type === 'comment' ? <MessageSquare size={8} /> :
                                            item.type === 'mention' ? <Bell size={8} /> :
                                                item.type?.startsWith('equipment_alert') ? <Wrench size={8} /> :
                                                    item.type === 'system_alert' ? <AlertTriangle size={8} /> :
                                                        <Mail size={8} />}
                                    {item.type === 'member_left' ? 'Notificación' :
                                        item.type === 'comment' ? 'Comentario' :
                                            item.type === 'mention' ? 'Mención' :
                                                item.sender || 'Sistema'}
                                </span>
                                <button onClick={() => handleProcessSuggestion(item.id)} className="text-slate-300 hover:text-blue-600 transition-colors">
                                    {item.type === 'member_left' || item.type === 'comment' || item.type === 'mention' ? <X size={14} className="text-slate-500" /> :
                                        item.type?.startsWith('equipment_alert') ? <Eye size={14} className="text-red-600" /> :
                                            item.type === 'system_alert' ? <CalendarCheck size={14} className="text-amber-600" /> :
                                                item.type === 'validation_request' ? <CheckCircle size={14} className="text-green-600" /> :
                                                    <Plus size={14} />}
                                </button>
                            </div>
                            <p className="text-xs font-medium text-slate-700 truncate">{item.subject}</p>
                            {item.type === 'member_left' ? (
                                <p className="text-[10px] text-slate-500 mt-1">Espacio: {item.context}</p>
                            ) : (item.type === 'comment' || item.type === 'mention') ? (
                                <p className="text-[10px] text-slate-500 mt-1">{item.context}</p>
                            ) : item.type !== 'email' && (
                                <p className="text-[10px] opacity-80 mt-1">{item.context} • {item.suggestedAction}</p>
                            )}
                        </div>
                    ))}
                    {filteredSuggestions.length === 0 && <div className="text-xs text-slate-300 text-center italic p-2">Sin novedades en este contexto.</div>}
                </div>

                {!isIntelligenceExpanded && unreadNotifications > 0 && (
                    <div className="px-2 text-[10px] text-slate-500 truncate flex items-center gap-1 shrink-0 h-6">
                        <span className="font-bold text-blue-600">{unreadNotifications}</span> {unreadNotifications === 1 ? 'notificación' : 'notificaciones'} pendiente{unreadNotifications > 1 ? 's' : ''}.
                    </div>
                )}
            </div>

            {/* UTILS */}
            <div className="mt-2 space-y-2 pt-2 border-t border-slate-200 shrink-0">
                <div className="flex gap-2 mb-2">
                    <button onClick={handleScanQR} className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 py-2 rounded-lg text-xs font-bold text-slate-600 transition-colors"><QrCode size={14} /> Escanear</button>
                    <button onClick={() => setShowSettings(true)} className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 py-2 rounded-lg text-xs font-bold text-slate-600 transition-colors"><Settings size={14} /> Ajustes</button>
                </div>
                {onCreateResource && (
                    <button 
                        onClick={onCreateResource}
                        className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 rounded-xl transition-all font-bold text-sm shadow-lg"
                    >
                        <FolderPlus size={16} />
                        <span>Crear Recurso</span>
                    </button>
                )}
                <button onClick={() => setShowEndDay(true)} className="flex items-center justify-center gap-2 w-full text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-2.5 rounded-xl transition-all font-bold text-sm"><Moon size={16} /><span>Terminar el día</span></button>
            </div>

            {/* 5. USER PROFILE & LOGOUT */}
            <div className="mt-auto pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-200/50 transition-colors group cursor-pointer">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                            <span style={{ fontSize: '1.125rem', lineHeight: '1', fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>
                                {currentUser?.avatar}
                            </span>
                        </div>
                        <div className="text-left">
                            <div className="text-sm font-bold text-slate-800">{currentUser?.name || currentUser?.username || 'Usuario'}</div>
                            <div className="text-[10px] font-medium text-slate-400">Online</div>
                        </div>
                    </div>
                    <button onClick={onLogout} className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all" title="Cerrar Sesión">
                        <LogOut size={16} />
                    </button>
                </div>
            </div>

        </aside>
    );
};

export default Sidebar;
