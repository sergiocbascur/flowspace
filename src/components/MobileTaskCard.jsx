import React, { useState, useRef, useEffect } from 'react';
import {
    Flag, Lock, Eye, CheckCircle2, Ban, Clock, MessageSquare, Trash2
} from 'lucide-react';

const MobileTaskCard = ({
    task,
    team,
    categories,
    onToggle,
    isOverdue,
    isBlocked,
    completed,
    onUnblock,
    onAddComment,
    onReadComments,
    isChatOpen,
    onToggleChat,
    currentUser,
    onDelete
}) => {
    const [swipeX, setSwipeX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const [showDeleteButton, setShowDeleteButton] = useState(false);
    const startX = useRef(0);
    const cardRef = useRef(null);

    const SWIPE_THRESHOLD = -80; // Pixels to swipe left to show delete

    const handleTouchStart = (e) => {
        startX.current = e.touches[0].clientX;
        setIsSwiping(true);
    };

    const handleTouchMove = (e) => {
        if (!isSwiping) return;

        const currentX = e.touches[0].clientX;
        const diff = currentX - startX.current;

        // Only allow left swipe (negative diff) and only if user is creator
        if (diff < 0 && task.creatorId === currentUser?.id && onDelete) {
            setSwipeX(Math.max(diff, SWIPE_THRESHOLD * 1.5));
        }
    };

    const handleTouchEnd = () => {
        setIsSwiping(false);

        if (swipeX < SWIPE_THRESHOLD) {
            // Show delete button
            setSwipeX(SWIPE_THRESHOLD);
            setShowDeleteButton(true);
        } else {
            // Reset
            setSwipeX(0);
            setShowDeleteButton(false);
        }
    };

    const handleDelete = () => {
        if (confirm(`¿Eliminar la tarea "${task.title}"? Esta acción no se puede deshacer.`)) {
            onDelete(task.id);
        }
        // Reset swipe
        setSwipeX(0);
        setShowDeleteButton(false);
    };

    const handleCardClick = () => {
        if (showDeleteButton) {
            // If delete button is showing, reset instead of toggling
            setSwipeX(0);
            setShowDeleteButton(false);
        } else {
            onToggle();
        }
    };

    const priorityIcon = {
        high: <Flag size={12} className="text-red-500 fill-red-500" />,
        medium: <Flag size={12} className="text-amber-500 fill-amber-500" />,
        low: null
    }[task.priority || 'low'];

    const getAssigneeAvatar = (id) => {
        const member = team.find(m => m.id === id);
        return member ? member.avatar : '?';
    };

    const getAssigneeName = (id) => {
        const member = team.find(m => m.id === id);
        return member ? (member.name || member.username || id) : id;
    };

    const categoryStyle = categories.find(c => c.name === task.category)?.color || 'bg-slate-100 text-slate-600';

    let mainActionButton;
    if (isBlocked) {
        mainActionButton = (
            <button
                onClick={(e) => { e.stopPropagation(); onUnblock(); }}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-white bg-red-400 rounded-full active:bg-red-500 transition-colors shadow-sm"
            >
                <Lock size={16} />
            </button>
        );
    } else if (task.status === 'waiting_validation') {
        const isCreator = task.creatorId === currentUser?.id;
        const colorClass = isCreator
            ? 'text-purple-600 bg-purple-100 border-purple-200 active:bg-purple-200'
            : 'text-amber-600 bg-amber-100 border-amber-200 active:bg-amber-200';

        mainActionButton = (
            <button
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                className={`flex-shrink-0 w-10 h-10 flex items-center justify-center border-2 rounded-full transition-colors ${colorClass}`}
            >
                <Eye size={18} />
            </button>
        );
    } else {
        mainActionButton = (
            <button
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${completed
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : isOverdue
                            ? 'border-red-400 text-red-400 active:bg-red-50'
                            : 'border-slate-300 text-transparent active:border-blue-400'
                    }`}
            >
                <CheckCircle2 size={20} className={completed ? 'opacity-100' : 'opacity-0'} />
            </button>
        );
    }

    return (
        <div className="relative overflow-hidden">
            {/* Delete button background */}
            {showDeleteButton && (
                <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center">
                    <button
                        onClick={handleDelete}
                        className="w-full h-full flex items-center justify-center text-white active:bg-red-600"
                    >
                        <Trash2 size={24} />
                    </button>
                </div>
            )}

            {/* Main card */}
            <div
                ref={cardRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={handleCardClick}
                style={{
                    transform: `translateX(${swipeX}px)`,
                    transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
                }}
                className={`bg-white rounded-xl border transition-all active:scale-[0.98] ${isOverdue
                        ? 'border-red-200 bg-red-50/30'
                        : isBlocked
                            ? 'border-red-100 bg-red-50/50'
                            : 'border-slate-100'
                    } ${completed ? 'opacity-50' : ''}`}
            >
                <div className="flex items-center gap-3 p-4">
                    {mainActionButton}

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-medium truncate ${completed
                                    ? 'line-through text-slate-400'
                                    : isBlocked
                                        ? 'text-slate-600'
                                        : 'text-slate-800'
                                }`}>
                                {task.title}
                            </span>
                            {priorityIcon}
                            {isOverdue && (
                                <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded uppercase">
                                    Vencido
                                </span>
                            )}
                            {isBlocked && (
                                <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded uppercase flex items-center gap-1 max-w-[120px] truncate">
                                    <Ban size={10} /> {task.blockReason || "Bloqueado"}
                                </span>
                            )}
                            {task.status === 'waiting_validation' && (() => {
                                const isCreator = task.creatorId === currentUser?.id;
                                const badgeClass = isCreator
                                    ? 'text-purple-600 bg-purple-100'
                                    : 'text-amber-600 bg-amber-100';
                                const badgeText = isCreator ? 'Por Validar' : 'En Validación';
                                return (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${badgeClass}`}>
                                        {badgeText}
                                    </span>
                                );
                            })()}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className={`px-1.5 py-0.5 rounded font-medium ${categoryStyle}`}>
                                {task.category}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock size={10} /> {task.due} {task.time && `• ${task.time}`}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleChat(task.id); }}
                            className={`relative p-2 rounded-lg border transition-all ${task.unreadComments > 0
                                    ? 'border-green-500 text-green-500 bg-white'
                                    : task.comments.length > 0
                                        ? 'border-green-500 text-green-500 bg-white'
                                        : 'border-slate-200 text-slate-400 active:border-slate-300 active:text-slate-500 bg-white'
                                }`}
                        >
                            <MessageSquare size={16} fill="none" strokeWidth={2} />
                            {task.unreadComments > 0 && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                            )}
                        </button>
                        <div className="flex -space-x-2">
                            {task.assignees.slice(0, 2).map((assigneeId, index) => (
                                <div
                                    key={index}
                                    className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs border-2 border-white shadow-sm"
                                    title={getAssigneeName(assigneeId)}
                                >
                                    <span style={{ fontSize: '1rem', lineHeight: '1', fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>
                                        {getAssigneeAvatar(assigneeId)}
                                    </span>
                                </div>
                            ))}
                            {task.assignees.length > 2 && (
                                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600 border-2 border-white shadow-sm">
                                    +{task.assignees.length - 2}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileTaskCard;
