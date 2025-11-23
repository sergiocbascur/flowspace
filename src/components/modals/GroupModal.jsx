import React from 'react';
import { UserPlus, LogIn, Plus, X, ChevronDown, ScanLine, Copy, Share2 } from 'lucide-react';

const QRCodeDisplay = ({ code }) => {
    return (
        <div className="qr-code-display">
            <div className="text-4xl font-mono font-bold tracking-wider">{code}</div>
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
            className={`${isMobile ? 'fixed' : 'absolute'} inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[80] p-4`}
            style={{ display: 'flex', position: isMobile ? 'fixed' : 'absolute' }}
        >
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        {activeTab === 'invite' && <UserPlus size={20} />}
                        {activeTab === 'join' && <LogIn size={20} />}
                        {activeTab === 'create' && <Plus size={20} />}
                        {activeTab === 'invite' ? 'Invitar a Equipo' : activeTab === 'join' ? 'Unirse a Equipo' : 'Nuevo Equipo'}
                    </h2>
                    <button onClick={onClose}>
                        <X size={24} className="text-slate-400 hover:text-slate-600" />
                    </button>
                </div>

                <div className="flex border-b border-slate-100">
                    <button
                        onClick={() => { setActiveTab('invite'); setNewGroupName(''); }}
                        className={`flex-1 py-3 text-sm font-bold ${activeTab === 'invite' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Invitar
                    </button>
                    <button
                        onClick={() => { setActiveTab('join'); setNewGroupName(''); }}
                        className={`flex-1 py-3 text-sm font-bold ${activeTab === 'join' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Unirse
                    </button>
                    <button
                        onClick={() => { setActiveTab('create'); setNewGroupName(''); }}
                        className={`flex-1 py-3 text-sm font-bold ${activeTab === 'create' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Crear
                    </button>
                </div>

                <div className="p-6 overflow-y-auto bg-white flex-1 text-center">
                    {activeTab === 'invite' && (
                        <div className="space-y-6">
                            <div className="text-left">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">¿A qué espacio invitas?</label>
                                <div className="relative">
                                    <select
                                        value={inviteSelectedGroup}
                                        onChange={(e) => setInviteSelectedGroup(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-3 font-medium outline-none focus:border-blue-500 appearance-none"
                                    >
                                        {currentGroups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1 pl-1">
                                    Mostrando solo grupos de {currentContext === 'work' ? 'Trabajo' : 'Personal'}.
                                </p>
                            </div>
                            <div className="bg-white p-4 border-2 border-slate-100 rounded-2xl inline-block shadow-sm">
                                <QRCodeDisplay code={getInviteGroupInfo().code || '---'} />
                            </div>
                            <div className="bg-slate-100 rounded-xl p-3 flex items-center justify-between">
                                <div className="text-left">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Código</span>
                                    <span className="font-mono text-xl font-bold text-slate-800 tracking-widest">
                                        {getInviteGroupInfo().code || '---'}
                                    </span>
                                </div>
                                <button className="p-2 bg-white rounded-lg shadow-sm hover:text-blue-600 active:scale-95 transition-all">
                                    <Copy size={20} />
                                </button>
                            </div>
                            <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2">
                                <Share2 size={18} /> Compartir Enlace
                            </button>
                        </div>
                    )}

                    {activeTab === 'join' && (
                        <div className="space-y-6 py-4">
                            <div className="space-y-3">
                                <button
                                    onClick={onScanQR}
                                    className="w-full py-4 border-2 border-blue-100 bg-blue-50 text-blue-700 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 hover:bg-blue-100 hover:border-blue-200 transition-all"
                                >
                                    <ScanLine size={32} /> Escanear Código QR
                                </button>
                                <div className="relative flex items-center justify-center">
                                    <div className="border-t border-slate-200 w-full absolute"></div>
                                    <span className="bg-white px-2 text-xs text-slate-400 font-medium relative z-10">
                                        O ingresa el código
                                    </span>
                                </div>
                                <input
                                    type="text"
                                    value={joinCodeInput}
                                    onChange={(e) => setJoinCodeInput(e.target.value)}
                                    placeholder="Ej: LAB-9921"
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-center font-mono text-lg tracking-widest uppercase focus:border-blue-500 outline-none"
                                />
                            </div>
                            <button
                                onClick={onJoinGroup}
                                disabled={!joinCodeInput.trim()}
                                className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                Unirse al Equipo
                            </button>
                        </div>
                    )}

                    {activeTab === 'create' && (
                        <div className="space-y-4 py-4">
                            <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Plus size={40} className="text-blue-500" />
                            </div>
                            <h3 className="font-bold text-lg text-slate-700">Crear nuevo espacio</h3>
                            <input
                                type="text"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                placeholder="Nombre del espacio"
                                className="w-full border border-slate-200 rounded-xl p-3 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        onCreateGroup();
                                    }
                                }}
                                autoFocus
                            />
                            <button
                                onClick={onCreateGroup}
                                disabled={!newGroupName.trim()}
                                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
