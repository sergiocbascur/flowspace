import React from 'react';
import {
    Briefcase, Home, AlertTriangle, CheckCircle2, History
} from 'lucide-react';
import TaskCard from './TaskCard';

const TaskList = ({
    filteredTasks,
    currentContext,
    activeGroupId,
    activeGroupObj,
    teamMembers,
    categories,
    onTaskAction,
    onUnblock,
    onAddComment,
    onReadComments,
    openChats,
    onToggleChat,
    currentUser,
    onDelete
}) => {
    if (filteredTasks.length === 0) {
        return (
            <div className="text-center py-16 opacity-50">
                <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    {currentContext === 'work' ? <Briefcase size={32} className="text-slate-300" /> : <Home size={32} className="text-slate-300" />}
                </div>
                <p className="text-slate-500 font-medium text-lg">Todo al día en {activeGroupId === 'all' ? (currentContext === 'work' ? 'tu Trabajo' : 'tu Vida Personal') : activeGroupObj?.name}.</p>
            </div>
        );
    }

    return (
        <>
            {/* VENCIDAS */}
            {filteredTasks.filter(t => t.status === 'overdue').length > 0 && (
                <section>
                    <h2 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-2"><AlertTriangle size={14} /> Urgente</h2>
                    <div className="bg-red-50/50 rounded-2xl border border-red-100 overflow-hidden">
                        {filteredTasks.filter(t => t.status === 'overdue').map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                team={teamMembers}
                                categories={categories}
                                onToggle={() => onTaskAction(task)}
                                onUnblock={() => onUnblock(task)}
                                isOverdue
                                onAddComment={onAddComment}
                                onReadComments={onReadComments}
                                isChatOpen={openChats.has(task.id)}
                                onToggleChat={onToggleChat}
                                currentUser={currentUser}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* PENDIENTES (HOY) */}
            <section>
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Para hoy</h2>
                <div className="space-y-2">
                    {filteredTasks.filter(t => t.status === 'waiting_validation').map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            team={teamMembers}
                            categories={categories}
                            onToggle={() => onTaskAction(task)}
                            onUnblock={() => onUnblock(task)}
                            onAddComment={onAddComment}
                            onReadComments={onReadComments}
                            isChatOpen={openChats.has(task.id)}
                            onToggleChat={onToggleChat}
                            currentUser={currentUser}
                            onDelete={onDelete}
                        />
                    ))}
                    {filteredTasks.filter(t => t.status === 'blocked').map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            team={teamMembers}
                            categories={categories}
                            onToggle={() => { }}
                            isBlocked
                            onUnblock={() => onUnblock(task)}
                            onAddComment={onAddComment}
                            onReadComments={onReadComments}
                            isChatOpen={openChats.has(task.id)}
                            onToggleChat={onToggleChat}
                            currentUser={currentUser}
                            onDelete={onDelete}
                        />
                    ))}
                    {filteredTasks.filter(t => {
                        if (t.status !== 'pending') return false;

                        // Exclude future tasks (they go to Próximamente)
                        const today = new Date().toISOString().split('T')[0];
                        const taskDate = t.due;
                        let actualTaskDate;
                        if (taskDate === 'Hoy') actualTaskDate = today;
                        else if (taskDate === 'Mañana') {
                            const tmr = new Date();
                            tmr.setDate(tmr.getDate() + 1);
                            actualTaskDate = tmr.toISOString().split('T')[0];
                        } else actualTaskDate = taskDate;

                        return actualTaskDate <= today;
                    }).map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            team={teamMembers}
                            categories={categories}
                            onToggle={() => onTaskAction(task)}
                            onUnblock={() => onUnblock(task)}
                            onAddComment={onAddComment}
                            onReadComments={onReadComments}
                            isChatOpen={openChats.has(task.id)}
                            onToggleChat={onToggleChat}
                            currentUser={currentUser}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            </section>

            {/* PRÓXIMAS */}
            <section>
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Próximamente</h2>
                <div className="space-y-2 opacity-75">
                    {filteredTasks.filter(t => {
                        const isUpcomingStatus = t.status === 'upcoming';

                        // Check if it's a pending task with future date
                        const today = new Date().toISOString().split('T')[0];
                        const taskDate = t.due;
                        let actualTaskDate;
                        if (taskDate === 'Hoy') actualTaskDate = today;
                        else if (taskDate === 'Mañana') {
                            const tmr = new Date();
                            tmr.setDate(tmr.getDate() + 1);
                            actualTaskDate = tmr.toISOString().split('T')[0];
                        } else actualTaskDate = taskDate;

                        const isFutureDate = actualTaskDate > today;

                        return isUpcomingStatus || (t.status === 'pending' && isFutureDate);
                    }).map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            team={teamMembers}
                            categories={categories}
                            onToggle={() => onTaskAction(task)}
                            onUnblock={() => onUnblock(task)}
                            onAddComment={onAddComment}
                            onReadComments={onReadComments}
                            isChatOpen={openChats.has(task.id)}
                            onToggleChat={onToggleChat}
                            currentUser={currentUser}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            </section>

            {/* COMPLETADAS HOY */}
            {filteredTasks.filter(t => {
                if (t.status !== 'completed') return false;
                if (!t.completedAt) return false;
                const completedDate = new Date(t.completedAt);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                completedDate.setHours(0, 0, 0, 0);
                return completedDate.getTime() === today.getTime();
            }).length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold text-green-600 uppercase tracking-wider mb-3 mt-6 flex items-center gap-2"><CheckCircle2 size={14} /> Completadas hoy</h2>
                        <div className="space-y-2 opacity-75">
                            {filteredTasks.filter(t => {
                                if (t.status !== 'completed') return false;
                                if (!t.completedAt) return false;
                                const completedDate = new Date(t.completedAt);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                completedDate.setHours(0, 0, 0, 0);
                                return completedDate.getTime() === today.getTime();
                            }).map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    team={teamMembers}
                                    categories={categories}
                                    onToggle={() => onTaskAction(task)}
                                    onUnblock={() => onUnblock(task)}
                                    completed
                                    onAddComment={onAddComment}
                                    onReadComments={onReadComments}
                                    isChatOpen={openChats.has(task.id)}
                                    onToggleChat={onToggleChat}
                                    currentUser={currentUser}
                                    onDelete={onDelete}
                                />
                            ))}
                        </div>
                    </section>
                )}

            {/* FINALIZADAS (Completadas ayer o antes) */}
            {filteredTasks.filter(t => {
                if (t.status !== 'completed') return false;
                if (!t.completedAt) return false;
                const completedDate = new Date(t.completedAt);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                completedDate.setHours(0, 0, 0, 0);
                const daysDiff = Math.floor((today - completedDate) / (1000 * 60 * 60 * 24));
                return daysDiff > 0; // Completada ayer o antes
            }).length > 0 && (
                    <section className="mt-8">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2"><History size={14} /> Finalizadas</h2>
                            {onDelete && (
                                <button
                                    onClick={() => {
                                        if (window.confirm('¿Estás seguro de que quieres eliminar todas las tareas finalizadas antiguas?')) {
                                            // Filtrar las tareas finalizadas antiguas y eliminarlas una por una
                                            const oldTasks = filteredTasks.filter(t => {
                                                if (t.status !== 'completed') return false;
                                                if (!t.completedAt) return false;
                                                const completedDate = new Date(t.completedAt);
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                completedDate.setHours(0, 0, 0, 0);
                                                const daysDiff = Math.floor((today - completedDate) / (1000 * 60 * 60 * 24));
                                                return daysDiff > 0;
                                            });
                                            oldTasks.forEach(t => onDelete(t.id));
                                        }
                                    }}
                                    className="text-xs font-medium text-red-400 hover:text-red-600 transition-colors"
                                >
                                    Eliminar todas
                                </button>
                            )}
                        </div>
                        <div className="space-y-2 opacity-50">
                            {filteredTasks.filter(t => {
                                if (t.status !== 'completed') return false;
                                if (!t.completedAt) return false;
                                const completedDate = new Date(t.completedAt);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                completedDate.setHours(0, 0, 0, 0);
                                const daysDiff = Math.floor((today - completedDate) / (1000 * 60 * 60 * 24));
                                return daysDiff > 0;
                            }).map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    team={teamMembers}
                                    categories={categories}
                                    onToggle={() => onTaskAction(task)}
                                    onUnblock={() => onUnblock(task)}
                                    completed
                                    onAddComment={onAddComment}
                                    onReadComments={onReadComments}
                                    isChatOpen={openChats.has(task.id)}
                                    onToggleChat={onToggleChat}
                                    currentUser={currentUser}
                                    onDelete={onDelete}
                                />
                            ))}
                        </div>
                    </section>
                )}
        </>
    );
};

export default TaskList;
