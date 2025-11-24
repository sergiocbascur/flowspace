import React from 'react';
import { UserPlus, LogIn, Plus, X, ChevronDown, ScanLine, Copy, Share2, QrCode } from 'lucide-react';

const QRCodeDisplay = ({ code }) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(code)}`;
    return (
        <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                <img src={qrUrl} alt={`QR Code: ${code}`} className="w-40 h-40 mix-blend-multiply opacity-90" />
            </div>
        </div>
    );
};

const GroupModal = ({
    isOpen,
    onClose,
    activeTab,
    setActiveTab,
    currentContext,
    groups,
    inviteSelectedGroup,
    setInviteSelectedGroup,
    newGroupName,
    setNewGroupName,
    joinCodeInput,
    setJoinCodeInput,
    onCreateGroup,
    onJoinGroup,
    onScanQR,
    isMobile
}) => {
    if (!isOpen) return null;

    const currentGroups = groups.filter(g => g.type === currentContext);

    const getInviteGroupInfo = () => {
        return groups.find(g => g.id === inviteSelectedGroup) || { code: '---', name: 'Grupo' };
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
                animation: 'fadeIn 0.3s ease-out'
            }}
        >
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>

            <div
                className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                style={{
                    animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.5) inset'
                }}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-200/60 flex justify-between items-center bg-white/50">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        {activeTab === 'invite' && <UserPlus size={22} className="text-blue-500" />}
                        {activeTab === 'join' && <LogIn size={22} className="text-blue-500" />}
                        {activeTab === 'create' && <Plus size={22} className="text-blue-500" />}
                        {activeTab === 'invite' ? 'Invitar Miembros' : activeTab === 'join' ? 'Unirse a Equipo' : 'Nuevo Espacio'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Segmented Control */}
                <div className="p-4 pb-0">
                    <div className="flex bg-slate-100/80 p-1 rounded-xl">
                        {[
                            { id: 'invite', label: 'Invitar' },
                            { id: 'join', label: 'Unirse' },
                            { id: 'create', label: 'Crear' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setNewGroupName(''); }}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === tab.id
                                        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {activeTab === 'invite' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Espacio a compartir</label>
                                <div className="relative">
                                    <select
                                        value={inviteSelectedGroup}
                                        onChange={(e) => setInviteSelectedGroup(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all"
                                    >
                                        {currentGroups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            <div className="flex flex-col items-center justify-center py-2">
                                <QRCodeDisplay code={getInviteGroupInfo().code || '---'} />
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-colors">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">CÓDIGO DE ACCESO</span>
                                    <span className="font-mono text-2xl font-bold text-slate-900 tracking-widest">
                                        {getInviteGroupInfo().code || '---'}
                                    </span>
                                </div>
                                <button
                                    className="p-3 bg-white rounded-xl shadow-sm text-slate-400 hover:text-blue-600 hover:shadow-md transition-all active:scale-95"
                                    onClick={() => {
                                        navigator.clipboard.writeText(getInviteGroupInfo().code);
                                        // Optional: Add toast notification here
                                    }}
                                >
                                    <Copy size={20} />
                                </button>
                            </div>

                            <button className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2">
                                <Share2 size={18} /> Compartir Enlace
                            </button>
                        </div>
                    )}

                    {activeTab === 'join' && (
                        <div className="space-y-6 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <button
                                onClick={onScanQR}
                                className="w-full py-8 border-2 border-dashed border-blue-200 bg-blue-50/50 text-blue-600 rounded-3xl font-bold flex flex-col items-center justify-center gap-3 hover:bg-blue-50 hover:border-blue-300 transition-all group"
                            >
                                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    <QrCode size={32} />
                                </div>
                                <span>Escanear Código QR</span>
                            </button>

                            <div className="relative flex items-center justify-center">
                                <div className="border-t border-slate-200 w-full absolute"></div>
                                <span className="bg-white/90 px-3 text-xs text-slate-400 font-medium relative z-10 uppercase tracking-wider">
                                    o ingresa manual
                                </span>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Código del Espacio</label>
                                <input
                                    type="text"
                                    value={joinCodeInput}
                                    onChange={(e) => setJoinCodeInput(e.target.value)}
                                    placeholder="Ej: LAB-9921"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-center font-mono text-xl tracking-[0.2em] uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:tracking-normal"
                                />
                            </div>

                            <button
                                onClick={onJoinGroup}
                                disabled={!joinCodeInput.trim()}
                                className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
                            >
                                Unirse al Equipo
                            </button>
                        </div>
                    )}

                    {activeTab === 'create' && (
                        <div className="space-y-6 py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex flex-col items-center justify-center gap-4">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/30 mb-2">
                                    <Plus size={48} className="text-white" />
                                </div>
                                <div className="text-center space-y-1">
                                    <h3 className="font-bold text-xl text-slate-900">Crear nuevo espacio</h3>
                                    <p className="text-sm text-slate-500">Organiza tus tareas y equipo en un nuevo lugar</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nombre del Espacio</label>
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="Ej: Laboratorio Central"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-center text-lg font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            onCreateGroup();
                                        }
                                    }}
                                    autoFocus
                                />
                            </div>

                            <button
                                onClick={onCreateGroup}
                                disabled={!newGroupName.trim()}
                                className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25 active:scale-95"
                            >
                                Crear Espacio
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GroupModal;
