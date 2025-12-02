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
            <div className="text-center py-20 opacity-60">
                <div className="bg-gradient-to-br from-slate-100 to-slate-200 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
                    {currentContext === 'work' ? <Briefcase size={36} className="text-slate-400" /> : <Home size={36} className="text-slate-400" />}
                </div>
                <p className="text-slate-600 font-semibold text-lg mb-1">
                    Todo al día
                </p>
                <p className="text-slate-400 text-sm">
                    {activeGroupId === 'all' 
                        ? (currentContext === 'work' ? 'en tu Trabajo' : 'en tu Vida Personal') 
                        : `en ${activeGroupObj?.name}`
                    }
                </p>
            </div>
        );
    }

    return (
        <>
            {/* VENCIDAS */}
            {filteredTasks.filter(t => t.status === 'overdue').length > 0 && (
                <section className="mb-6">
                    <h2 className="text-xs font-bold text-red-600 uppercase tracking-widest mb-4 flex items-center gap-2 px-1">
                        <AlertTriangle size={12} /> Urgente
                    </h2>
                    <div className="space-y-2">
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
            <section className="mb-6">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-1">Para hoy</h2>
                <div className="space-y-2.5">
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
            <section className="mb-6">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Próximamente</h2>
                <div className="space-y-2.5 opacity-70">
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
                    <section className="mb-6 mt-8">
                        <h2 className="text-xs font-bold text-green-600 uppercase tracking-widest mb-4 flex items-center gap-2 px-1">
                            <CheckCircle2 size={12} /> Completadas hoy
                        </h2>
                        <div className="space-y-2.5 opacity-70">
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
                    <section className="mt-8 mb-6">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 px-1">
                            <History size={12} /> Finalizadas
                        </h2>
                        <div className="space-y-2.5 opacity-50">
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
