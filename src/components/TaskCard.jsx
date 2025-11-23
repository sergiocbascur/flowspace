import React, { useState } from 'react';
import {
    Flag, Lock, Eye, CheckCircle2, Ban, Clock, MessageSquare, Check, Send
} from 'lucide-react';

const TaskCard = ({
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
    onToggleChat
}) => {
    const [commentInput, setCommentInput] = useState('');
    const [showUnlockUI, setShowUnlockUI] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionPosition, setMentionPosition] = useState(null);
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
    const [showAllComments, setShowAllComments] = useState(false);

    // Obtener usuarios asignados a la tarea para el autocompletado de menciones
    const assignedMembers = task.assignees
        .map(assigneeId => team.find(m => m.id === assigneeId))
        .filter(Boolean);

    // Filtrar usuarios para el autocompletado basado en la query
    const filteredMentions = mentionQuery
        ? assignedMembers.filter(member => {
            const name = (member.name || member.username || '').toLowerCase();
            const username = (member.username || '').toLowerCase();
            const query = mentionQuery.toLowerCase();
            return name.includes(query) || username.includes(query);
        })
        : assignedMembers;

    const handleSubmitComment = () => {
        onAddComment(task.id, commentInput);
        setCommentInput('');
        setMentionQuery('');
        setMentionPosition(null);
    };

    const handleCommentInputChange = (e) => {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart;

        // Buscar si hay un @ o ! antes del cursor
        const textBeforeCursor = value.substring(0, cursorPos);
        const mentionMatch = textBeforeCursor.match(/([@!])(\w*)$/);

        if (mentionMatch) {
            const [fullMatch, symbol, query] = mentionMatch;
            const startPos = cursorPos - fullMatch.length;
            setMentionQuery(query);
            setMentionPosition({ start: startPos, end: cursorPos });
            setSelectedMentionIndex(0);
        } else {
            setMentionQuery('');
            setMentionPosition(null);
        }

        setCommentInput(value);
    };

    const handleMentionSelect = (member) => {
        if (!mentionPosition) return;

        const before = commentInput.substring(0, mentionPosition.start);
        const after = commentInput.substring(mentionPosition.end);
        const mentionText = `@${member.name || member.username}`;
        const newText = before + mentionText + ' ' + after;

        setCommentInput(newText);
        setMentionQuery('');
        setMentionPosition(null);

        // Enfocar el input y colocar el cursor después de la mención
        setTimeout(() => {
            const input = document.querySelector(`[data-task-id="${task.id}"] input[type="text"]`);
            if (input) {
                const newCursorPos = before.length + mentionText.length + 1;
                input.focus();
                input.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };

    const handleCommentKeyDown = (e) => {
        if (mentionPosition && filteredMentions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedMentionIndex(prev => (prev + 1) % filteredMentions.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedMentionIndex(prev => (prev - 1 + filteredMentions.length) % filteredMentions.length);
            } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleMentionSelect(filteredMentions[selectedMentionIndex]);
            } else if (e.key === 'Escape') {
                setMentionQuery('');
                setMentionPosition(null);
            } else if (e.key === 'Tab') {
                e.preventDefault();
                handleMentionSelect(filteredMentions[selectedMentionIndex]);
            }
        } else if (e.key === 'Enter' && !e.shiftKey) {
            handleSubmitComment();
        }
    };

    const handleToggleComments = (e) => {
        e.stopPropagation(); // Evitar que se propague el evento
        const willShow = !isChatOpen;

        // Llamar a la función prop para alternar el chat
        onToggleChat(task.id);

        // Si vamos a abrir el chat y hay comentarios no leídos, marcarlos como leídos
        // Usar setTimeout para que el estado se actualice primero
        if (willShow && task.unreadComments > 0 && onReadComments) {
            setTimeout(() => {
                onReadComments(task.id);
            }, 50);
        }
    };

    const priorityIcon = { high: <Flag size={12} className="text-red-500 fill-red-500" />, medium: <Flag size={12} className="text-amber-500 fill-amber-500" />, low: null }[task.priority || 'low'];
    const getAssigneeAvatar = (id) => {
        const member = team.find(m => m.id === id);
        return member ? member.avatar : '?';
    };
    const getAssigneeName = (id) => {
        const member = team.find(m => m.id === id);
        return member ? (member.name || member.username || id) : id;
    };
    const getChatButtonStyle = () => {
        if (task.unreadComments > 0) return 'border-green-500 text-green-500 bg-white';
        if (task.comments.length > 0) return 'border-green-500 text-green-500 bg-white';
        return 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-500 bg-white';
    };
    const categoryStyle = categories.find(c => c.name === task.category)?.color || 'bg-slate-100 text-slate-600';

    let mainActionButton;
    if (isBlocked) {
        mainActionButton = (
            <button onClick={() => setShowUnlockUI(!showUnlockUI)} className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-white bg-red-400 rounded-full hover:bg-red-500 transition-colors shadow-sm" title="Bloqueado. Click para ver opciones.">
                <Lock size={12} />
            </button>
        );
    } else if (task.status === 'waiting_validation') {
        mainActionButton = (
            <button onClick={onToggle} className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-amber-600 bg-amber-100 border-2 border-amber-200 rounded-full hover:bg-amber-200 transition-colors" title="Esperando Validación">
                <Eye size={14} />
            </button>
        );
    } else {
        mainActionButton = (
            <button onClick={onToggle} className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${completed ? 'bg-blue-500 border-blue-500 text-white' : isOverdue ? 'border-red-400 text-red-400 hover:bg-red-50' : 'border-slate-300 text-transparent hover:border-blue-400'}`}>
                <CheckCircle2 size={16} className={completed ? 'opacity-100' : 'opacity-0'} />
            </button>
        );
    }

    return (
        <div
            data-task-id={task.id}
            className={`group bg-white rounded-xl border transition-all hover:shadow-md overflow-hidden ${isOverdue ? 'border-red-200 bg-red-50/30' : isBlocked ? 'border-red-100 bg-red-50/50' : 'border-slate-100'} ${completed ? 'opacity-50' : ''}`}
        >
            <div className="flex items-center gap-3 p-4">
                {mainActionButton}

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-sm font-medium truncate ${completed ? 'line-through text-slate-400' : isBlocked ? 'text-slate-600' : 'text-slate-800'}`}>{task.title}</span>
                        {priorityIcon}
                        {isOverdue && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded uppercase">Vencido</span>}
                        {isBlocked && (<span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded uppercase flex items-center gap-1 max-w-[150px] truncate"><Ban size={10} /> {task.blockReason || "Bloqueado"}</span>)}
                        {task.status === 'waiting_validation' && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded uppercase flex items-center gap-1">Por Validar</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className={`px-1.5 py-0.5 rounded font-medium ${categoryStyle}`}>{task.category}</span>
                        <span className="flex items-center gap-1"><Clock size={10} /> {task.due} {task.time && `• ${task.time}`}</span>
                        {task.postponeCount > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded flex items-center gap-0.5">+{task.postponeCount} días</span>}
                    </div>
                </div>

                <div className="flex items-center gap-2 pl-2 border-l border-slate-100">
                    <button onClick={handleToggleComments} className={`relative p-1.5 rounded-lg border transition-all ${getChatButtonStyle()}`}><MessageSquare size={16} fill="none" strokeWidth={2} />{task.unreadComments > 0 && (<span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>)}</button>
                    <div className="flex -space-x-2 overflow-hidden">{task.assignees.map((assigneeId, index) => (<div key={index} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs border-2 border-white shadow-sm" title={getAssigneeName(assigneeId)}><span style={{ fontSize: '1rem', lineHeight: '1', fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>{getAssigneeAvatar(assigneeId)}</span></div>))}</div>
                </div>
            </div>

            {/* UI DE DESBLOQUEO CON SUBTAREA */}
            {showUnlockUI && isBlocked && (
                <div className="bg-red-50 px-4 py-3 border-t border-red-100 animate-in slide-in-from-top-2">
                    <p className="text-xs font-bold text-red-800 uppercase mb-2">Acción Requerida para Desbloquear</p>
                    <div
                        onClick={onUnblock}
                        className="flex items-center gap-3 bg-white p-3 rounded-lg border border-red-200 cursor-pointer hover:border-red-400 transition-all shadow-sm group"
                    >
                        <div className="w-5 h-5 rounded border-2 border-red-300 flex items-center justify-center text-white group-hover:bg-red-500 group-hover:border-red-500 transition-colors">
                            <Check size={14} className="opacity-0 group-hover:opacity-100" />
                        </div>
                        <span className="text-sm text-red-900 font-medium">Resolver bloqueo: "{task.blockReason}"</span>
                    </div>
                </div>
            )}

            {isChatOpen && (
                <div className="bg-slate-50 border-t border-slate-100 p-4 animate-in slide-in-from-top-2 duration-200">
                    {task.comments.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center mb-4">No hay comentarios.</p>
                    ) : (
                        <>
                            <div className="space-y-3 mb-4">
                                {(() => {
                                    // Mostrar solo los últimos 4 comentarios por defecto, o todos si showAllComments es true
                                    const commentsToShow = showAllComments
                                        ? task.comments
                                        : task.comments.slice(-4);

                                    // Resaltar menciones en el texto
                                    const highlightMentions = (text) => {
                                        const parts = text.split(/([@!]\w+)/g);
                                        return parts.map((part, index) => {
                                            if (part.match(/^[@!]\w+$/)) {
                                                return <span key={index} className="bg-purple-100 text-purple-700 font-semibold px-1 rounded">{part}</span>;
                                            }
                                            return <span key={index}>{part}</span>;
                                        });
                                    };

                                    return commentsToShow.map(comment => (
                                        <div key={comment.id} className="flex gap-2.5">
                                            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs border border-slate-200 shadow-sm mt-0.5 flex-shrink-0">
                                                <span style={{ fontSize: '0.75rem', lineHeight: '1', fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>
                                                    {comment.avatar}
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-baseline gap-2 mb-0.5">
                                                    <span className="text-xs font-bold text-slate-700">{comment.user}</span>
                                                    <span className="text-[10px] text-slate-400">{comment.date}</span>
                                                </div>
                                                <div className="bg-white border border-slate-200 rounded-lg rounded-tl-none p-2 text-sm text-slate-700 shadow-sm">
                                                    {highlightMentions(comment.text)}
                                                </div>
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                            {task.comments.length > 4 && (
                                <button
                                    onClick={() => setShowAllComments(!showAllComments)}
                                    className="w-full text-xs text-slate-500 hover:text-slate-700 font-medium py-2 mb-4 transition-colors"
                                >
                                    {showAllComments
                                        ? `Mostrar menos (${task.comments.length - 4} ocultos)`
                                        : `Mostrar más (${task.comments.length - 4} comentarios anteriores)`
                                    }
                                </button>
                            )}
                        </>
                    )}
                    <div className="relative flex gap-2">
                        <input
                            type="text"
                            value={commentInput}
                            onChange={handleCommentInputChange}
                            onKeyDown={handleCommentKeyDown}
                            placeholder="Comentario..."
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            autoFocus
                        />
                        {mentionPosition && filteredMentions.length > 0 && (
                            <div className="absolute bottom-full left-0 mb-2 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                                {filteredMentions.map((member, index) => (
                                    <button
                                        key={member.id}
                                        type="button"
                                        onClick={() => handleMentionSelect(member)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 transition-colors ${index === selectedMentionIndex ? 'bg-blue-50' : ''
                                            }`}
                                    >
                                        <span className="text-lg">{member.avatar}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-slate-800 truncate">
                                                {member.name || member.username}
                                            </div>
                                            {member.username && member.name && (
                                                <div className="text-xs text-slate-500 truncate">
                                                    @{member.username}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        <button
                            onClick={handleSubmitComment}
                            disabled={!commentInput.trim()}
                            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskCard;
