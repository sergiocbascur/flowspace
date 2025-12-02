import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Users, User, TrendingUp, Flame, Target, Star, Crown, UserPlus } from 'lucide-react';
import { apiRankings } from '../apiService';
import AddContactModal from './modals/AddContactModal';

const badgeIcons = {
    'first_task': { icon: Star, color: 'text-yellow-500', label: 'Primera Tarea' },
    'task_master_10': { icon: Award, color: 'text-blue-500', label: '10 Tareas' },
    'task_master_50': { icon: Medal, color: 'text-purple-500', label: '50 Tareas' },
    'task_master_100': { icon: Trophy, color: 'text-amber-500', label: '100 Tareas' },
    'streak_7': { icon: Flame, color: 'text-orange-500', label: 'Racha 7 días' },
    'streak_30': { icon: Flame, color: 'text-red-500', label: 'Racha 30 días' },
    'points_1000': { icon: Target, color: 'text-green-500', label: '1000 Puntos' },
    'points_5000': { icon: Crown, color: 'text-yellow-600', label: '5000 Puntos' },
    'perfectionist': { icon: Star, color: 'text-purple-600', label: 'Perfeccionista' }
};

const RankingsView = ({ currentUser, onClose, isMobile, toast }) => {
    const [activeTab, setActiveTab] = useState('global'); // 'global', 'group', 'contacts'
    const [globalRankings, setGlobalRankings] = useState([]);
    const [contactsRankings, setContactsRankings] = useState([]);
    const [myPosition, setMyPosition] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeGroupId, setActiveGroupId] = useState(null);
    const [showAddContactModal, setShowAddContactModal] = useState(false);
    const [showHistoryChart, setShowHistoryChart] = useState(false);
    const [selectedUserForComparison, setSelectedUserForComparison] = useState(null);
    const [showChallenges, setShowChallenges] = useState(false);

    useEffect(() => {
        loadRankings();
        loadMyPosition();
    }, [activeTab]);

    const loadRankings = async () => {
        setLoading(true);
        try {
            if (activeTab === 'global') {
                const result = await apiRankings.getGlobal(50, 0);
                if (result.success) {
                    setGlobalRankings(result.rankings || []);
                }
            } else if (activeTab === 'contacts') {
                const result = await apiRankings.getContacts();
                if (result.success) {
                    setContactsRankings(result.rankings || []);
                }
            }
        } catch (error) {
            console.error('Error cargando rankings:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMyPosition = async () => {
        try {
            const result = await apiRankings.getMyPosition();
            if (result.success) {
                setMyPosition(result.position);
            }
        } catch (error) {
            console.error('Error cargando posición:', error);
        }
    };

    const getRankIcon = (rank) => {
        if (rank === 1) return <Crown className="text-yellow-500" size={20} />;
        if (rank === 2) return <Medal className="text-slate-400" size={20} />;
        if (rank === 3) return <Medal className="text-amber-600" size={20} />;
        return <span className="text-slate-400 font-bold text-sm">#{rank}</span>;
    };

    const renderRankingItem = (user, index) => {
        const rank = index + 1;
        const isCurrentUser = user.userId === currentUser?.id;
        
        return (
            <div
                key={user.userId}
                className={`group flex items-center gap-4 p-4 rounded-xl transition-all ${
                    isCurrentUser 
                        ? 'bg-blue-50 border-2 border-blue-200 shadow-sm' 
                        : 'bg-white border border-slate-100 hover:shadow-md'
                }`}
            >
                <div className="flex-shrink-0 w-10 flex items-center justify-center">
                    {getRankIcon(rank)}
                </div>
                
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0">
                    <span style={{ fontSize: '1.5rem', lineHeight: '1', fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>
                        {user.avatar || '👤'}
                    </span>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`font-semibold text-slate-900 truncate ${isCurrentUser ? 'text-blue-700' : ''}`}>
                            {user.name || user.username}
                        </span>
                        {isCurrentUser && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                Tú
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-bold text-slate-700">
                            {user.totalPoints || user.points || 0} pts
                        </span>
                        {user.tasksCompleted !== undefined && (
                            <span className="text-xs text-slate-500">
                                {user.tasksCompleted} tareas
                            </span>
                        )}
                        {user.currentStreak > 0 && (
                            <span className="text-xs text-orange-600 flex items-center gap-1">
                                <Flame size={12} />
                                {user.currentStreak} días
                            </span>
                        )}
                    </div>
                </div>

                {user.badges && user.badges.length > 0 && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {user.badges.slice(0, 3).map((badge, idx) => {
                            const badgeInfo = badgeIcons[badge];
                            if (!badgeInfo) return null;
                            const Icon = badgeInfo.icon;
                            return (
                                <div key={idx} className="relative group">
                                    <Icon className={badgeInfo.color} size={20} />
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                        {badgeInfo.label}
                                    </div>
                                </div>
                            );
                        })}
                        {user.badges.length > 3 && (
                            <span className="text-xs text-slate-400">+{user.badges.length - 3}</span>
                        )}
                    </div>
                )}
                
                {/* Botón de comparar (solo para contactos y no para el usuario actual) */}
                {activeTab === 'contacts' && !isCurrentUser && (
                    <button
                        onClick={() => setSelectedUserForComparison(user.userId)}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-blue-50 rounded-lg transition-all"
                        title="Comparar con este usuario"
                    >
                        <GitCompare size={16} className="text-blue-600" />
                    </button>
                )}
            </div>
        );
    };

    const currentRankings = activeTab === 'global' ? globalRankings : contactsRankings;

    return (
        <div className={`${isMobile ? 'fixed inset-0 z-50' : 'rounded-2xl'} bg-white flex flex-col overflow-hidden shadow-xl`}>
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-between border-b border-white/20">
                <div className="flex items-center gap-3">
                    <Trophy size={24} />
                    <h2 className="text-xl font-bold">Rankings</h2>
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

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50">
                <button
                    onClick={() => setActiveTab('global')}
                    className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                        activeTab === 'global'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Users size={16} />
                        Global
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('contacts')}
                    className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                        activeTab === 'contacts'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <User size={16} />
                        Contactos
                    </div>
                </button>
                <button
                    onClick={() => setShowChallenges(true)}
                    className="px-4 py-3 text-sm font-semibold text-purple-600 hover:bg-purple-50 transition-colors flex items-center gap-2 border-l border-slate-200"
                    title="Ver desafíos"
                >
                    <Target size={16} />
                </button>
                {activeTab === 'contacts' && (
                    <button
                        onClick={() => setShowAddContactModal(true)}
                        className="px-4 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2 border-l border-slate-200"
                        title="Agregar contacto"
                    >
                        <UserPlus size={16} />
                    </button>
                )}
            </div>

            {/* My Position Card */}
            {myPosition && (
                <div className="mx-4 mt-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-700">Tu Posición</span>
                        <div className="flex items-center gap-2">
                            {myPosition.rank && (
                                <span className="text-lg font-bold text-blue-600">#{myPosition.rank}</span>
                            )}
                            <button
                                onClick={() => setShowHistoryChart(!showHistoryChart)}
                                className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Ver gráfico de evolución"
                            >
                                <BarChart3 size={16} className="text-blue-600" />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div>
                            <div className="text-2xl font-bold text-slate-900">{myPosition.totalPoints}</div>
                            <div className="text-xs text-slate-500">puntos</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900">{myPosition.tasksCompleted}</div>
                            <div className="text-xs text-slate-500">tareas</div>
                        </div>
                        {myPosition.currentStreak > 0 && (
                            <div>
                                <div className="text-2xl font-bold text-orange-600 flex items-center gap-1">
                                    <Flame size={20} />
                                    {myPosition.currentStreak}
                                </div>
                                <div className="text-xs text-slate-500">días racha</div>
                            </div>
                        )}
                    </div>
                    {myPosition.badges && myPosition.badges.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                            <div className="text-xs text-slate-600 font-medium mb-2">Badges:</div>
                            <div className="flex items-center gap-2 flex-wrap">
                                {myPosition.badges.map((badge, idx) => {
                                    const badgeInfo = badgeIcons[badge];
                                    if (!badgeInfo) return null;
                                    const Icon = badgeInfo.icon;
                                    return (
                                        <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg border border-slate-200">
                                            <Icon className={badgeInfo.color} size={14} />
                                            <span className="text-xs text-slate-700">{badgeInfo.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Gráfico de Evolución */}
            {showHistoryChart && (
                <div className="mx-4 mb-4">
                    <PointsHistoryChart currentUser={currentUser} days={30} />
                </div>
            )}

            {/* Rankings List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : currentRankings.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <Users size={48} className="mx-auto mb-3 opacity-50" />
                        <p className="text-sm font-medium">
                            {activeTab === 'contacts' 
                                ? 'Agrega contactos para ver rankings entre amigos'
                                : 'No hay rankings disponibles'
                            }
                        </p>
                    </div>
                ) : (
                    currentRankings.map((user, index) => renderRankingItem(user, index))
                )}
            </div>

            {/* Add Contact Modal */}
            <AddContactModal
                isOpen={showAddContactModal}
                onClose={() => setShowAddContactModal(false)}
                toast={toast}
                currentUser={currentUser}
            />

            {/* User Comparison Modal */}
            {selectedUserForComparison && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <UserComparison
                            currentUser={currentUser}
                            otherUserId={selectedUserForComparison}
                            onClose={() => setSelectedUserForComparison(null)}
                        />
                    </div>
                </div>
            )}

            {/* Challenges Modal */}
            {showChallenges && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className={`${isMobile ? 'w-full h-full' : 'w-full max-w-2xl max-h-[90vh]'} bg-white rounded-2xl shadow-xl overflow-hidden`}>
                        <ChallengesView
                            currentUser={currentUser}
                            onClose={() => setShowChallenges(false)}
                            isMobile={isMobile}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default RankingsView;

