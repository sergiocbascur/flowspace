import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import TaskCard from './TaskCard';

const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const CalendarView = ({
    calendarMonth,
    setCalendarMonth,
    calendarYear,
    setCalendarYear,
    calendarSelectedDate,
    setCalendarSelectedDate,
    filteredTasks,
    categories,
    teamMembers,
    onTaskAction,
    onUnblock,
    onAddComment,
    onReadComments,
    openChats,
    onToggleChat
}) => {

    const getDaysInMonth = (month, year) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month, year) => {
        return new Date(year, month, 1).getDay();
    };

    const getTasksForDay = (day, month, year) => {
        const targetDate = new Date(year, month, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        targetDate.setHours(0, 0, 0, 0);

        return filteredTasks.filter(task => {
            // Manejar fechas relativas
            if (task.due === 'Hoy' && targetDate.getTime() === today.getTime()) return true;
            if (task.due === 'Mañana' && targetDate.getTime() === tomorrow.getTime()) return true;
            if (task.due === 'Ayer' && targetDate.getTime() === yesterday.getTime()) return true;

            // Manejar fechas específicas
            if (task.due && typeof task.due === 'string' && task.due.includes('-')) {
                try {
                    const taskDate = new Date(task.due);
                    taskDate.setHours(0, 0, 0, 0);
                    return taskDate.getTime() === targetDate.getTime();
                } catch {
                    return false;
                }
            }

            // Manejar días numéricos (legacy)
            if (task.due && task.due.toString().includes(day.toString())) {
                return true;
            }

            return false;
        });
    };

    const getCategoryColorsForDay = (day, month, year) => {
        const tasks = getTasksForDay(day, month, year);
        const colorSet = new Set();
        tasks.forEach(task => {
            const category = categories.find(c => c.name === task.category);
            if (category) {
                colorSet.add(category.dot);
            }
            // Agregar colores por prioridad si no hay categoría
            if (!category) {
                if (task.priority === 'high') colorSet.add('bg-red-500');
                else if (task.priority === 'medium') colorSet.add('bg-amber-500');
                else if (task.priority === 'low') colorSet.add('bg-green-500');
            }
            // Agregar color para tareas vencidas
            if (task.status === 'overdue') colorSet.add('bg-red-600');
        });
        return Array.from(colorSet);
    };

    const handleCalendarPrevMonth = () => {
        if (calendarMonth === 0) {
            setCalendarMonth(11);
            setCalendarYear(calendarYear - 1);
        } else {
            setCalendarMonth(calendarMonth - 1);
        }
    };

    const handleCalendarNextMonth = () => {
        if (calendarMonth === 11) {
            setCalendarMonth(0);
            setCalendarYear(calendarYear + 1);
        } else {
            setCalendarMonth(calendarMonth + 1);
        }
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl overflow-hidden border border-slate-200/60 shadow-lg bg-white">

            {/* CALENDARIO GRID (COMPACT) - Estilo iOS Calendar mejorado */}
            <div className="bg-gradient-to-b from-white to-slate-50/30 p-6 z-10 relative border-b border-slate-200/60">
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={handleCalendarPrevMonth}
                        className="p-2.5 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
                    >
                        <ChevronLeft size={20} className="text-slate-700" />
                    </button>
                    <span className="font-bold text-slate-900 text-xl tracking-tight">{months[calendarMonth]} {calendarYear}</span>
                    <button
                        onClick={handleCalendarNextMonth}
                        className="p-2.5 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
                    >
                        <ChevronRight size={20} className="text-slate-700" />
                    </button>
                </div>
                <div className="grid grid-cols-7 mb-4">
                    {weekDays.map((d) => (
                        <div key={d} className="text-center text-xs font-semibold text-slate-500 tracking-wide">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {(() => {
                        const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
                        const firstDay = getFirstDayOfMonth(calendarMonth, calendarYear);
                        const today = new Date();

                        const calendarDays = [];
                        // Días vacíos al inicio
                        for (let i = 0; i < firstDay; i++) {
                            calendarDays.push(<div key={`empty-${i}`} className="h-12"></div>);
                        }

                        // Días del mes
                        for (let day = 1; day <= daysInMonth; day++) {
                            const isToday = today.getDate() === day &&
                                today.getMonth() === calendarMonth &&
                                today.getFullYear() === calendarYear;
                            const isSelected = day === calendarSelectedDate;
                            const categoryColors = getCategoryColorsForDay(day, calendarMonth, calendarYear);

                            calendarDays.push(
                                <div key={day} className="flex flex-col items-center justify-center py-1.5 min-h-[3.5rem]">
                                    <button
                                        onClick={() => setCalendarSelectedDate(day)}
                                        className={`w-11 h-11 rounded-full flex flex-col items-center justify-center transition-all duration-200 relative group
                                                ${isSelected ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-500/30 scale-105' : ''}
                                                ${isToday && !isSelected ? 'bg-blue-50 text-blue-700 font-semibold border-2 border-blue-200' : ''}
                                                ${!isToday && !isSelected ? 'text-slate-700 hover:bg-slate-100 hover:scale-105' : ''}
                                            `}
                                    >
                                        <span className={`text-[15px] leading-none font-medium ${isSelected ? 'text-white' : ''}`}>{day}</span>

                                        {/* Puntos de colores múltiples estilo iOS Calendar mejorado */}
                                        {categoryColors.length > 0 && (
                                            <div className={`flex items-center justify-center gap-0.5 mt-1 ${isSelected ? 'opacity-90' : ''}`}>
                                                {categoryColors.slice(0, 3).map((color, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`w-1.5 h-1.5 rounded-full ${color} ${isSelected ? 'bg-white opacity-100' : isToday ? 'opacity-85' : 'opacity-65'}`}
                                                    />
                                                ))}
                                                {categoryColors.length > 3 && (
                                                    <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white opacity-100' : 'bg-slate-400 opacity-65'}`} />
                                                )}
                                            </div>
                                        )}
                                    </button>
                                </div>
                            );
                        }

                        return calendarDays;
                    })()}
                </div>

                {/* DIVIDER HANDLE (Visual mejorado) */}
                <div className="flex justify-center mt-5">
                    <div className="w-12 h-1 bg-slate-300/50 rounded-full"></div>
                </div>
            </div>

            {/* DETALLE DEL DÍA (EXPANDED BELOW) - Estilo iOS Calendar mejorado */}
            <div className="flex-1 bg-gradient-to-b from-slate-50/50 to-white p-6 overflow-y-auto border-t border-slate-200/60">
                <div className="sticky top-0 bg-gradient-to-b from-slate-50/50 to-transparent pb-4 z-10 border-b border-slate-200/60 mb-5">
                    <h3 className="text-lg font-bold text-slate-900 mb-1 tracking-tight">
                        {(() => {
                            const today = new Date();
                            const selectedDate = new Date(calendarYear, calendarMonth, calendarSelectedDate);
                            const isToday = selectedDate.toDateString() === today.toDateString();
                            const isTomorrow = selectedDate.toDateString() === new Date(today.getTime() + 86400000).toDateString();

                            if (isToday) return 'Hoy';
                            if (isTomorrow) return 'Mañana';
                            return `${calendarSelectedDate} de ${months[calendarMonth]}`;
                        })()}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">
                        {(() => {
                            const selectedDate = new Date(calendarYear, calendarMonth, calendarSelectedDate);
                            const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                            return dayNames[selectedDate.getDay()];
                        })()}
                    </p>
                </div>
                <div className="space-y-3 pb-20">
                    {(() => {
                        const dayTasks = getTasksForDay(calendarSelectedDate, calendarMonth, calendarYear);

                        // Ordenar tareas: vencidas primero, luego por hora, luego por prioridad
                        const sortedTasks = [...dayTasks].sort((a, b) => {
                            if (a.status === 'overdue' && b.status !== 'overdue') return -1;
                            if (a.status !== 'overdue' && b.status === 'overdue') return 1;
                            if (a.time && b.time) {
                                return a.time.localeCompare(b.time);
                            }
                            if (a.time) return -1;
                            if (b.time) return 1;
                            const priorityOrder = { high: 0, medium: 1, low: 2 };
                            return priorityOrder[a.priority] - priorityOrder[b.priority];
                        });

                        if (sortedTasks.length === 0) {
                            return (
                                <div className="text-center text-slate-400 py-20 flex flex-col items-center">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4 shadow-sm">
                                        <Calendar size={28} className="text-slate-400" />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-500 mb-1">Nada programado</span>
                                    <span className="text-xs text-slate-400">para este día</span>
                                </div>
                            );
                        }

                        return sortedTasks.map(task => {
                            return (
                                <div key={task.id} className="group">
                                    <TaskCard
                                        task={task}
                                        team={teamMembers}
                                        categories={categories}
                                        onToggle={() => onTaskAction(task)}
                                        onUnblock={() => onUnblock(task)}
                                        onAddComment={onAddComment}
                                        onReadComments={onReadComments}
                                        isChatOpen={openChats.has(task.id)}
                                        onToggleChat={onToggleChat}
                                    />
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>
        </div>
    );
};

export default CalendarView;
