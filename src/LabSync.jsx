// React primero - debe ser el primer import
import React, { useState, useRef, useEffect, useMemo } from 'react';

// Servicios locales
import { deleteUser } from './authService';
import { apiGroups, apiTasks, apiAuth, apiEquipment } from './apiService';


// Componentes locales - importar antes de usar
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import TaskCard from './components/TaskCard';
import TaskList from './components/TaskList';
import CalendarView from './components/CalendarView';
import GroupModal from './components/modals/GroupModal';
import DeleteAccountModal from './components/modals/DeleteAccountModal';
import LeaveGroupModal from './components/modals/LeaveGroupModal';
import SettingsModal from './components/modals/SettingsModal';
import QRScannerModal from './components/modals/QRScannerModal';

// Librerías externas - después de componentes locales
// Html5Qrcode se importa dinámicamente para evitar problemas de inicialización
import { init, getEmojiDataFromNative } from 'emoji-mart';
import {
    CheckCircle2, CheckCircle, Circle, Clock, AlertTriangle, AlertCircle, Mail, BrainCircuit, Plus, Search, Calendar, Users, MoreHorizontal, LogOut, Lock, ArrowRight, X, QrCode, MapPin, History, Save, Moon, MessageSquare, Send, Ban, Unlock, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Settings, CalendarCheck, Sparkles, Flag, Lightbulb, Check, Tag, Briefcase, Home, Layers, UserPlus, Copy, LogIn, LayoutGrid, Folder, Share2, ScanLine, Eye, Bell, ShieldCheck, CheckSquare, BarChart3, Wrench, Activity, Maximize2, Minimize2, List, Grid3X3, UserMinus, Pencil, FolderPlus
} from 'lucide-react';

// Componente para mostrar QR Code
const QRCodeDisplay = ({ code }) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(code)}`;
    return (
        <div className="flex flex-col items-center gap-2">
            <img src={qrUrl} alt={`QR Code: ${code}`} className="w-40 h-40" />
            <p className="text-xs text-slate-500 font-medium">Escanea para unirse</p>
        </div>
    );
};

// Inicializar Emoji Mart de forma dinámica
let emojiMartInitialized = false;
const initializeEmojiMart = async () => {
    if (emojiMartInitialized) return;
    try {
        const data = await import('@emoji-mart/data');
        init({ data: data.default || data });
        emojiMartInitialized = true;
    } catch (e) {
        console.warn('Emoji Mart no pudo inicializarse:', e);
    }
};

// Inicializar en el montaje del componente
if (typeof window !== 'undefined') {
    initializeEmojiMart();
}

// Componente helper para renderizar emojis de manera consistente
const EmojiButton = ({ emoji, size = 24, className = '', onClick }) => {
    // Usar emoji nativo con mejor renderizado
    // Asegurar que los modificadores de tono de piel se rendericen correctamente
    return (
        <button
            onClick={onClick}
            className={className}
            style={{
                fontSize: `${size}px`,
                lineHeight: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale'
            }}
        >
            <span
                style={{
                    display: 'inline-block',
                    width: `${size}px`,
                    height: `${size}px`,
                    textAlign: 'center',
                    lineHeight: `${size}px`
                }}
            >
                {emoji}
            </span>
        </button>
    );
};

const FlowSpace = ({ currentUser, onLogout, allUsers, onUserUpdate }) => {
    // --- DETECCIÓN DE DISPOSITIVO MÓVIL ---
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < 768;
        }
        return false;
    });

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- ESTADOS GLOBALES ---
    // Inicializar contexto: primer acceso va a 'personal', luego recuerda la última elección
    const [currentContext, setCurrentContext] = useState(() => {
        if (!currentUser?.id) return 'work';
        const savedContext = localStorage.getItem(`flowspace_context_${currentUser.id}`);
        const isFirstAccess = !localStorage.getItem(`flowspace_initialized_${currentUser.id}`);
        // Primer acceso: ir a 'personal' para ver ejemplos
        if (isFirstAccess) return 'personal';
        // Accesos posteriores: recordar última elección
        return savedContext || 'work';
    });

    // Guardar contexto cuando cambie
    useEffect(() => {
        if (currentUser?.id) {
            localStorage.setItem(`flowspace_context_${currentUser.id}`, currentContext);
        }
    }, [currentContext, currentUser?.id]);
    const [activeGroupId, setActiveGroupId] = useState('all');
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
    const [activeFilter, setActiveFilter] = useState('today'); // 'today' | 'scheduled' | 'critical' | 'validation'
    const [searchQuery, setSearchQuery] = useState('');

    // --- ESTADOS PARA MENCIONES EN MÓVIL ---
    const [mobileMentionQuery, setMobileMentionQuery] = useState('');
    const [mobileMentionPosition, setMobileMentionPosition] = useState(null);
    const [mobileSelectedMentionIndex, setMobileSelectedMentionIndex] = useState(0);

    // Detectar primer acceso del usuario
    const isFirstAccess = !localStorage.getItem(`flowspace_initialized_${currentUser?.id}`);

    // Base de datos de Grupos - Inicializar vacío para trabajo, solo "Casa/Familia" para personal
    const [groups, setGroups] = useState([]);
    const [groupsLoading, setGroupsLoading] = useState(true);

    const currentGroups = groups.filter(g => g.type === currentContext);
    const activeGroupObj = activeGroupId === 'all' ? null : groups.find(g => g.id === activeGroupId);

    // FIX: Define displayGroup to avoid ReferenceError
    const displayGroup = activeGroupId === 'all'
        ? { name: currentContext === 'work' ? 'Vista General' : 'Vista Personal', type: currentContext, isAll: true }
        : groups.find(g => g.id === activeGroupId);

    // --- ESTADOS UI ---
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [groupModalTab, setGroupModalTab] = useState('create');
    const [joinCodeInput, setJoinCodeInput] = useState('');
    const [inviteSelectedGroup, setInviteSelectedGroup] = useState('');
    const [newGroupName, setNewGroupName] = useState('');
    const [showMetrics, setShowMetrics] = useState(false);
    const [weeklyReport, setWeeklyReport] = useState(null);
    const [showLeaveGroupConfirm, setShowLeaveGroupConfirm] = useState(false);
    const [groupToLeave, setGroupToLeave] = useState(null);
    const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [taskToRestore, setTaskToRestore] = useState(null);
    const [restoreAssignees, setRestoreAssignees] = useState([]);
    const [restoreDue, setRestoreDue] = useState('Hoy');
    const [restoreTime, setRestoreTime] = useState('');

    // Estados de UI Dinámica
    const [isSpacesExpanded, setIsSpacesExpanded] = useState(true);
    const [isIntelligenceExpanded, setIsIntelligenceExpanded] = useState(false);
    const [intelligenceHasUnread, setIntelligenceHasUnread] = useState(false);
    const [showViewSelector, setShowViewSelector] = useState(false);
    const [isNovedadesExpanded, setIsNovedadesExpanded] = useState(false);
    const [lastViewedSuggestionCount, setLastViewedSuggestionCount] = useState(0);

    // Estado Calendario
    const today = new Date();
    const [calendarSelectedDate, setCalendarSelectedDate] = useState(today.getDate());
    const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
    const [calendarYear, setCalendarYear] = useState(today.getFullYear());

    useEffect(() => {
        const firstGroup = groups.find(g => g.type === currentContext);
        if (firstGroup) setInviteSelectedGroup(firstGroup.id);
    }, [currentContext, groups]);

    // Solicitar permisos de notificaciones push al iniciar sesión


    // Miembros del grupo activo (filtrados dinámicamente)
    const teamMembers = useMemo(() => {
        if (activeGroupId === 'all') {
            // En vista "all", mostrar todos los miembros de grupos del contexto actual
            const contextGroups = groups.filter(g => g.type === currentContext);
            const allMemberIds = new Set();
            const memberMap = new Map();

            contextGroups.forEach(group => {
                if (group.members && Array.isArray(group.members)) {
                    group.members.forEach(member => {
                        if (member && member.id) {
                            allMemberIds.add(member.id);
                            memberMap.set(member.id, member);
                        }
                    });
                }
            });

            return Array.from(allMemberIds).map(id => memberMap.get(id));
        } else {
            // Mostrar solo miembros del grupo activo
            const activeGroup = groups.find(g => g.id === activeGroupId);
            if (!activeGroup || !activeGroup.members || !Array.isArray(activeGroup.members)) {
                // Fallback: solo el usuario actual
                return [currentUser];
            }
            return activeGroup.members;
        }
    }, [activeGroupId, groups, currentContext, currentUser]);

    // Categorías
    const categories = [
        { id: 'general', name: 'General', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
        { id: 'critico', name: 'Crítico', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
        { id: 'auditoria', name: 'Auditoría', color: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
        { id: 'mantencion', name: 'Mantención', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
        { id: 'solicitud', name: 'Solicitud', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
        { id: 'produccion', name: 'Producción', color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
        { id: 'compras', name: 'Compras', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
        { id: 'domestico', name: 'Doméstico', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
        { id: 'ocio', name: 'Ocio', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' }
    ];

    // Estados para móvil - Navegación iOS (State Machine)
    const [mobileView, setMobileView] = useState('dashboard'); // 'dashboard' | 'list'
    // Cuando es 'smart', groupId es null y usamos el filtro (ej: 'today')
    const [activeListConfig, setActiveListConfig] = useState(null); // { type: 'group' | 'smart', id: string, title: string, color: string }
    const [showNewTaskModal, setShowNewTaskModal] = useState(false);
    const [selectedTaskForChat, setSelectedTaskForChat] = useState(null);
    const [mobileCommentInput, setMobileCommentInput] = useState('');
    const [mobileSelectedDue, setMobileSelectedDue] = useState('Hoy');
    const [mobileSelectedTime, setMobileSelectedTime] = useState('');
    const [mobileSelectedCategory, setMobileSelectedCategory] = useState(categories[0]?.id || 'general');
    const [mobileSelectedAssignees, setMobileSelectedAssignees] = useState([currentUser?.id || 'user']);
    const [mobileSelectedGroupForTask, setMobileSelectedGroupForTask] = useState(null); // Para selector en modal
    const [showMobileUserMenu, setShowMobileUserMenu] = useState(false);
    const [showMobileAddModal, setShowMobileAddModal] = useState(false);
    // Estados para modal de tareas vencidas
    const [showOverdueTaskModal, setShowOverdueTaskModal] = useState(false);
    // Estado para componente de inteligencia flotante en móvil
    const [showMobileIntelligence, setShowMobileIntelligence] = useState(false);

    // Estados para QR Scanner y Avatar
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [qrScannerMode, setQrScannerMode] = useState('group'); // 'group' | 'equipment'
    const [showAvatarSelector, setShowAvatarSelector] = useState(false);

    // Estados para Settings
    const [showSettings, setShowSettings] = useState(false);
    const [userConfig, setUserConfig] = useState({
        // Notificaciones por email
        emailNotifyMentions: true,
        emailNotifyValidation: true,
        emailNotifyOverdue: true,
        // Notificaciones en la app
        notifyDeadline: true,
        notifyAssignment: true,
        notifyValidation: true,
        // Sincronización de calendario (futuro)
        googleCalendarSync: true,
        syncScope: 'mine',
        autoScheduleMeeting: true,
        defaultMeetingTime: '09:00'
    });

    // Estados para Equipos
    const [currentEquipment, setCurrentEquipment] = useState(null);
    const [showEquipmentDetail, setShowEquipmentDetail] = useState(false);
    const [equipmentLogs, setEquipmentLogs] = useState([]);
    const [pendingEquipmentCode, setPendingEquipmentCode] = useState(null);
    const [showCreateEquipmentConfirm, setShowCreateEquipmentConfirm] = useState(false);
    const [showMobileConfirm, setShowMobileConfirm] = useState(false);

    // Estado de tareas - Cargar desde localStorage o crear tareas de muestra solo en primer acceso
    const [tasks, setTasks] = useState(() => {
        if (currentUser?.id) {
            const savedTasks = localStorage.getItem(`flowspace_tasks_${currentUser.id}`);
            if (savedTasks) {
                return JSON.parse(savedTasks);
            }
        }

        // Solo crear tareas de muestra en primer acceso y solo en "Casa/Familia"
        if (isFirstAccess) {
            return [
                {
                    id: 1,
                    groupId: 'fam',
                    title: 'Comprar víveres',
                    creatorId: currentUser?.id || 'user',
                    assignees: [currentUser?.id || 'user'],
                    category: 'Doméstico',
                    due: 'Hoy',
                    time: '18:00',
                    status: 'pending',
                    postponeCount: 0,
                    priority: 'medium',
                    comments: [],
                    unreadComments: 0
                },
                {
                    id: 2,
                    groupId: 'fam',
                    title: 'Llamar al médico',
                    creatorId: currentUser?.id || 'user',
                    assignees: [currentUser?.id || 'user'],
                    category: 'General',
                    due: 'Mañana',
                    time: '10:00',
                    status: 'pending',
                    postponeCount: 0,
                    priority: 'high',
                    comments: [],
                    unreadComments: 0
                },
                {
                    id: 3,
                    groupId: 'fam',
                    title: 'Pagar servicios',
                    creatorId: currentUser?.id || 'user',
                    assignees: [currentUser?.id || 'user'],
                    category: 'Doméstico',
                    due: 'Hoy',
                    time: '',
                    status: 'pending',
                    postponeCount: 0,
                    priority: 'high',
                    comments: [],
                    unreadComments: 0
                }
            ];
        }
        return [];
    });

    // Guardar tareas en localStorage cuando cambien
    useEffect(() => {
        if (currentUser?.id) {
            localStorage.setItem(`flowspace_tasks_${currentUser.id}`, JSON.stringify(tasks));
        }
    }, [tasks, currentUser?.id]);

    // Marcar como inicializado después del primer acceso
    useEffect(() => {
        if (isFirstAccess && currentUser?.id) {
            localStorage.setItem(`flowspace_initialized_${currentUser.id}`, 'true');
        }
    }, [isFirstAccess, currentUser?.id]);

    // Lógica de menciones para móvil (MOVIDO AQUÍ PARA TENER ACCESO A tasks y selectedTaskForChat)
    const mobileAssignedMembers = useMemo(() => {
        if (!selectedTaskForChat) return [];
        const task = tasks.find(t => t.id === selectedTaskForChat.id) || selectedTaskForChat;
        return (task.assignees || [])
            .map(assigneeId => {
                if (allUsers && allUsers.length > 0) {
                    return allUsers.find(u => u.id === assigneeId);
                }
                return teamMembers.find(m => m.id === assigneeId);
            })
            .filter(Boolean);
    }, [selectedTaskForChat, tasks, teamMembers, allUsers]);

    const mobileFilteredMentions = useMemo(() => {
        if (!mobileMentionQuery) return mobileAssignedMembers;
        const query = mobileMentionQuery.toLowerCase();
        return mobileAssignedMembers.filter(member => {
            const name = (member.name || member.username || '').toLowerCase();
            const username = (member.username || '').toLowerCase();
            return name.includes(query) || username.includes(query);
        });
    }, [mobileMentionQuery, mobileAssignedMembers]);

    // Handlers para menciones en móvil
    const handleMobileCommentInputChange = (e) => {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart;

        const textBeforeCursor = value.substring(0, cursorPos);
        const mentionMatch = textBeforeCursor.match(/([@!])(\w*)$/);

        if (mentionMatch) {
            const [fullMatch, symbol, query] = mentionMatch;
            const startPos = cursorPos - fullMatch.length;
            setMobileMentionQuery(query);
            setMobileMentionPosition({ start: startPos, end: cursorPos });
            setMobileSelectedMentionIndex(0);
        } else {
            setMobileMentionQuery('');
            setMobileMentionPosition(null);
        }

        setMobileCommentInput(value);
    };

    const handleMobileMentionSelect = (member) => {
        if (!mobileMentionPosition) return;

        const before = mobileCommentInput.substring(0, mobileMentionPosition.start);
        const after = mobileCommentInput.substring(mobileMentionPosition.end);
        const mentionText = `@${member.name || member.username}`;
        const newText = before + mentionText + ' ' + after;

        setMobileCommentInput(newText);
        setMobileMentionQuery('');
        setMobileMentionPosition(null);
    };

    const filteredTasks = tasks.filter(task => {
        const taskGroup = groups.find(g => g.id === task.groupId);
        if (!taskGroup) return false;
        if (taskGroup.type !== currentContext) return false;
        if (activeGroupId !== 'all' && task.groupId !== activeGroupId) return false;

        // Lógica de Búsqueda
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            return task.title.toLowerCase().includes(query) ||
                task.category.toLowerCase().includes(query) ||
                task.assignees.some(a => a.toLowerCase().includes(query));
        }

        // Lógica de filtros de Sidebar
        if (activeFilter === 'today') {
            // Only show tasks for today or overdue
            const today = new Date().toISOString().split('T')[0];
            const taskDate = task.due;

            // Convert "Hoy", "Mañana" to actual dates
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

            // Show if task is for today or earlier (overdue)
            const isToday = actualTaskDate === today;
            const isOverdue = actualTaskDate < today;
            const isFuture = actualTaskDate > today;

            // Include future tasks so they can be shown in "Próximamente"
            return (isToday || isOverdue || isFuture) && (
                task.status === 'pending' ||
                task.status === 'blocked' ||
                task.status === 'completed' ||
                task.status === 'overdue' ||
                task.status === 'waiting_validation' ||
                task.status === 'upcoming'
            );
        }
        if (activeFilter === 'scheduled') {
            // Include upcoming status OR pending tasks with future dates
            const today = new Date().toISOString().split('T')[0];
            const taskDate = task.due;
            let actualTaskDate;

            if (taskDate === 'Hoy') actualTaskDate = today;
            else if (taskDate === 'Mañana') {
                const tmr = new Date();
                tmr.setDate(tmr.getDate() + 1);
                actualTaskDate = tmr.toISOString().split('T')[0];
            } else {
                actualTaskDate = taskDate;
            }

            return task.status === 'upcoming' || (task.status === 'pending' && actualTaskDate > today);
        }
        if (activeFilter === 'critical') {
            return task.priority === 'high' || task.category === 'Crítico' || task.status === 'overdue';
        }
        if (activeFilter === 'validation') {
            return task.status === 'waiting_validation';
        }

        return true;
    });

    // Cargar grupos y tareas desde el backend al montar el componente
    useEffect(() => {
        const loadGroupsAndTasks = async () => {
            if (!currentUser?.id) {
                setGroupsLoading(false);
                return;
            }

            setGroupsLoading(true);
            try {
                console.log('Cargando grupos desde el backend...');
                const allGroups = await apiGroups.getAll();
                console.log('Grupos cargados:', allGroups);

                // Si no hay grupos y es el primer acceso, crear grupo personal por defecto
                if (allGroups.length === 0) {
                    const isFirstAccess = !localStorage.getItem(`flowspace_initialized_${currentUser.id}`);
                    if (isFirstAccess) {
                        console.log('Primer acceso, creando grupo personal por defecto...');
                        try {
                            const defaultGroup = await apiGroups.create('Casa / Familia', 'personal');
                            setGroups([defaultGroup]);
                        } catch (error) {
                            console.error('Error creando grupo por defecto:', error);
                            setGroups([]);
                        }
                    } else {
                        setGroups([]);
                    }
                } else {
                    setGroups(allGroups);

                    // Cargar tareas de todos los grupos
                    console.log('Cargando tareas desde el backend...');
                    const allTasks = [];
                    for (const group of allGroups) {
                        try {
                            const groupTasks = await apiTasks.getByGroup(group.id);
                            console.log(`Tareas del grupo ${group.name}:`, groupTasks);
                            allTasks.push(...groupTasks);
                        } catch (error) {
                            console.error(`Error cargando tareas del grupo ${group.id}:`, error);
                        }
                    }
                    console.log('Total de tareas cargadas:', allTasks.length);
                    setTasks(allTasks);
                }
            } catch (error) {
                console.error('Error cargando grupos:', error);
                setGroups([]);
            } finally {
                setGroupsLoading(false);
            }
        };

        loadGroupsAndTasks();
    }, [currentUser?.id]);

    // WebSocket Connection
    useEffect(() => {
        if (!currentUser?.id) return;

        let ws = null;
        let reconnectTimer = null;

        const connectWebSocket = () => {
            try {
                const token = localStorage.getItem('flowspace_token');
                if (!token) return;

                // Construct WS URL based on API URL
                // If API_URL is http://localhost:3000/api, WS is ws://localhost:3000
                // If API_URL is https://api.domain.com/api, WS is wss://api.domain.com
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
                const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
                const wsHost = apiUrl.replace(/^https?:\/\//, '').replace(/\/api\/?$/, '');
                const wsUrl = `${wsProtocol}://${wsHost}?token=${token}`;

                ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                    // Send ping periodically to keep connection alive
                    setInterval(() => {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'ping' }));
                        }
                    }, 30000);
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);

                        if (data.type === 'task-created') {
                            setTasks(prev => {
                                if (prev.some(t => t.id === data.task.id)) return prev;
                                return [data.task, ...prev];
                            });
                        } else if (data.type === 'task-updated') {
                            setTasks(prev => prev.map(t => {
                                if (t.id === data.task.id) {
                                    // Si la tarea tiene más comentarios que antes, incrementar contador para otros usuarios
                                    const oldComments = t.comments || [];
                                    const newComments = data.task.comments || [];
                                    if (newComments.length > oldComments.length && t.assignees?.includes(currentUser?.id)) {
                                        // Solo incrementar si el usuario actual está asignado y no es el autor del último comentario
                                        const lastComment = newComments[newComments.length - 1];
                                        if (lastComment.userId !== currentUser?.id) {
                                            return {
                                                ...data.task,
                                                unreadComments: (t.unreadComments || 0) + 1
                                            };
                                        }
                                    }
                                    return data.task;
                                }
                                return t;
                            }));
                        } else if (data.type === 'task-deleted') {
                            setTasks(prev => prev.filter(t => t.id !== data.taskId));
                        } else if (data.type === 'notification') {

                            setAllSuggestions(prev => [data.notification, ...prev]);
                            // Solo mostrar indicador de Inteligencia si NO es un comentario normal
                            // Los comentarios se muestran en el botón de comentarios de la tarea
                            if (data.notification.type !== 'comment') {
                                setIntelligenceHasUnread(true);
                            }
                        }
                    } catch (error) {
                        console.error('Error procesando mensaje WS:', error);
                    }
                };

                ws.onclose = () => {
                    reconnectTimer = setTimeout(connectWebSocket, 5000);
                };

                ws.onerror = (error) => {
                    console.error('Error en WebSocket:', error);
                    ws.close();
                };

            } catch (error) {
                console.error('Error iniciando WebSocket:', error);
            }
        };

        connectWebSocket();

        return () => {
            if (ws) {
                ws.close();
            }
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
            }
        };
    }, [currentUser?.id]);

    // Detectar tareas vencidas y mostrar modal automáticamente
    useEffect(() => {
        if (!currentUser?.id || showOverdueTaskModal || !tasks.length) return;

        const today = new Date().toISOString().split('T')[0];
        const overdueTask = tasks.find(task => {
            // Solo tareas pendientes asignadas al usuario actual
            if (task.status !== 'pending' && task.status !== 'blocked') return false;
            if (!task.assignees || !task.assignees.includes(currentUser.id)) return false;

            // Verificar si está vencida
            const taskDate = task.due;
            let actualTaskDate;
            if (taskDate === 'Hoy') actualTaskDate = today;
            else if (taskDate === 'Mañana') {
                const tmr = new Date();
                tmr.setDate(tmr.getDate() + 1);
                actualTaskDate = tmr.toISOString().split('T')[0];
            } else {
                actualTaskDate = taskDate;
            }

            return actualTaskDate < today;
        });

        if (overdueTask) {
            setOverdueTask(overdueTask);
            setShowOverdueTaskModal(true);
        }
    }, [tasks, currentUser?.id, showOverdueTaskModal]);

    // Resetear resumen cuando cambian las tareas o el contexto
    useEffect(() => {
        setShowSummary(false);
        setSummaryData(null);
    }, [tasks, currentContext, activeGroupId]);

    // BASE DE DATOS DE EQUIPOS
    const [equipmentData, setEquipmentData] = useState({
        id: 'HPLC-02',
        groupId: 'lab1', // Pertenece a Lab Central
        name: 'Cromatógrafo Líquido #02',
        status: 'En Mantención',
        statusDate: '2023-11-18',
        lastMaintenance: '2023-10-15',
        nextMaintenance: '2023-11-25',
        logs: []
    });

    // SUGERENCIAS - Persistentes
    const [allSuggestions, setAllSuggestions] = useState(() => {
        const saved = localStorage.getItem('flowspace_suggestions');
        if (saved) {
            return JSON.parse(saved);
        }
        return [
            { id: 101, groupId: 'lab1', type: 'email', subject: 'Vencimiento Certificado Balanza', sender: 'Metrología', context: 'Vence en 3 días', suggestedAction: 'Agendar visita' },
            { id: 102, groupId: 'comite', type: 'email', subject: 'Acta Reunión Anterior', sender: 'Secretaría', context: 'Pendiente firma', suggestedAction: 'Firmar digitalmente' }
        ];
    });

    // Guardar sugerencias en localStorage cuando cambien
    useEffect(() => {
        localStorage.setItem('flowspace_suggestions', JSON.stringify(allSuggestions));
    }, [allSuggestions]);

    // Filtrar sugerencias por contexto/grupo activo y usuario
    const filteredSuggestions = useMemo(() => {
        return allSuggestions.filter(suggestion => {
            // NO mostrar notificaciones de comentarios normales en Inteligencia
            // Los comentarios se muestran en el botón de comentarios de la tarea
            if (suggestion.type === 'comment') {
                return false;
            }

            // Filtrar por usuario (notificaciones personales como "miembro salió", menciones)
            // Si tiene userId, SOLO mostrar si es para el usuario actual (comparación estricta)
            // Las notificaciones con userId (como menciones) tienen prioridad sobre el filtro de grupo
            if (suggestion.userId !== undefined && suggestion.userId !== null) {
                // Comparación estricta convertiendo a string para evitar problemas de tipo
                const suggestionUserIdStr = String(suggestion.userId);
                const currentUserIdStr = String(currentUser?.id || '');
                const matchesUser = suggestionUserIdStr === currentUserIdStr;

                if (!matchesUser) {
                    return false; // No mostrar esta notificación al usuario actual
                }
                // Si el userId coincide, mostrar la notificación independientemente del grupo
                // (esto es importante para menciones que pueden venir de cualquier grupo)
                return true;
            }

            // Filtrar por contexto/grupo (solo para notificaciones sin userId específico)
            let matchesGroup = false;
            if (activeGroupId === 'all') {
                const group = groups.find(g => g.id === suggestion.groupId);
                matchesGroup = group && group.type === currentContext;
            } else {
                matchesGroup = suggestion.groupId === activeGroupId;
            }

            // Si no coincide con el grupo, no mostrar la notificación

            return matchesGroup;
        });
    }, [allSuggestions, currentUser?.id, activeGroupId, currentContext, groups]);

    // Contar notificaciones no leídas
    const unreadNotifications = filteredSuggestions.filter(s => !s.read).length;

    const [showSummary, setShowSummary] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [newTaskInput, setNewTaskInput] = useState('');
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [selectedAssignees, setSelectedAssignees] = useState([currentUser?.id || 'user']);
    const [newTaskPriority, setNewTaskPriority] = useState('medium');
    const [detectedDate, setDetectedDate] = useState('');
    const [detectedTime, setDetectedTime] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('general');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [showSmartSuggestion, setShowSmartSuggestion] = useState(null);
    const [showEndDay, setShowEndDay] = useState(false);
    const [newLogInput, setNewLogInput] = useState('');
    const [isAddingLog, setIsAddingLog] = useState(false);
    const [activeTaskAction, setActiveTaskAction] = useState(null);
    const [actionReason, setActionReason] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false); // Nuevo estado para date picker
    const [datePickerMonth, setDatePickerMonth] = useState(new Date().getMonth());
    const [datePickerYear, setDatePickerYear] = useState(new Date().getFullYear());
    const [mobileSelectedPriority, setMobileSelectedPriority] = useState('medium');
    const datePickerRef = useRef(null);
    const textareaRef = useRef(null);
    const logEndRef = useRef(null);

    // Auto-resize del textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [newTaskInput]);

    useEffect(() => { if (showEquipmentDetail && logEndRef.current) logEndRef.current.scrollIntoView({ behavior: "smooth" }); }, [equipmentData.logs, showEquipmentDetail, isAddingLog]);

    // Debug: Verificar cuando cambian los estados del modal de equipo
    useEffect(() => {
        console.log('🔍 Estado del modal de equipo:', {
            showEquipmentDetail,
            currentEquipment: currentEquipment ? { qr_code: currentEquipment.qr_code, isNew: currentEquipment.isNew, name: currentEquipment.name } : null,
            shouldRender: showEquipmentDetail && currentEquipment
        });
    }, [showEquipmentDetail, currentEquipment]);

    // Toggle de Inteligencia (Con lógica de resizing para Sidebar)
    const toggleIntelligence = () => {
        const newState = !isIntelligenceExpanded;
        setIsIntelligenceExpanded(newState);
        if (newState) {
            setIntelligenceHasUnread(false);
            // No colapsamos "Tus Espacios" completamente, sino que flexbox ajustará las alturas
        }
    };

    // Watchers
    useEffect(() => {
        const troubleTask = tasks.find(t => t.postponeCount >= 2);
        if (troubleTask) {
            setAllSuggestions(prev => {
                if (prev.some(s => s.relatedTaskId === troubleTask.id)) return prev;
                setIntelligenceHasUnread(true);
                return [{
                    id: `alert-task-${troubleTask.id}`, // ID ÚNICO DINÁMICO
                    groupId: troubleTask.groupId,
                    type: 'system_alert',
                    sender: 'FlowSpace AI',
                    subject: `Problemas con "${troubleTask.title}"`,
                    context: 'Pospuesto reiteradamente',
                    suggestedAction: 'Agendar reunión de ayuda',
                    relatedTaskId: troubleTask.id
                }, ...prev];
            });
        }
    }, [tasks]);

    useEffect(() => {
        const lowerInput = newTaskInput.toLowerCase();
        if (lowerInput.includes('auditoría')) setSelectedCategory('auditoria');
        else if (lowerInput.includes('pagar')) setSelectedCategory('domestico');

        // Use the robust detectDateFromText function
        const detected = detectDateFromText(newTaskInput);
        if (detected) {
            setDetectedDate(detected);
        } else if (!detectedDate) {
            setDetectedDate('Hoy');
        }

        const timeMatch = newTaskInput.match(/\b([0-1]?[0-9]|2[0-3])[:h]([0-5][0-9])\b/);
        if (timeMatch) setDetectedTime(timeMatch[0]);

        if (detected && newTaskInput.length > 8 && lowerInput.includes('reunión')) {
            setShowSmartSuggestion({ type: 'calendar_event', text: `📅 Agendar para ${detected}`, actionData: { date: detected, isMeeting: true } });
        } else {
            setShowSmartSuggestion(null);
        }
    }, [newTaskInput]);

    const showInputToolbar = isInputFocused || newTaskInput.length > 0;

    // Sistema de Scoring Inteligente para el Resumen
    const calculateTaskScore = (task) => {
        let score = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Factor 1: Prioridad (0-30 puntos)
        const priorityScores = { high: 30, medium: 15, low: 5 };
        score += priorityScores[task.priority] || 0;

        // Factor 2: Estado (0-40 puntos)
        if (task.status === 'overdue') score += 40;
        else if (task.status === 'blocked') score += 25;
        else if (task.status === 'waiting_validation') score += 20;
        else if (task.status === 'pending') score += 10;

        // Factor 3: Cercanía del vencimiento (0-30 puntos)
        let dueDate = null;
        if (task.due === 'Hoy') {
            dueDate = new Date(today);
            score += 30; // Máxima urgencia
        } else if (task.due === 'Mañana') {
            dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() + 1);
            score += 25;
        } else if (task.due === 'Ayer') {
            dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() - 1);
            score += 35; // Ya vencido
        } else if (task.due && typeof task.due === 'string' && task.due.includes('-')) {
            try {
                dueDate = new Date(task.due);
                dueDate.setHours(0, 0, 0, 0);
                const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

                if (daysDiff < 0) {
                    score += 35; // Vencido
                } else if (daysDiff === 0) {
                    score += 30; // Hoy
                } else if (daysDiff === 1) {
                    score += 25; // Mañana
                } else if (daysDiff <= 3) {
                    score += 20; // Esta semana
                } else if (daysDiff <= 7) {
                    score += 15; // Esta semana próxima
                } else if (daysDiff <= 14) {
                    score += 10; // Próximas 2 semanas
                } else {
                    score += 5; // Más adelante
                }
            } catch {
                // Fecha inválida, no suma puntos
            }
        }

        // Factor 4: Categoría crítica (0-15 puntos)
        if (task.category === 'Crítico') score += 15;
        else if (task.category === 'Auditoría') score += 12;
        else if (task.category === 'Mantención') score += 8;

        // Factor 5: Postpone count (0-10 puntos)
        if (task.postponeCount >= 3) score += 10;
        else if (task.postponeCount === 2) score += 7;
        else if (task.postponeCount === 1) score += 4;

        // Factor 6: Múltiples asignados (indica importancia) (0-5 puntos)
        if (task.assignees && task.assignees.length > 1) score += 5;

        return score;
    };

    const generateIntelligentSummary = () => {
        if (filteredTasks.length === 0) return null;

        // Calcular score para todas las tareas
        const tasksWithScores = filteredTasks.map(task => ({
            ...task,
            score: calculateTaskScore(task)
        }));

        // Ordenar por score descendente
        const sortedTasks = [...tasksWithScores].sort((a, b) => b.score - a.score);

        // Obtener las top 5 más relevantes
        const topTasks = sortedTasks.slice(0, 5);

        // Analizar el estado general
        const overdueTasks = filteredTasks.filter(t => t.status === 'overdue');
        const blockedTasks = filteredTasks.filter(t => t.status === 'blocked');
        const validationTasks = filteredTasks.filter(t => t.status === 'waiting_validation');
        const postponedTasks = filteredTasks.filter(t => t.postponeCount >= 2);
        const criticalTasks = filteredTasks.filter(t =>
            (t.category === 'Crítico' || t.priority === 'high') &&
            t.status !== 'completed' &&
            t.status !== 'overdue'
        );
        const completedTasks = filteredTasks.filter(t => t.status === 'completed');
        const pendingTasks = filteredTasks.filter(t => t.status === 'pending' || t.status === 'waiting_validation');

        // Generar texto narrativo natural
        const generateNarrativeSummary = () => {
            const contextName = currentContext === 'work' ? 'laboral' : 'personal';
            const groupName = activeGroupId === 'all'
                ? (currentContext === 'work' ? 'todos tus espacios de trabajo' : 'tus espacios personales')
                : activeGroupObj?.name || 'este espacio';

            let narrative = [];

            // Saludo contextual
            narrative.push(`Hola ${currentUser?.name || 'usuario'}, he analizado tu actividad ${contextName} en ${groupName}.`);

            // Estado general
            if (completedTasks.length > 0) {
                narrative.push(`Veo que has completado ${completedTasks.length} ${completedTasks.length === 1 ? 'tarea' : 'tareas'} hoy, lo cual es un buen avance.`);
            }

            // Urgencias críticas
            if (overdueTasks.length > 0) {
                const taskNames = overdueTasks.slice(0, 2).map(t => `"${t.title}"`).join(' y ');
                narrative.push(`⚠️ **Atención inmediata requerida**: Tienes ${overdueTasks.length} ${overdueTasks.length === 1 ? 'tarea que ya venció' : 'tareas que ya vencieron'}. ${overdueTasks.length <= 2 ? `Específicamente, ${taskNames} ${overdueTasks.length === 1 ? 'requiere' : 'requieren'} tu atención ahora mismo.` : `Entre ellas destacan ${taskNames}, que deberían ser tu prioridad número uno.`}`);
            }

            // Bloqueos
            if (blockedTasks.length > 0) {
                const taskNames = blockedTasks.slice(0, 2).map(t => `"${t.title}"`).join(' y ');
                narrative.push(`🔒 **Bloqueos detectados**: ${blockedTasks.length} ${blockedTasks.length === 1 ? 'tarea está detenida' : 'tareas están detenidas'} por razones específicas. ${blockedTasks.length <= 2 ? taskNames : `Como ejemplo, ${taskNames}`} ${blockedTasks.length === 1 ? 'necesita' : 'necesitan'} que se resuelva ${blockedTasks[0]?.blockReason ? `el problema de "${blockedTasks[0].blockReason}"` : 'el bloqueo'} antes de continuar.`);
            }

            // Validaciones pendientes
            if (validationTasks.length > 0) {
                const taskNames = validationTasks.slice(0, 2).map(t => `"${t.title}"`).join(' y ');
                narrative.push(`👁️ **Pendientes de tu aprobación**: Hay ${validationTasks.length} ${validationTasks.length === 1 ? 'tarea que espera' : 'tareas que esperan'} tu validación. ${validationTasks.length <= 2 ? taskNames : `Entre ellas, ${taskNames}`} ${validationTasks.length === 1 ? 'está' : 'están'} lista${validationTasks.length > 1 ? 's' : ''} para que le des el visto bueno final.`);
            }

            // Tareas pospuestas
            if (postponedTasks.length > 0) {
                const taskNames = postponedTasks.slice(0, 2).map(t => `"${t.title}"`).join(' y ');
                narrative.push(`📅 **Patrón de postergación detectado**: He notado que ${postponedTasks.length} ${postponedTasks.length === 1 ? 'tarea ha sido' : 'tareas han sido'} pospuesta${postponedTasks.length > 1 ? 's' : ''} en múltiples ocasiones. ${postponedTasks.length <= 2 ? taskNames : `Específicamente, ${taskNames}`} ${postponedTasks.length === 1 ? 'lleva' : 'llevan'} un tiempo siendo movida${postponedTasks.length > 1 ? 's' : ''} de fecha. Podría ser útil revisar si ${postponedTasks.length === 1 ? 'necesita' : 'necesitan'} apoyo adicional o si hay algún impedimento que no se ha comunicado.`);
            }

            // Tareas críticas próximas
            if (criticalTasks.length > 0 && overdueTasks.length === 0) {
                const taskNames = criticalTasks.slice(0, 2).map(t => `"${t.title}"`).join(' y ');
                narrative.push(`🔥 **Tareas de alta prioridad**: Identifiqué ${criticalTasks.length} ${criticalTasks.length === 1 ? 'tarea crítica' : 'tareas críticas'} que ${criticalTasks.length === 1 ? 'requiere' : 'requieren'} atención prioritaria en los próximos días. ${criticalTasks.length <= 2 ? taskNames : `Entre ellas, ${taskNames}`} ${criticalTasks.length === 1 ? 'tiene' : 'tienen'} un peso importante en tu flujo de trabajo.`);
            }

            // Tareas más relevantes (si no hay insights críticos)
            if (overdueTasks.length === 0 && blockedTasks.length === 0 && validationTasks.length === 0 && postponedTasks.length === 0 && topTasks.length > 0) {
                const taskNames = topTasks.slice(0, 3).map(t => `"${t.title}"`).join(', ');
                narrative.push(`⭐ **Tareas más relevantes del día**: Basándome en la cercanía de vencimiento, prioridad e importancia, estas son las tareas que deberías tener en mente: ${taskNames}.`);
            }

            // Resumen final
            if (pendingTasks.length > 0) {
                narrative.push(`En total, tienes ${pendingTasks.length} ${pendingTasks.length === 1 ? 'tarea pendiente' : 'tareas pendientes'} que ${pendingTasks.length === 1 ? 'requiere' : 'requieren'} tu atención.`);
            }

            // Recomendación final
            if (overdueTasks.length > 0) {
                narrative.push(`Mi recomendación: Enfócate primero en resolver las tareas vencidas, ya que ${overdueTasks.length === 1 ? 'esta' : 'estas'} ${overdueTasks.length === 1 ? 'puede' : 'pueden'} estar generando dependencias para otros miembros del equipo.`);
            } else if (blockedTasks.length > 0) {
                narrative.push(`Mi sugerencia: Revisa los bloqueos activos. Resolver ${blockedTasks.length === 1 ? 'este impedimento' : 'estos impedimentos'} podría desbloquear el flujo de trabajo de manera significativa.`);
            } else if (validationTasks.length > 0) {
                narrative.push(`Sugerencia: Dedica unos minutos a revisar las validaciones pendientes. ${validationTasks.length === 1 ? 'Esta aprobación' : 'Estas aprobaciones'} ${validationTasks.length === 1 ? 'es' : 'son'} crucial para que ${validationTasks.length === 1 ? 'el trabajo pueda avanzar' : 'los trabajos puedan avanzar'}.`);
            } else if (topTasks.length > 0) {
                narrative.push(`Todo parece estar bajo control. Te sugiero mantener el ritmo y no perder de vista las tareas de alta prioridad que están próximas a vencer.`);
            }

            return narrative.join(' ');
        };

        return {
            totalTasks: filteredTasks.length,
            completedTasks: completedTasks.length,
            pendingTasks: pendingTasks.length,
            topTasks: topTasks,
            narrative: generateNarrativeSummary(),
            insights: {
                overdue: overdueTasks,
                blocked: blockedTasks,
                validation: validationTasks,
                postponed: postponedTasks,
                critical: criticalTasks
            }
        };
    };

    const [summaryData, setSummaryData] = useState(null);

    const handleGenerateSummary = () => {
        setIsThinking(true);
        setTimeout(() => {
            const data = generateIntelligentSummary();
            setSummaryData(data);
            setIsThinking(false);
            setShowSummary(true);
        }, 1500);
    };

    // Función para generar reporte semanal por espacio de trabajo
    const generateWeeklyReport = () => {
        // Filtrar tareas del espacio activo
        const spaceTasks = tasks.filter(task => {
            const taskGroup = groups.find(g => g.id === task.groupId);
            if (!taskGroup) return false;
            if (taskGroup.type !== currentContext) return false;
            if (activeGroupId !== 'all' && task.groupId !== activeGroupId) return false;
            return true;
        });

        if (spaceTasks.length === 0) return null;

        // Calcular rango de la semana (últimos 7 días)
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);

        // Función auxiliar para parsear fechas
        const parseDate = (dateStr) => {
            if (!dateStr) return null;
            if (dateStr === 'Hoy' || dateStr === 'hoy') return today;
            if (dateStr === 'Ayer' || dateStr === 'ayer') {
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                return yesterday;
            }
            try {
                const parsed = new Date(dateStr);
                if (!isNaN(parsed.getTime())) return parsed;
            } catch { }
            return null;
        };

        // Filtrar tareas de la última semana
        const weekTasks = spaceTasks.filter(task => {
            const taskDate = parseDate(task.due);
            if (!taskDate) return false;
            return taskDate >= weekAgo && taskDate <= today;
        });

        // Calcular métricas
        const completedTasks = weekTasks.filter(t => t.status === 'completed');
        const overdueTasks = weekTasks.filter(t => t.status === 'overdue');
        const blockedTasks = weekTasks.filter(t => t.status === 'blocked');
        const validationTasks = weekTasks.filter(t => t.status === 'waiting_validation');
        const pendingTasks = weekTasks.filter(t => t.status === 'pending' || t.status === 'upcoming');

        // Tareas que deberían haberse completado en la semana
        const shouldHaveCompleted = weekTasks.filter(t => {
            const taskDate = parseDate(t.due);
            if (!taskDate) return false;
            return taskDate < today && t.status !== 'completed';
        });

        // Calcular cumplimiento (%)
        const totalDue = shouldHaveCompleted.length + completedTasks.length;
        const completionRate = totalDue > 0 ? Math.round((completedTasks.length / totalDue) * 100) : 100;

        // Detectar cuellos de botella (categorías con más tareas atrasadas)
        const bottleneckCategories = {};
        overdueTasks.forEach(task => {
            bottleneckCategories[task.category] = (bottleneckCategories[task.category] || 0) + 1;
        });
        const topBottleneck = Object.entries(bottleneckCategories)
            .sort((a, b) => b[1] - a[1])[0];

        // Calcular estadísticas completas por miembro (ranking)
        const memberStats = {};

        // Inicializar todos los miembros del equipo
        teamMembers.forEach(member => {
            memberStats[member.id] = {
                name: member.name,
                avatar: member.avatar,
                completed: 0,
                overdue: 0,
                total: 0,
                completionRate: 0
            };
        });

        // Contar tareas completadas por miembro
        completedTasks.forEach(task => {
            task.assignees?.forEach(assignee => {
                if (memberStats[assignee]) {
                    memberStats[assignee].completed += 1;
                    memberStats[assignee].total += 1;
                }
            });
        });

        // Contar tareas atrasadas por miembro
        overdueTasks.forEach(task => {
            task.assignees?.forEach(assignee => {
                if (memberStats[assignee]) {
                    memberStats[assignee].overdue += 1;
                    memberStats[assignee].total += 1;
                }
            });
        });

        // Calcular tasa de cumplimiento por miembro
        Object.keys(memberStats).forEach(memberId => {
            const stats = memberStats[memberId];
            if (stats.total > 0) {
                stats.completionRate = Math.round((stats.completed / stats.total) * 100);
            }
        });

        // Crear ranking ordenado por completadas (luego por tasa de cumplimiento)
        const ranking = Object.entries(memberStats)
            .filter(([_, stats]) => stats.total > 0) // Solo miembros con tareas asignadas
            .map(([memberId, stats]) => ({ memberId, ...stats }))
            .sort((a, b) => {
                // Primero por completadas, luego por tasa de cumplimiento
                if (b.completed !== a.completed) return b.completed - a.completed;
                return b.completionRate - a.completionRate;
            });

        // Generar reporte narrativo más corto y amigable
        const groupName = activeGroupId === 'all'
            ? (currentContext === 'work' ? 'todos tus espacios' : 'tus espacios personales')
            : activeGroupObj?.name || 'este espacio';

        let narrative = [];

        // Saludo amigable
        const greetings = ['¡Hola equipo! 👋', '¡Buen trabajo esta semana! 💪', '¡Excelente semana! 🎯'];
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        narrative.push(`${randomGreeting}\n\n`);

        // Resumen muy breve
        if (completionRate >= 85) {
            narrative.push(`El equipo logró un **${completionRate}% de cumplimiento** esta semana. ¡Sigan así! 🚀\n\n`);
        } else if (completionRate >= 70) {
            narrative.push(`Cumplimiento del **${completionRate}%**. Vamos bien, pero podemos mejorar 💪\n\n`);
        } else {
            narrative.push(`Cumplimiento del **${completionRate}%**. Hay espacio para mejorar esta semana 📈\n\n`);
        }

        // Ranking top 3 con emojis motivacionales
        if (ranking.length > 0) {
            narrative.push(`**🏆 Ranking Semanal:**\n\n`);
            ranking.slice(0, 3).forEach((member, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
                const memberName = member.name;
                const emoji = member.completionRate === 100 ? '✨' : member.completionRate >= 80 ? '⭐' : '👍';
                narrative.push(`${medal} ${memberName}: ${member.completed} completadas ${emoji}\n`);
            });
            if (ranking.length > 3) {
                narrative.push(`\n... y ${ranking.length - 3} ${ranking.length - 3 === 1 ? 'miembro más' : 'miembros más'} en el equipo 💪\n`);
            }
        }

        // Mensaje motivacional final
        if (ranking.length > 0 && ranking[0].completed > 0) {
            const topMember = ranking[0];
            narrative.push(`\n${topMember.name} lidera con ${topMember.completed} ${topMember.completed === 1 ? 'tarea completada' : 'tareas completadas'}. ¡Gran trabajo! 👏`);
        }

        return {
            groupName: groupName,
            period: {
                start: weekAgo,
                end: today
            },
            metrics: {
                completionRate,
                completed: completedTasks.length,
                overdue: overdueTasks.length,
                blocked: blockedTasks.length,
                validation: validationTasks.length,
                pending: pendingTasks.length,
                total: weekTasks.length
            },
            insights: {
                bottleneck: topBottleneck ? { category: topBottleneck[0], count: topBottleneck[1] } : null
            },
            ranking: ranking,
            narrative: narrative.join('')
        };
    };

    // Generar reporte cuando se abre el modal de métricas
    useEffect(() => {
        if (showMetrics && currentContext === 'work') {
            const report = generateWeeklyReport();
            setWeeklyReport(report);
        } else if (!showMetrics) {
            setWeeklyReport(null);
        }
    }, [showMetrics, tasks, currentContext, activeGroupId, groups, teamMembers]);

    // Función para detectar fechas en texto en español
    const detectDateFromText = (text) => {
        const lowerText = text.toLowerCase();
        const today = new Date();

        // Helper para formatear fecha local YYYY-MM-DD
        const formatDateLocal = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // Días de la semana
        const daysOfWeek = {
            'lunes': 1,
            'martes': 2,
            'miércoles': 3,
            'miercoles': 3, // sin acento
            'jueves': 4,
            'viernes': 5,
            'sábado': 6,
            'sabado': 6,
            'domingo': 0
        };

        // Detectar "antes del [día]", "para el [día]", "el [día]", "hasta el [día]"
        const dayPattern = /(?:antes del|para el|el|hasta el)\s+(lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado|domingo)/i;
        const match = lowerText.match(dayPattern);

        if (match) {
            const dayName = match[1].toLowerCase();
            // Normalizar para quitar acentos
            const normalizedDay = dayName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const targetDay = daysOfWeek[normalizedDay] || daysOfWeek[dayName];

            if (targetDay !== undefined) {
                const currentDay = today.getDay();
                let daysToAdd = targetDay - currentDay;

                // Si el día ya pasó esta semana, ir a la próxima semana
                if (daysToAdd <= 0) {
                    daysToAdd += 7;
                }

                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + daysToAdd);
                return formatDateLocal(targetDate);
            }
        }

        // Detectar "mañana"
        if (lowerText.includes('mañana')) {
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            return formatDateLocal(tomorrow);
        }

        // Detectar "hoy"
        if (lowerText.includes('hoy')) {
            return formatDateLocal(today);
        }

        return null;
    };

    const handleAddTask = async () => {
        if (!newTaskInput.trim()) return;

        const categoryObj = categories.find(c => c.id === selectedCategory);
        const targetGroupId = activeGroupId === 'all' ? currentGroups[0]?.id : activeGroupId;

        const newTask = {
            groupId: targetGroupId,
            title: newTaskInput,
            creatorId: currentUser.id,
            assignees: selectedAssignees,
            category: categoryObj ? categoryObj.name : 'General',
            due: detectedDate || 'Hoy',
            time: detectedTime,
            status: (() => {
                // Determine status based on date
                const taskDate = detectedDate || 'Hoy';

                // Use local date for today comparison
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const today = `${year}-${month}-${day}`;

                let actualTaskDate;
                if (taskDate === 'Hoy') {
                    actualTaskDate = today;
                } else if (taskDate === 'Mañana') {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const tYear = tomorrow.getFullYear();
                    const tMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
                    const tDay = String(tomorrow.getDate()).padStart(2, '0');
                    actualTaskDate = `${tYear}-${tMonth}-${tDay}`;
                } else {
                    actualTaskDate = taskDate;
                }

                // Future tasks are 'upcoming', today or past are 'pending'
                return actualTaskDate > today ? 'upcoming' : 'pending';
            })(),
            postponeCount: 0,
            priority: newTaskPriority,
            comments: [],
            unreadComments: 0
        };

        try {
            // Guardar en el backend
            const createdTask = await apiTasks.create(newTask);
            console.log('Tarea creada en backend:', createdTask);

            // Actualizar estado local
            setTasks([...tasks, createdTask]);

            // Limpiar formulario
            setNewTaskInput('');
            setDetectedDate('');
            setDetectedTime('');
            setSelectedAssignees([currentUser.id]);
            setSelectedCategory('general');
            setShowSmartSuggestion(null);
            setIsInputFocused(false);
        } catch (error) {
            console.error('Error creando tarea:', error);
            alert('Error al crear la tarea. Por favor intenta nuevamente.');
        }
    };

    const handleProcessSuggestion = (suggestionId) => {
        const suggestion = allSuggestions.find(s => s.id === suggestionId);
        if (!suggestion) return;

        // Notificaciones de miembros que salen, validaciones, comentarios o menciones: marcar como leída y eliminar
        if (suggestion.type === 'member_left' || suggestion.type === 'validation_request' || suggestion.type === 'comment' || suggestion.type === 'mention') {
            setAllSuggestions(prev => prev.map(s =>
                s.id === suggestionId ? { ...s, read: true } : s
            ));
            // Eliminar después de un breve delay para que el usuario vea que se procesó
            setTimeout(() => {
                setAllSuggestions(prev => prev.filter(s => s.id !== suggestionId));
            }, 300);
            return;
        }

        if (suggestion.type === 'system_alert') {
            alert(`💡 FlowSpace AI:\n\nHe detectado que la tarea se ha pospuesto varias veces.\n\n>> Creando invitación de calendario para coordinar con el equipo...`);
        } else if (suggestion.type?.startsWith('equipment_alert')) {
            alert(`🔧 Gestión de Equipo:\n\nAbriendo bitácora del ${equipmentData.name} para gestionar incidencia...`);
            setShowEquipmentDetail(true);
        } else {
            const userId = currentUser?.id || 'user';
            const newTask = { id: Date.now(), groupId: suggestion.groupId, title: suggestion.suggestedAction, creatorId: userId, assignees: [userId], category: 'Desde Correo', due: 'Hoy', time: '', status: 'pending', postponeCount: 0, priority: 'medium', comments: [], unreadComments: 0 };
            setTasks([...tasks, newTask]);
        }
        setAllSuggestions(allSuggestions.filter(s => s.id !== suggestionId));
    };

    // Función para calcular puntos al completar una tarea
    const calculateTaskPoints = (task, completedBy) => {
        let points = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Base: Prioridad de la tarea (0-50 puntos)
        if (task.priority === 'high') points += 50;
        else if (task.priority === 'medium') points += 30;
        else if (task.priority === 'low') points += 15;

        // Factor 1: Plazo restante y días de atraso (bonus o penalización)
        if (task.due) {
            try {
                let dueDate;
                if (task.due === 'Hoy') {
                    dueDate = new Date(today);
                } else if (task.due === 'Mañana') {
                    dueDate = new Date(today);
                    dueDate.setDate(dueDate.getDate() + 1);
                } else {
                    dueDate = new Date(task.due);
                }
                dueDate.setHours(0, 0, 0, 0);

                const daysDiff = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

                if (daysDiff < 0) {
                    // Completada antes de tiempo: bonus
                    const daysEarly = Math.abs(daysDiff);
                    if (daysEarly === 1) points += 20; // 1 día antes
                    else if (daysEarly <= 3) points += 15; // 2-3 días antes
                    else if (daysEarly <= 7) points += 10; // 4-7 días antes
                    else points += 5; // Más de 7 días antes
                } else if (daysDiff === 0) {
                    // Completada justo a tiempo
                    points += 10;
                } else {
                    // Completada con atraso: penalización
                    const daysLate = daysDiff;
                    if (daysLate === 1) points -= 10; // 1 día de atraso
                    else if (daysLate <= 3) points -= 20; // 2-3 días de atraso
                    else if (daysLate <= 7) points -= 30; // 4-7 días de atraso
                    else points -= 50; // Más de 7 días de atraso
                }
            } catch {
                // Fecha inválida, no suma/resta puntos
            }
        }

        // Factor 2: Categoría crítica (0-25 puntos)
        if (task.category === 'Crítico') points += 25;
        else if (task.category === 'Auditoría') points += 20;
        else if (task.category === 'Mantención') points += 10;
        else if (task.category) points += 5; // Otras categorías

        // Factor 3: Veces postergadas (penalización: -5 puntos por cada postergación)
        if (task.postponeCount > 0) {
            points -= (task.postponeCount * 5);
        }

        // Factor 4: Múltiples asignados (indica importancia colaborativa) (0-15 puntos)
        if (task.assignees && task.assignees.length > 1) {
            points += 15;
        }

        // Asegurar que los puntos no sean negativos (mínimo 0)
        return Math.max(0, Math.round(points));
    };

    // Función para actualizar puntajes de un grupo
    const updateGroupScores = (groupId, userId, points) => {
        setGroups(groups.map(group => {
            if (group.id !== groupId) return group;

            const currentScores = group.scores || {};
            const currentUserScore = currentScores[userId] || 0;
            const newScore = currentUserScore + points;

            return {
                ...group,
                scores: {
                    ...currentScores,
                    [userId]: newScore
                }
            };
        }));
    };

    const handleTaskMainAction = async (task) => {
        if (task.status === 'blocked') return;

        const userId = currentUser?.id || 'user';

        // Verificar que el usuario esté asignado a la tarea o sea el creador
        const isAssigned = task.assignees.includes(userId);
        const isCreator = task.creatorId === userId;

        if (!isAssigned && !isCreator) {
            alert('Solo los miembros asignados pueden completar esta tarea');
            return;
        }

        try {
            // CASO 1: SOLICITAR VALIDACIÓN
            // Si es asignado pero hay otros asignados (o es el creador pero hay otros asignados),
            // y la tarea no está en validación, se solicita validación.
            const otherAssignees = task.assignees.filter(id => id !== userId);
            const needsValidation = otherAssignees.length > 0 || (isAssigned && !isCreator);

            if (needsValidation && task.status !== 'waiting_validation' && task.status !== 'completed') {
                // Usamos blockedBy para guardar quién solicitó la validación
                const updatedTask = {
                    ...task,
                    status: 'waiting_validation',
                    blockedBy: userId, // Guardamos quién completó la tarea
                    blockReason: 'Esperando validación de par'
                };

                // Optimistic update
                setTasks(tasks.map(t => t.id === task.id ? updatedTask : t));

                // API Call
                await apiTasks.update(task.id, {
                    status: 'waiting_validation',
                    blockedBy: userId,
                    blockReason: 'Esperando validación de par'
                });
                return;
            }

            // CASO 2: APROBAR VALIDACIÓN
            if (task.status === 'waiting_validation') {
                // Verificar que no sea el mismo usuario que solicitó la validación
                if (task.blockedBy === userId) {
                    alert('No puedes validar tu propia solicitud. Espera a que otro miembro del equipo lo haga.');
                    return;
                }

                const completedBy = userId;
                const points = calculateTaskPoints(task, completedBy);
                updateGroupScores(task.groupId, completedBy, points);

                const updates = {
                    status: 'completed',
                    completedAt: new Date().toISOString(),
                    completedBy,
                    pointsAwarded: points,
                    blockedBy: null, // Limpiar bloqueo
                    blockReason: null
                };

                const updatedTask = { ...task, ...updates };

                // Optimistic update
                setTasks(tasks.map(t => t.id === task.id ? updatedTask : t));

                // API Call
                await apiTasks.update(task.id, updates);
                return;
            }

            // CASO 3: REABRIR TAREA COMPLETADA
            if (task.status === 'completed') {
                // Siempre mostrar modal para restaurar cualquier tarea completada
                setTaskToRestore(task);
                // Asegurar que haya al menos el usuario actual si no hay assignees
                const initialAssignees = (task.assignees && task.assignees.length > 0)
                    ? [...task.assignees]
                    : [currentUser?.id || 'user'];
                setRestoreAssignees(initialAssignees);
                setRestoreDue(task.due || 'Hoy');
                setRestoreTime(task.time || '');
                setShowRestoreModal(true);
                return;
            } else {
                // COMPLETAR (Sin validación requerida)
                const points = calculateTaskPoints(task, userId);
                updateGroupScores(task.groupId, userId, points);

                const updates = {
                    status: 'completed',
                    completedAt: new Date().toISOString(),
                    completedBy: userId,
                    pointsAwarded: points
                };

                const updatedTask = { ...task, ...updates };

                // Optimistic update
                setTasks(tasks.map(t => t.id === task.id ? updatedTask : t));

                // API Call
                await apiTasks.update(task.id, updates);
            }
        } catch (error) {
            console.error('Error actualizando tarea:', error);
            alert('Error al actualizar la tarea');
            // Rollback optimistic update (re-fetch tasks ideally)
        }
    };

    const handleUnblock = (task) => {
        setTasks(tasks.map(t => t.id === task.id ? { ...t, status: 'pending', blockedBy: null, blockReason: null } : t));
    };

    const addComment = async (id, txt) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        const newComment = {
            id: Date.now(),
            user: currentUser.name || currentUser.username,
            avatar: currentUser.avatar,
            userId: currentUser.id,
            text: txt,
            date: 'Ahora'
        };

        // Actualización optimista: agregar comentario localmente inmediatamente
        const updatedComments = [...(task.comments || []), newComment];
        const updatedTasks = tasks.map(t => {
            if (t.id === id) {
                return {
                    ...t,
                    comments: updatedComments
                };
            }
            return t;
        });
        setTasks(updatedTasks);

        // Guardar comentario en el backend (el backend enviará las notificaciones por WebSocket)
        try {
            await apiTasks.update(id, {
                comments: updatedComments
            });
        } catch (error) {
            console.error('Error guardando comentario:', error);
            // Revertir actualización optimista en caso de error
            setTasks(tasks);
        }
    };
    const markCommentsRead = (taskId) => {
        // Marcar comentarios como leídos en la tarea
        setTasks(tasks.map(t => t.id === taskId ? { ...t, unreadComments: 0 } : t));

        // También marcar como leídas las notificaciones de menciones relacionadas con esta tarea
        setAllSuggestions(prev => prev.filter(s => {
            // Eliminar notificaciones de menciones de esta tarea que ya fueron leídas
            if (s.type === 'mention' && s.taskId === taskId) {
                return false; // Eliminar la notificación
            }
            return true; // Mantener otras notificaciones
        }));
    };
    const toggleAssignee = (memberId) => { if (selectedAssignees.includes(memberId)) { if (selectedAssignees.length > 1) setSelectedAssignees(selectedAssignees.filter(id => id !== memberId)); } else { setSelectedAssignees([...selectedAssignees, memberId]); } };
    const initiateAction = (taskId, type) => { const task = tasks.find(t => t.id === taskId); if (type === 'snooze' && task.postponeCount === 0) { executeSnooze(taskId, ''); return; } setActiveTaskAction({ taskId, type }); setActionReason(''); };
    const executeSnooze = async (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const newPostponeCount = (task.postponeCount || 0) + 1;
        const updatedTask = {
            ...task,
            due: 'Mañana',
            status: 'upcoming',
            postponeCount: newPostponeCount
        };

        // Actualización optimista
        setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
        setActiveTaskAction(null);

        // Guardar en el backend
        try {
            await apiTasks.update(taskId, {
                due: 'Mañana',
                status: 'upcoming',
                postponeCount: newPostponeCount
            });
        } catch (error) {
            console.error('Error actualizando tarea aplazada:', error);
        }

        // Sistema de alertas de aplazamientos
        if (newPostponeCount === 2) {
            // 2do aplazamiento: notificación a inteligencia
            const group = groups.find(g => g.id === task.groupId);
            const newNotification = {
                id: `postpone-alert-${taskId}-${Date.now()}`,
                groupId: task.groupId,
                type: 'postpone_alert',
                subject: `Tarea pospuesta múltiples veces`,
                context: group?.name || 'General',
                suggestedAction: `La tarea "${task.title}" ha sido pospuesta 2 veces. Podría necesitar atención.`,
                read: false,
                createdAt: new Date().toISOString(),
                taskId: taskId
            };
            setAllSuggestions(prev => [newNotification, ...prev]);
        } else if (newPostponeCount === 3) {
            // 3er aplazamiento: sugerir reunión
            const group = groups.find(g => g.id === task.groupId);
            const newNotification = {
                id: `postpone-meeting-${taskId}-${Date.now()}`,
                groupId: task.groupId,
                type: 'postpone_meeting',
                subject: `Reunión sugerida`,
                context: group?.name || 'General',
                suggestedAction: `La tarea "${task.title}" ha sido pospuesta 3 veces. Se sugiere coordinar una reunión para revisar el tema.`,
                read: false,
                createdAt: new Date().toISOString(),
                taskId: taskId
            };
            setAllSuggestions(prev => [newNotification, ...prev]);
        }
    };
    const executeBlock = (taskId, reason) => { setTasks(tasks.map(t => t.id === taskId ? { ...t, status: 'blocked', blockedBy: 'Tú', blockReason: reason } : t)); setActiveTaskAction(null); };
    const confirmAction = () => { if (!activeTaskAction || !actionReason.trim()) return; if (activeTaskAction.type === 'snooze') executeSnooze(activeTaskAction.taskId); else executeBlock(activeTaskAction.taskId, actionReason); };


    const handleScanQR = () => {
        setQrScannerMode('equipment'); // Modo para buscar equipos
        setShowQRScanner(true);
    };

    // Handler cuando se escanea un código para buscar equipo
    const handleEquipmentQRScanned = async (code) => {
        const codeUpper = code.trim().toUpperCase();
        console.log('🔵 [1] handleEquipmentQRScanned llamado con:', codeUpper);

        if (!codeUpper) {
            console.log('🔵 [2] Código vacío, saliendo');
            setPendingEquipmentCode(null);
            setShowCreateEquipmentConfirm(false);
            setShowMobileConfirm(false);
            return;
        }

        // Cerrar el modal mientras se busca
        console.log('🔵 [3] Cerrando escáner QR');
        setShowQRScanner(false);

        // Esperar un momento para que el modal se cierre visualmente (más tiempo en móvil)
        const closeDelay = isMobile ? 600 : 200;
        console.log('🔵 [4] Esperando', closeDelay, 'ms. isMobile:', isMobile);
        await new Promise(resolve => setTimeout(resolve, closeDelay));

        // Buscar el equipo
        console.log('🔵 [5] Llamando a handleEquipmentFound');
        const exists = await handleEquipmentFound(codeUpper);
        console.log('🔵 [6] handleEquipmentFound retornó:', exists);

        if (!exists) {
            console.log('🔵 [7] Equipo NO existe. Configurando modal...');
            // El equipo no existe
            setPendingEquipmentCode(codeUpper);
            console.log('🔵 [8] pendingEquipmentCode seteado a:', codeUpper);

            if (isMobile) {
                console.log('🔵 [9] Es móvil, activando showMobileConfirm');
                // En móvil usamos el modal simplificado
                setShowMobileConfirm(true);
                console.log('🔵 [10] showMobileConfirm = true');
            } else {
                console.log('🔵 [9] Es desktop, activando showCreateEquipmentConfirm');
                // En desktop usamos el modal normal
                setShowCreateEquipmentConfirm(true);
            }
        } else {
            console.log('🔵 [7] Equipo SÍ existe, modal de detalle debería abrirse');
        }
        console.log('🔵 [11] handleEquipmentQRScanned terminó');
    };

    // Handler para buscar equipo por código QR
    const handleEquipmentFound = async (code) => {
        console.log('🟢 [A] handleEquipmentFound llamado con:', code);
        try {
            const equipment = await apiEquipment.getByQR(code);
            console.log('🟢 [B] Respuesta de API:', equipment);

            if (equipment.error || equipment.success === false || !equipment.qr_code) {
                console.log('🟢 [C] Equipo NO encontrado (error o sin qr_code)');
                // Equipo no encontrado
                return false;
            }

            console.log('🟢 [D] Equipo encontrado, cargando logs...');
            // Equipo encontrado - cargar logs y mostrar detalle
            try {
                const logs = await apiEquipment.getLogs(code);
                setEquipmentLogs(logs || []);
                console.log('🟢 [E] Logs cargados:', logs?.length || 0);
            } catch (logError) {
                console.warn('🟢 [E] Error cargando logs:', logError);
                setEquipmentLogs([]);
            }

            console.log('🟢 [F] Mostrando modal de detalle de equipo');
            setCurrentEquipment(equipment);
            setShowEquipmentDetail(true);
            setShowQRScanner(false);
            return true;
        } catch (error) {
            console.error('🟢 [G] Error buscando equipo (excepción):', error);
            return false;
        }
    };

    // Handler para confirmar creación de equipo
    const handleConfirmCreateEquipment = async () => {
        console.log('✅ Usuario confirmó crear equipo. Código pendiente:', pendingEquipmentCode);
        if (pendingEquipmentCode) {
            const code = pendingEquipmentCode;

            // Primero cerrar el modal de confirmación
            setShowCreateEquipmentConfirm(false);
            setPendingEquipmentCode(null);

            // Esperar a que el modal se cierre completamente (más tiempo en móvil)
            const closeDelay = isMobile ? 600 : 300;
            console.log(`✅ Esperando ${closeDelay}ms para que el modal de confirmación se cierre...`);
            await new Promise(resolve => setTimeout(resolve, closeDelay));

            console.log('✅ Llamando a handleEquipmentNotFound con código:', code);
            handleEquipmentNotFound(code);
        }
    };


    // Handler para cancelar creación de equipo
    const handleCancelCreateEquipment = () => {
        setShowCreateEquipmentConfirm(false);
        setPendingEquipmentCode(null);
        // Volver a abrir el modal QR para que pueda escanear otro código
        setShowQRScanner(true);
    };

    // Handler cuando el equipo no existe y el usuario quiere crearlo
    const handleEquipmentNotFound = (code) => {
        console.log('🔧 Creando nuevo equipo con código:', code);

        // Configurar el nuevo equipo
        const newEquipment = {
            qr_code: code,
            isNew: true,
            name: '',
            status: 'operational'
        };

        console.log('🔧 Configurando equipo:', newEquipment);

        // Asegurar que el modal de QR esté cerrado
        setShowQRScanner(false);

        // Establecer los estados del equipo de forma síncrona
        // Primero establecer currentEquipment
        setCurrentEquipment(newEquipment);
        setEquipmentLogs([]);

        // Usar setTimeout con un delay más largo en móvil para asegurar que el modal QR se cierre completamente
        // y que el DOM se actualice antes de mostrar el nuevo modal
        const delay = isMobile ? 500 : 250;

        setTimeout(() => {
            console.log('🔧 Abriendo modal de equipo...');
            setShowEquipmentDetail(true);

            // Verificar después de un momento que los estados estén correctos
            setTimeout(() => {
                console.log('🔧 Estados verificados:');
                console.log('  - showEquipmentDetail:', true);
                console.log('  - currentEquipment:', newEquipment);
                console.log('  - Condición de renderizado:', true && newEquipment);
                console.log('  - isMobile:', isMobile);
            }, 50);
        }, delay);
    };
    const updateEquipmentStatus = (newStatus) => { const today = new Date().toISOString().split('T')[0]; setEquipmentData({ ...equipmentData, status: newStatus, logs: [{ id: Date.now(), date: today, user: currentUser.name, action: `Cambio de estado a: ${newStatus}` }, ...equipmentData.logs] }); };
    const handleAddLog = () => { if (!newLogInput.trim()) return; const today = new Date().toISOString().split('T')[0]; setEquipmentData({ ...equipmentData, logs: [{ id: Date.now(), date: today, user: currentUser.name, action: newLogInput }, ...equipmentData.logs] }); setNewLogInput(''); setIsAddingLog(false); };
    const handleSmartAction = () => { console.log(`📅 Evento creado: ${newTaskInput}`); handleAddTask(); setShowSmartSuggestion(null); };
    const handleCreateGroup = async () => {
        const groupName = newGroupName.trim();
        if (!groupName) {
            alert('Por favor ingresa un nombre para el espacio');
            return;
        }

        try {
            const newGroup = await apiGroups.create(groupName, currentContext);
            setGroups([...groups, newGroup]);
            setActiveGroupId(newGroup.id);
            setNewGroupName('');
            setShowGroupModal(false);
        } catch (error) {
            alert('Error al crear el espacio: ' + (error.message || error.error || 'Error desconocido'));
            console.error('Error creando grupo:', error);
        }
    };

    const handleDeleteGroup = (groupId) => {
        // No permitir eliminar si es el único grupo del contexto
        const contextGroups = groups.filter(g => g.type === currentContext);
        if (contextGroups.length <= 1) {
            alert('No puedes eliminar el último espacio de este contexto');
            return;
        }

        // No permitir eliminar si hay tareas asignadas
        const hasTasks = tasks.some(t => t.groupId === groupId);
        if (hasTasks) {
            if (!confirm('Este espacio tiene tareas asignadas. ¿Estás seguro de eliminarlo? Las tareas también se eliminarán.')) {
                return;
            }
            // Eliminar tareas del grupo
            setTasks(tasks.filter(t => t.groupId !== groupId));
        }

        // Eliminar el grupo
        setGroups(groups.filter(g => g.id !== groupId));

        // Si el grupo eliminado estaba activo, cambiar a "all"
        if (activeGroupId === groupId) {
            setActiveGroupId('all');
        }
    };

    const handleLeaveGroup = (groupId) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        setGroupToLeave(group);
        setShowLeaveGroupConfirm(true);
    };

    const confirmLeaveGroup = () => {
        if (!groupToLeave) return;

        const group = groups.find(g => g.id === groupToLeave.id);
        if (!group) return;

        // Remover al usuario actual de los miembros del grupo
        const updatedGroups = groups.map(g => {
            if (g.id === groupToLeave.id) {
                const updatedMembers = (g.members || []).filter(m => m !== currentUser?.id);
                return { ...g, members: updatedMembers };
            }
            return g;
        });
        setGroups(updatedGroups);

        // Crear notificaciones para otros miembros del grupo
        const groupMembers = group.members || [];
        const otherMembers = groupMembers.filter(m => m !== currentUser?.id);

        if (otherMembers.length > 0) {
            const newNotifications = otherMembers.map(memberId => ({
                id: `leave-${groupToLeave.id}-${memberId}-${Date.now()}`,
                groupId: groupToLeave.id,
                type: 'member_left',
                userId: memberId, // Notificación para este usuario específico
                subject: `${currentUser?.name || 'Un miembro'} dejó el espacio`,
                context: groupToLeave.name,
                suggestedAction: 'El espacio sigue activo',
                read: false,
                createdAt: new Date().toISOString()
            }));

            setAllSuggestions(prev => [...prev, ...newNotifications]);
        }

        // Si el grupo que se dejó estaba activo, cambiar a "all"
        if (activeGroupId === groupToLeave.id) {
            setActiveGroupId('all');
        }

        setShowLeaveGroupConfirm(false);
        setGroupToLeave(null);
    };

    const handleDeleteAccount = () => {
        const result = deleteUser(currentUser?.id);
        if (result.success) {
            // Cerrar sesión y redirigir
            onLogout();
        } else {
            alert('Error al eliminar cuenta: ' + result.error);
        }
    };
    const handleJoinGroup = async () => {
        const code = joinCodeInput.trim().toUpperCase();
        console.log('Intentando unirse con código:', code);

        if (!code) {
            alert('Por favor ingresa un código');
            return;
        }

        try {
            console.log('Llamando a apiGroups.join con código:', code);
            const group = await apiGroups.join(code);
            console.log('Grupo recibido del backend:', group);

            if (!group) {
                throw new Error('No se recibió el grupo del servidor');
            }

            // Recargar todos los grupos desde el backend para asegurar sincronización
            const allGroups = await apiGroups.getAll();
            console.log('Grupos recargados:', allGroups);
            setGroups(allGroups);
            setActiveGroupId(group.id);
            setJoinCodeInput('');
            setShowGroupModal(false);
            alert(`¡Te has unido exitosamente a "${group.name}"!`);
        } catch (error) {
            console.error('Error completo al unirse:', error);
            const errorMsg = error.message || error.error || 'Código inválido';
            alert('Error al unirse al espacio: ' + errorMsg);
        }
    };
    const getInviteGroupInfo = () => groups.find(g => g.id === inviteSelectedGroup) || { code: '---', name: 'Grupo' };

    // Función para confirmar restauración de tarea finalizada
    const confirmRestoreTask = async () => {
        if (!taskToRestore) return;

        if (restoreAssignees.length === 0) {
            alert('Debes asignar al menos un miembro a la tarea');
            return;
        }

        try {
            // Restar puntos si los había
            if (taskToRestore.completedBy && taskToRestore.pointsAwarded) {
                updateGroupScores(taskToRestore.groupId, taskToRestore.completedBy, -taskToRestore.pointsAwarded);
            }

            const updates = {
                status: 'pending',
                completedAt: null,
                completedBy: null,
                pointsAwarded: null,
                assignees: restoreAssignees,
                due: restoreDue,
                time: restoreTime || null
            };

            const updatedTask = { ...taskToRestore, ...updates };

            // Optimistic update
            setTasks(tasks.map(t => t.id === taskToRestore.id ? updatedTask : t));

            // API Call
            await apiTasks.update(taskToRestore.id, updates);

            setShowRestoreModal(false);
            setTaskToRestore(null);
            setRestoreAssignees([]);
            setRestoreDue('Hoy');
            setRestoreTime('');
        } catch (error) {
            console.error('Error restaurando tarea:', error);
            alert('Error al restaurar la tarea: ' + (error.message || error.error || 'Error desconocido'));
        }
    };

    // Funciones para el date picker personalizado estilo iOS
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const getDaysInMonth = (month, year) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month, year) => {
        return new Date(year, month, 1).getDay();
    };

    const formatDateForDisplay = (dateStr) => {
        if (!dateStr || dateStr === 'Hoy' || dateStr === 'Mañana' || dateStr === 'Ayer') return dateStr;
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            if (date.toDateString() === today.toDateString()) return 'Hoy';
            if (date.toDateString() === tomorrow.toDateString()) return 'Mañana';

            return `${date.getDate()} ${months[date.getMonth()].substring(0, 3)}`;
        } catch {
            return dateStr;
        }
    };

    const handleDateSelect = (day) => {
        const selectedDate = new Date(datePickerYear, datePickerMonth, day);
        const formatted = selectedDate.toISOString().split('T')[0];
        setDetectedDate(formatted);
        setShowDatePicker(false);
    };

    const handlePrevMonth = () => {
        if (datePickerMonth === 0) {
            setDatePickerMonth(11);
            setDatePickerYear(datePickerYear - 1);
        } else {
            setDatePickerMonth(datePickerMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (datePickerMonth === 11) {
            setDatePickerMonth(0);
            setDatePickerYear(datePickerYear + 1);
        } else {
            setDatePickerMonth(datePickerMonth + 1);
        }
    };


    // Cerrar date picker cuando se hace clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
                // Add null check before calling closest()
                if (!event.target) return;

                // Verificar que no sea el botón que abre el date picker
                const button = event.target.closest('button');
                if (button && (button.textContent.includes('Hoy') || button.textContent.includes('Mañana') || button.querySelector('svg'))) {
                    // Verificar si es el botón del date picker
                    const isDatePickerButton = datePickerRef.current.contains(button);
                    if (!isDatePickerButton) {
                        setShowDatePicker(false);
                    }
                    return;
                }
                setShowDatePicker(false);
            }
        };

        if (showDatePicker) {
            // Usar un pequeño delay para permitir que los clicks dentro del date picker se procesen primero
            setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 100);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showDatePicker]);

    // Componente SidebarItem
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

    // Estado global para rastrear qué chats están abiertos (por taskId)
    const [openChats, setOpenChats] = useState(new Set());

    const handleToggleChat = (taskId) => {
        setOpenChats(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) {
                newSet.delete(taskId);
            } else {
                newSet.add(taskId);
            }
            return newSet;
        });
    };

    // Componente TaskCard




    // Función para abrir una lista (smart o group)
    const openMobileList = (config) => {
        setActiveListConfig(config);
        setMobileView('list');
    };

    // Función para volver al dashboard
    const goToDashboard = () => {
        setMobileView('dashboard');
        setActiveListConfig(null);
    };

    // Si es móvil, renderizar versión iOS Reminders
    if (isMobile) {
        // Calcular KPIs dinámicamente según el contexto actual
        const calculateTodayTasks = () => {
            const today = new Date().toISOString().split('T')[0];
            return tasks.filter(t => {
                const taskGroup = groups.find(g => g.id === t.groupId);
                if (!taskGroup || taskGroup.type !== currentContext) return false;

                const taskDate = t.due;
                let actualTaskDate;
                if (taskDate === 'Hoy') actualTaskDate = today;
                else if (taskDate === 'Mañana') {
                    const tmr = new Date();
                    tmr.setDate(tmr.getDate() + 1);
                    actualTaskDate = tmr.toISOString().split('T')[0];
                } else actualTaskDate = taskDate;

                const isToday = actualTaskDate === today;
                const isOverdue = actualTaskDate < today;
                return (isToday || isOverdue) && (t.status === 'pending' || t.status === 'blocked');
            }).length;
        };

        const calculateScheduledTasks = () => {
            const today = new Date().toISOString().split('T')[0];
            return tasks.filter(t => {
                const taskGroup = groups.find(g => g.id === t.groupId);
                if (!taskGroup || taskGroup.type !== currentContext) return false;

                if (t.status === 'upcoming') return true;
                if (t.status !== 'pending') return false;

                let date = t.due;
                if (date === 'Hoy') date = today;
                else if (date === 'Mañana') {
                    const d = new Date(); d.setDate(d.getDate() + 1);
                    date = d.toISOString().split('T')[0];
                }
                return date > today;
            }).length;
        };

        const calculateCompletedTasks = () => {
            const today = new Date().toISOString().split('T')[0];
            return tasks.filter(t => {
                const taskGroup = groups.find(g => g.id === t.groupId);
                if (!taskGroup || taskGroup.type !== currentContext) return false;

                // Solo mostrar completadas HOY para mantener relevancia diaria
                if (t.status !== 'completed') return false;
                if (!t.completedAt) return false;

                const completedDate = t.completedAt.split('T')[0];
                return completedDate === today;
            }).length;
        };

        const calculateToValidateTasks = () => {
            // Tareas que YO debo validar (soy el creador y están esperando validación)
            return tasks.filter(t => {
                const taskGroup = groups.find(g => g.id === t.groupId);
                if (!taskGroup || taskGroup.type !== currentContext) return false;
                return t.status === 'waiting_validation' && t.creatorId === currentUser?.id;
            }).length;
        };

        const calculateMyPendingValidations = () => {
            // Tareas que YO hice y están esperando que alguien más valide (excluyendo las que yo mismo debo validar)
            return tasks.filter(t => {
                const taskGroup = groups.find(g => g.id === t.groupId);
                if (!taskGroup || taskGroup.type !== currentContext) return false;
                return t.status === 'waiting_validation' && t.assignees.includes(currentUser?.id) && t.creatorId !== currentUser?.id;
            }).length;
        };

        const todayTasksCount = calculateTodayTasks();
        const scheduledTasksCount = calculateScheduledTasks();
        const completedTasksCount = calculateCompletedTasks();
        const toValidateCount = calculateToValidateTasks();
        const myPendingValidationCount = calculateMyPendingValidations();

        // Filtrar tareas según la vista activa
        const getFilteredTasksForView = () => {
            if (!activeListConfig) return [];

            if (activeListConfig.type === 'smart') {
                if (activeListConfig.id === 'today') {
                    const today = new Date().toISOString().split('T')[0];
                    return tasks.filter(t => {
                        const taskGroup = groups.find(g => g.id === t.groupId);
                        if (!taskGroup || taskGroup.type !== currentContext) return false;

                        const taskDate = t.due;
                        let actualTaskDate;
                        if (taskDate === 'Hoy') actualTaskDate = today;
                        else if (taskDate === 'Mañana') {
                            const tmr = new Date();
                            tmr.setDate(tmr.getDate() + 1);
                            actualTaskDate = tmr.toISOString().split('T')[0];
                        } else actualTaskDate = taskDate;

                        const isToday = actualTaskDate === today;
                        const isOverdue = actualTaskDate < today;
                        return (isToday || isOverdue) && (t.status === 'pending' || t.status === 'blocked');
                    });
                } else if (activeListConfig.id === 'scheduled') {
                    const today = new Date().toISOString().split('T')[0];
                    return tasks.filter(t => {
                        const taskGroup = groups.find(g => g.id === t.groupId);
                        if (!taskGroup || taskGroup.type !== currentContext) return false;

                        if (t.status === 'upcoming') return true;
                        if (t.status !== 'pending') return false;

                        let date = t.due;
                        if (date === 'Hoy') date = today;
                        else if (date === 'Mañana') {
                            const d = new Date(); d.setDate(d.getDate() + 1);
                            date = d.toISOString().split('T')[0];
                        }
                        return date > today;
                    });
                } else if (activeListConfig.id === 'completed') {
                    const today = new Date().toISOString().split('T')[0];
                    return tasks.filter(t => {
                        const taskGroup = groups.find(g => g.id === t.groupId);
                        if (!taskGroup || taskGroup.type !== currentContext) return false;

                        if (t.status !== 'completed') return false;
                        if (!t.completedAt) return false;

                        const completedDate = t.completedAt.split('T')[0];
                        return completedDate === today;
                    });
                } else if (activeListConfig.id === 'to_validate') {
                    // Tareas que YO debo validar (soy el creador)
                    return tasks.filter(t => {
                        const taskGroup = groups.find(g => g.id === t.groupId);
                        if (!taskGroup || taskGroup.type !== currentContext) return false;
                        return t.status === 'waiting_validation' && t.creatorId === currentUser?.id;
                    });
                } else if (activeListConfig.id === 'my_pending_validation') {
                    // Tareas que YO hice y esperan validación DE OTRO (no soy el creador)
                    return tasks.filter(t => {
                        const taskGroup = groups.find(g => g.id === t.groupId);
                        if (!taskGroup || taskGroup.type !== currentContext) return false;
                        return t.status === 'waiting_validation' && t.assignees.includes(currentUser?.id) && t.creatorId !== currentUser?.id;
                    });
                }
            } else if (activeListConfig.type === 'group') {
                return tasks.filter(t => {
                    const taskGroup = groups.find(g => g.id === t.groupId);
                    return taskGroup && taskGroup.id === activeListConfig.id && taskGroup.type === currentContext;
                });
            }
            return [];
        };

        const filteredTasksForView = getFilteredTasksForView();

        return (
            <div className="h-screen overflow-hidden relative gradient-bg" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>
                {/* Safe area para iPhone notch - fondo con gradiente */}
                <div className="h-full flex flex-col gradient-bg" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

                    {/* VISTA DASHBOARD */}
                    {mobileView === 'dashboard' && (
                        <>
                            {/* HEADER - "Mis Listas" - Fondo gris integrado */}
                            <header className="px-4 py-3 flex items-center justify-between bg-[#F2F2F7]" style={{ paddingTop: 'max(12px, env(safe-area-inset-top) + 12px)' }}>
                                <div className="w-8" /> {/* Spacer izquierdo */}
                                <h1 className="text-2xl font-bold text-slate-900">Mis Listas</h1>
                                <button
                                    onClick={() => setShowMobileUserMenu(!showMobileUserMenu)}
                                    className="p-1"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                        <span style={{ fontSize: '1rem', fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>
                                            {currentUser?.avatar || '👤'}
                                        </span>
                                    </div>
                                </button>
                            </header>

                            {/* CONTENIDO PRINCIPAL - Fondo con gradiente, padding para botón flotante */}
                            <main className="flex-1 overflow-y-auto px-4 pb-20">
                                {/* Context Switcher */}
                                <div className="mb-6">
                                    <div className="glass-card p-1 rounded-2xl flex">
                                        <button
                                            onClick={() => {
                                                setCurrentContext('work');
                                                goToDashboard();
                                            }}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${currentContext === 'work'
                                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                                                : 'text-slate-600 hover:bg-white/50'
                                                }`}
                                        >
                                            Trabajo
                                        </button>
                                        <button
                                            onClick={() => {
                                                setCurrentContext('personal');
                                                goToDashboard();
                                            }}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${currentContext === 'personal'
                                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                                : 'text-slate-600 hover:bg-white/50'
                                                }`}
                                        >
                                            Personal
                                        </button>
                                    </div>
                                </div>

                                {/* Intelligence / Notificaciones - Compacto y Expandible */}
                                {allSuggestions.length > 0 && (
                                    <div className="mb-6">
                                        <button
                                            onClick={() => {
                                                setIsNovedadesExpanded(!isNovedadesExpanded);
                                                if (!isNovedadesExpanded) {
                                                    setLastViewedSuggestionCount(allSuggestions.length);
                                                }
                                            }}
                                            className="w-full flex items-center justify-between glass-card p-3 rounded-2xl mb-2 active:scale-98 transition-all"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Sparkles size={20} className="text-blue-500" />
                                                <span className="font-bold text-slate-900">Novedades</span>
                                                {allSuggestions.length > lastViewedSuggestionCount && (
                                                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                                                        {allSuggestions.length - lastViewedSuggestionCount}
                                                    </span>
                                                )}
                                            </div>
                                            {isNovedadesExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                                        </button>

                                        {isNovedadesExpanded && (
                                            <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 scrollbar-hide animate-in fade-in slide-in-from-top-2 duration-300">
                                                {allSuggestions.map(suggestion => (
                                                    <div
                                                        key={suggestion.id}
                                                        onClick={() => handleProcessSuggestion(suggestion.id)}
                                                        className="min-w-[280px] glass-card p-4 rounded-2xl border-l-4 border-l-blue-500 shadow-sm active:scale-95 transition-all"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className="mt-1">
                                                                {suggestion.type === 'postpone_alert' || suggestion.type === 'postpone_meeting' ? (
                                                                    <AlertTriangle size={20} className="text-amber-500" />
                                                                ) : suggestion.type === 'system_alert' ? (
                                                                    <AlertCircle size={20} className="text-red-500" />
                                                                ) : (
                                                                    <Sparkles size={20} className="text-blue-500" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-slate-800 text-sm">{suggestion.subject}</h3>
                                                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{suggestion.suggestedAction}</p>
                                                                <p className="text-[10px] text-slate-400 mt-2 font-medium uppercase tracking-wide">
                                                                    {suggestion.context}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Smart Lists - Hoy y Programado */}
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    {/* Tarjeta "Hoy" - BOTÓN */}
                                    <button
                                        onClick={() => openMobileList({
                                            type: 'smart',
                                            id: 'today',
                                            title: 'Hoy',
                                            color: '#007AFF'
                                        })}
                                        className="glass-card rounded-2xl p-4 active:scale-95 transition-all text-left hover:shadow-lg"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                                                <Calendar size={22} className="text-white" />
                                            </div>
                                            <span className="text-3xl font-bold gradient-text">{todayTasksCount}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-700">Hoy</p>
                                    </button>

                                    {/* Tarjeta "Programado" - BOTÓN */}
                                    <button
                                        onClick={() => openMobileList({
                                            type: 'smart',
                                            id: 'scheduled',
                                            title: 'Programado',
                                            color: '#FF3B30'
                                        })}
                                        className="glass-card rounded-2xl p-4 active:scale-95 transition-all text-left hover:shadow-lg"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                                                <Clock size={22} className="text-white" />
                                            </div>
                                            <span className="text-3xl font-bold gradient-text">{scheduledTasksCount}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-700">Programado</p>
                                    </button>

                                    {/* Tarjeta "Terminados" - BOTÓN */}
                                    <button
                                        onClick={() => openMobileList({
                                            type: 'smart',
                                            id: 'completed',
                                            title: 'Terminados',
                                            color: '#34C759' // Green
                                        })}
                                        className="glass-card rounded-2xl p-4 active:scale-95 transition-all text-left hover:shadow-lg"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                                                <CheckCircle2 size={22} className="text-white" />
                                            </div>
                                            <span className="text-3xl font-bold gradient-text">{completedTasksCount}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-700">Terminados</p>
                                    </button>

                                    {/* Tarjeta "Por Validar" (Incoming) - BOTÓN */}
                                    <button
                                        onClick={() => openMobileList({
                                            type: 'smart',
                                            id: 'to_validate',
                                            title: 'Por Validar',
                                            color: '#AF52DE' // Purple
                                        })}
                                        className="glass-card rounded-2xl p-4 active:scale-95 transition-all text-left hover:shadow-lg"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                                                <ShieldCheck size={22} className="text-white" />
                                            </div>
                                            <span className="text-3xl font-bold gradient-text">{toValidateCount}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-700">Por Validar</p>
                                    </button>

                                    {/* Tarjeta "En Validación" (Outgoing) - BOTÓN */}
                                    <button
                                        onClick={() => openMobileList({
                                            type: 'smart',
                                            id: 'my_pending_validation',
                                            title: 'En Validación',
                                            color: '#F59E0B' // Amber
                                        })}
                                        className="glass-card rounded-2xl p-4 active:scale-95 transition-all text-left hover:shadow-lg"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                                                <Clock size={22} className="text-white" />
                                            </div>
                                            <span className="text-3xl font-bold gradient-text">{myPendingValidationCount}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-700">En Validación</p>
                                    </button>
                                </div>

                                {/* Sección "Mis Listas" - Bloque con glassmorphism */}
                                <div className="glass-card rounded-2xl overflow-hidden shadow-lg">
                                    {currentGroups.map((group, index) => {
                                        const groupTaskCount = tasks.filter(t => {
                                            const taskGroup = groups.find(g => g.id === t.groupId);
                                            return taskGroup && taskGroup.id === group.id && taskGroup.type === currentContext;
                                        }).length;

                                        const groupColor = currentContext === 'work' ? 'bg-blue-500' : 'bg-emerald-500';

                                        return (
                                            <button
                                                key={group.id}
                                                onClick={() => openMobileList({
                                                    type: 'group',
                                                    id: group.id,
                                                    title: group.name,
                                                    color: currentContext === 'work' ? '#007AFF' : '#34C759'
                                                })}
                                                className={`w-full flex items-center justify-between px-4 py-3 ${index < currentGroups.length - 1 ? 'border-b border-slate-200' : ''} active:bg-slate-50 transition-colors`}
                                                style={{ borderLeft: 'none' }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full ${groupColor} flex items-center justify-center`}>
                                                        <Folder size={18} className="text-white" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-base font-medium text-slate-900">{group.name}</p>
                                                        <p className="text-sm text-slate-500">{groupTaskCount} tareas</p>
                                                    </div>
                                                </div>
                                                <ChevronRight size={20} className="text-slate-400" />
                                            </button>
                                        );
                                    })}

                                    {/* Botón discreto "+ Añadir" */}
                                    <button
                                        onClick={() => {
                                            setGroupModalTab('create');
                                            setShowGroupModal(true);
                                        }}
                                        className="w-full flex items-center justify-between px-4 py-3 border-t border-slate-200 active:bg-slate-50 transition-colors"
                                        style={{ borderLeft: 'none' }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                <Plus size={16} className="text-slate-600" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-base font-medium text-slate-600">Añadir</p>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </main>
                        </>
                    )}

                    {/* VISTA LIST (Detalle de Lista) */}
                    {mobileView === 'list' && activeListConfig && (
                        <>
                            {/* HEADER DE NAVEGACIÓN - Fondo gris integrado */}
                            <header className="px-4 py-3 flex items-center justify-between bg-[#F2F2F7]" style={{ paddingTop: 'max(12px, env(safe-area-inset-top) + 12px)' }}>
                                <button
                                    onClick={goToDashboard}
                                    className="text-blue-600 text-base font-medium flex items-center gap-1"
                                >
                                    <ChevronLeft size={20} />
                                    <span>Listas</span>
                                </button>
                                <div className="w-10" /> {/* Spacer para mantener alineación */}
                            </header>

                            {/* TÍTULO ENORME DEL COLOR DE LA LISTA */}
                            <div className="px-4 pb-4">
                                <h1
                                    className="text-4xl font-bold"
                                    style={{ color: activeListConfig.color }}
                                >
                                    {activeListConfig.title}
                                </h1>
                            </div>

                            {/* LISTA DE TAREAS - Separadas por completadas/pendientes - Fondo gris, padding para botón flotante */}
                            <main className="flex-1 overflow-y-auto px-4 bg-[#F2F2F7] pb-20">
                                {(() => {
                                    // Función para obtener fecha de vencimiento como Date para ordenar (normalizada)
                                    const getDueDate = (task) => {
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);

                                        if (!task.due) return new Date('9999-12-31'); // Sin fecha = último

                                        // Normalizar "Hoy" y "Mañana" siempre a la fecha actual
                                        if (task.due === 'Hoy') {
                                            return new Date(today);
                                        }
                                        if (task.due === 'Mañana') {
                                            const tomorrow = new Date(today);
                                            tomorrow.setDate(tomorrow.getDate() + 1);
                                            return tomorrow;
                                        }

                                        // Para fechas específicas, parsear correctamente
                                        try {
                                            const parsedDate = new Date(task.due);
                                            parsedDate.setHours(0, 0, 0, 0);
                                            return parsedDate;
                                        } catch {
                                            return new Date('9999-12-31');
                                        }
                                    };

                                    // Ordenar tareas pendientes por fecha de vencimiento (más cercanas primero)
                                    const pendingTasks = filteredTasksForView
                                        .filter(t => t.status !== 'completed')
                                        .sort((a, b) => {
                                            const dateA = getDueDate(a);
                                            const dateB = getDueDate(b);

                                            // Si las fechas son iguales, ordenar por prioridad
                                            if (dateA.getTime() === dateB.getTime()) {
                                                const priorityOrder = { high: 0, medium: 1, low: 2 };
                                                return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
                                            }

                                            return dateA - dateB; // Ascendente: las que vencen antes primero
                                        });
                                    const completedTasks = filteredTasksForView.filter(t => t.status === 'completed');

                                    if (pendingTasks.length === 0 && completedTasks.length === 0) {
                                        return (
                                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                                <CheckCircle2 size={48} className="text-slate-300 mb-4" />
                                                <p className="text-base font-medium text-slate-600 mb-1">No hay tareas</p>
                                                <p className="text-sm text-slate-500">Toca el botón + abajo para agregar una</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-0">
                                            {/* TAREAS PENDIENTES */}
                                            {pendingTasks.length > 0 && pendingTasks.map((task, index) => {
                                                const isOverdue = task.status === 'pending' && task.due && task.due !== 'Hoy' && task.due !== 'Mañana' && new Date(task.due) < new Date();

                                                // Obtener miembros asignados - Parseo robusto
                                                let taskAssignees = task.assignees || [];
                                                if (typeof taskAssignees === 'string') {
                                                    try {
                                                        taskAssignees = JSON.parse(taskAssignees);
                                                    } catch (e) {
                                                        taskAssignees = [];
                                                    }
                                                }
                                                if (!Array.isArray(taskAssignees)) {
                                                    taskAssignees = [];
                                                }

                                                // Buscar usuarios en allUsers y teamMembers
                                                const assigneeUsers = taskAssignees
                                                    .map(assigneeId => {
                                                        // Buscar primero en allUsers
                                                        let user = allUsers.find(u => u.id === assigneeId);
                                                        // Si no se encuentra, buscar en teamMembers
                                                        if (!user) {
                                                            const teamMember = teamMembers.find(m => m.id === assigneeId);
                                                            if (teamMember) {
                                                                user = teamMember;
                                                            }
                                                        }
                                                        return user;
                                                    })
                                                    .filter(Boolean);

                                                return (
                                                    <div
                                                        key={task.id}
                                                        className={`flex items-start gap-3 px-0 py-3 ${index < pendingTasks.length - 1 ? 'border-b border-slate-200' : ''} active:bg-slate-50/50 transition-colors`}
                                                        onClick={() => setSelectedTaskForChat(task)}
                                                    >
                                                        {/* Checkbox que se llena del color de la lista */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleTaskMainAction(task);
                                                            }}
                                                            className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${task.status === 'completed'
                                                                ? 'border-transparent shadow-sm'
                                                                : task.status === 'waiting_validation'
                                                                    ? 'bg-transparent' // Validation tasks have colored borders
                                                                    : 'border-slate-300'
                                                                }`}
                                                            style={
                                                                task.status === 'completed'
                                                                    ? { backgroundColor: activeListConfig.color }
                                                                    : task.status === 'waiting_validation'
                                                                        ? {
                                                                            borderColor: task.creatorId === currentUser?.id ? '#AF52DE' : '#F59E0B',
                                                                            color: task.creatorId === currentUser?.id ? '#AF52DE' : '#F59E0B'
                                                                        }
                                                                        : {}
                                                            }
                                                        >
                                                            {task.status === 'completed' && (
                                                                <Check size={14} className="text-white" strokeWidth={3} />
                                                            )}
                                                            {task.status === 'waiting_validation' && (
                                                                <Eye size={14} strokeWidth={2.5} />
                                                            )}
                                                        </button>

                                                        {/* Contenido */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-[15px] leading-snug ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                                                {task.title}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                                {/* Prioridad - Icono sutil */}
                                                                {task.priority && task.priority !== 'medium' && (
                                                                    <span className={`inline-flex items-center ${task.priority === 'high'
                                                                        ? 'text-red-600'
                                                                        : task.priority === 'low'
                                                                            ? 'text-slate-400'
                                                                            : ''
                                                                        }`}>
                                                                        <Flag size={12} className={task.priority === 'high' ? 'fill-red-600' : ''} />
                                                                    </span>
                                                                )}
                                                                {/* Fecha con estilo sutil */}
                                                                {task.due && (
                                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${isOverdue
                                                                        ? 'bg-red-100 text-red-700 font-medium'
                                                                        : 'bg-blue-50 text-blue-700'
                                                                        }`}>
                                                                        {task.due}
                                                                    </span>
                                                                )}
                                                                {/* Hora */}
                                                                {task.time && (
                                                                    <span className="text-xs text-slate-500">
                                                                        {task.time}
                                                                    </span>
                                                                )}
                                                                {/* Categoría con estilo sutil */}
                                                                {task.category && (
                                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                                                        {task.category}
                                                                    </span>
                                                                )}
                                                                {/* Avatares de miembros - Más visibles */}
                                                                {assigneeUsers.length > 0 && (
                                                                    <div className="flex items-center gap-1 ml-1">
                                                                        {assigneeUsers.slice(0, 3).map((user, idx) => (
                                                                            <div
                                                                                key={user.id}
                                                                                className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center border-2 border-white shadow-sm"
                                                                                style={{
                                                                                    marginLeft: idx > 0 ? '-6px' : '0',
                                                                                    zIndex: 10 - idx,
                                                                                    position: 'relative'
                                                                                }}
                                                                                title={user.name || user.username}
                                                                            >
                                                                                <span style={{
                                                                                    fontSize: '0.75rem',
                                                                                    lineHeight: '1',
                                                                                    fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'
                                                                                }}>
                                                                                    {user.avatar || '👤'}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                        {assigneeUsers.length > 3 && (
                                                                            <div
                                                                                className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center text-[9px] text-slate-700 font-medium border-2 border-white shadow-sm"
                                                                                style={{ marginLeft: '-6px', zIndex: 0, position: 'relative' }}
                                                                            >
                                                                                +{assigneeUsers.length - 3}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Botón de chat */}
                                                        {task.unreadComments > 0 && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedTaskForChat(task);
                                                                }}
                                                                className="flex-shrink-0 p-1"
                                                            >
                                                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* SEPARADOR si hay ambas secciones */}
                                            {pendingTasks.length > 0 && completedTasks.length > 0 && (
                                                <div className="px-0 py-4">
                                                    <div className="border-t border-slate-200" />
                                                    <p className="text-xs font-medium text-slate-400 mt-3 mb-2 px-0">Completadas</p>
                                                </div>
                                            )}

                                            {/* TAREAS COMPLETADAS */}
                                            {completedTasks.length > 0 && completedTasks.map((task, index) => {
                                                // Obtener miembros asignados - Parseo robusto
                                                let taskAssignees = task.assignees || [];
                                                if (typeof taskAssignees === 'string') {
                                                    try {
                                                        taskAssignees = JSON.parse(taskAssignees);
                                                    } catch (e) {
                                                        taskAssignees = [];
                                                    }
                                                }
                                                if (!Array.isArray(taskAssignees)) {
                                                    taskAssignees = [];
                                                }

                                                // Buscar usuarios en allUsers y teamMembers
                                                const assigneeUsers = taskAssignees
                                                    .map(assigneeId => {
                                                        // Buscar primero en allUsers
                                                        let user = allUsers.find(u => u.id === assigneeId);
                                                        // Si no se encuentra, buscar en teamMembers
                                                        if (!user) {
                                                            const teamMember = teamMembers.find(m => m.id === assigneeId);
                                                            if (teamMember) {
                                                                user = teamMember;
                                                            }
                                                        }
                                                        return user;
                                                    })
                                                    .filter(Boolean);

                                                return (
                                                    <div
                                                        key={task.id}
                                                        className={`flex items-start gap-3 px-0 py-3 ${index < completedTasks.length - 1 ? 'border-b border-slate-200' : ''} active:bg-slate-50/50 transition-colors opacity-60`}
                                                        onClick={() => setSelectedTaskForChat(task)}
                                                    >
                                                        {/* Checkbox completado */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleTaskMainAction(task);
                                                            }}
                                                            className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 border-transparent shadow-sm"
                                                            style={{ backgroundColor: activeListConfig.color }}
                                                        >
                                                            <Check size={14} className="text-white" strokeWidth={3} />
                                                        </button>

                                                        {/* Contenido */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[15px] leading-snug line-through text-slate-400">
                                                                {task.title}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                                {/* Fecha con estilo sutil */}
                                                                {task.due && (
                                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                                                        {task.due}
                                                                    </span>
                                                                )}
                                                                {/* Hora */}
                                                                {task.time && (
                                                                    <span className="text-xs text-slate-400">
                                                                        {task.time}
                                                                    </span>
                                                                )}
                                                                {/* Categoría con estilo sutil */}
                                                                {task.category && (
                                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                                                                        {task.category}
                                                                    </span>
                                                                )}
                                                                {/* Avatares de miembros - Más visibles (completadas) */}
                                                                {assigneeUsers.length > 0 && (
                                                                    <div className="flex items-center gap-1 ml-1">
                                                                        {assigneeUsers.slice(0, 3).map((user, idx) => (
                                                                            <div
                                                                                key={user.id}
                                                                                className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center border-2 border-white shadow-sm opacity-60"
                                                                                style={{
                                                                                    marginLeft: idx > 0 ? '-6px' : '0',
                                                                                    zIndex: 10 - idx,
                                                                                    position: 'relative'
                                                                                }}
                                                                                title={user.name || user.username}
                                                                            >
                                                                                <span style={{
                                                                                    fontSize: '0.75rem',
                                                                                    lineHeight: '1',
                                                                                    fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'
                                                                                }}>
                                                                                    {user.avatar || '👤'}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                        {assigneeUsers.length > 3 && (
                                                                            <div
                                                                                className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center text-[9px] text-slate-500 font-medium border-2 border-white shadow-sm opacity-60"
                                                                                style={{ marginLeft: '-6px', zIndex: 0, position: 'relative' }}
                                                                            >
                                                                                +{assigneeUsers.length - 3}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Botón de chat */}
                                                        {task.unreadComments > 0 && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedTaskForChat(task);
                                                                }}
                                                                className="flex-shrink-0 p-1"
                                                            >
                                                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </main>
                        </>
                    )}

                    {/* MENÚ DE USUARIO MÓVIL */}
                    {showMobileUserMenu && !showSettings && (
                        <>
                            <div
                                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                                onClick={() => setShowMobileUserMenu(false)}
                            />
                            <div className="fixed right-0 top-0 h-full w-72 bg-white/95 backdrop-blur-xl border-l border-slate-200/50 z-50 shadow-xl" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                                <div className="h-full overflow-y-auto p-4">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-lg font-semibold text-slate-900">Cuenta</h2>
                                        <button onClick={() => setShowMobileUserMenu(false)} className="p-2">
                                            <X size={20} className="text-slate-600" />
                                        </button>
                                    </div>

                                    <div className="space-y-1">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setShowMobileUserMenu(false);
                                                setTimeout(() => {
                                                    setShowAvatarSelector(true);
                                                }, 200);
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-base text-slate-700 hover:bg-slate-50 transition-colors"
                                        >
                                            <Pencil size={20} className="text-slate-400" />
                                            <span>Cambiar avatar</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setShowMobileUserMenu(false);
                                                setTimeout(() => {
                                                    setQrScannerMode('equipment'); // Configurar modo equipo
                                                    setShowQRScanner(true);
                                                }, 200);
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-base text-slate-700 hover:bg-slate-50 transition-colors"
                                        >
                                            <QrCode size={20} className="text-slate-400" />
                                            <span>Escanear QR</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setShowMobileUserMenu(false);
                                                setTimeout(() => {
                                                    setShowSettings(true);
                                                }, 200);
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-base text-slate-700 hover:bg-slate-50 transition-colors"
                                        >
                                            <Settings size={20} className="text-slate-400" />
                                            <span>Configuración</span>
                                        </button>
                                        <div className="border-t border-slate-200 my-2" />
                                        <button
                                            onClick={onLogout}
                                            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-base text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <LogOut size={20} className="text-red-500" />
                                            <span>Cerrar sesión</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* PANEL DE INTELIGENCIA FLOTANTE - Se expande cuando se hace clic */}
                    {showMobileIntelligence && unreadNotifications > 0 && (
                        <div className="fixed bottom-24 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 max-h-[60vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300"
                            style={{
                                bottom: `max(96px, calc(env(safe-area-inset-bottom) + 96px))`
                            }}
                        >
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-indigo-50">
                                <div className="flex items-center gap-2">
                                    <BrainCircuit size={20} className="text-indigo-600" />
                                    <h3 className="text-base font-semibold text-slate-900">Inteligencia</h3>
                                    {unreadNotifications > 0 && (
                                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                            {unreadNotifications}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setShowMobileIntelligence(false)}
                                    className="text-slate-600 hover:text-slate-900"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                {filteredSuggestions.slice(0, 5).map(suggestion => (
                                    <button
                                        key={suggestion.id}
                                        onClick={() => {
                                            handleProcessSuggestion(suggestion.id);
                                            if (filteredSuggestions.filter(s => !s.read).length <= 1) {
                                                setShowMobileIntelligence(false);
                                            }
                                        }}
                                        className={`w-full text-left p-3 rounded-xl mb-2 transition-colors ${!suggestion.read ? 'bg-indigo-50 border border-indigo-200' : 'bg-slate-50 border border-slate-200'}`}
                                    >
                                        <p className="text-sm font-semibold text-slate-900 mb-1">{suggestion.subject}</p>
                                        <p className="text-xs text-slate-600 mb-2">{suggestion.context}</p>
                                        <p className="text-xs text-indigo-600 font-medium">{suggestion.suggestedAction}</p>
                                    </button>
                                ))}
                                {filteredSuggestions.length === 0 && (
                                    <p className="text-sm text-slate-500 text-center py-4">No hay notificaciones</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* BOTÓN FLOTANTE - Estilo iOS limpio (sin toolbar, solo botón circular) */}
                    <button
                        onClick={() => {
                            if (mobileView === 'dashboard') {
                                // Dashboard: Establecer grupo por defecto
                                const defaultGroup = currentGroups[0];
                                setMobileSelectedGroupForTask(defaultGroup || null);
                            } else {
                                // Lista: Lógica inteligente según el tipo
                                if (activeListConfig?.type === 'group') {
                                    const group = groups.find(g => g.id === activeListConfig.id);
                                    setMobileSelectedGroupForTask(group);
                                } else if (activeListConfig?.type === 'smart') {
                                    if (activeListConfig.id === 'today') {
                                        setMobileSelectedDue('Hoy');
                                    }
                                    const defaultGroup = currentGroups[0];
                                    setMobileSelectedGroupForTask(defaultGroup || null);
                                }
                            }
                            setShowNewTaskModal(true);
                        }}
                        className={`fixed bottom-6 ${unreadNotifications > 0 ? 'right-4' : 'right-4'} w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center shadow-lg z-50 active:scale-95 transition-transform`}
                        style={{
                            bottom: 'max(24px, env(safe-area-inset-bottom) + 24px)',
                            boxShadow: '0 4px 14px 0 rgba(0, 122, 255, 0.4)'
                        }}
                    >
                        <Plus size={24} className="text-white" strokeWidth={2.5} />
                    </button>

                    {/* MODAL PARA "+ Añadir" (Nuevo espacio, Invitar, Unirse) */}
                    {showMobileAddModal && !showGroupModal && !showSettings && (
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-end" onClick={(e) => {
                            e.stopPropagation();
                            if (e.target === e.currentTarget) {
                                setShowMobileAddModal(false);
                            }
                        }}>
                            <div
                                className="w-full bg-white rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
                                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header del modal */}
                                <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200">
                                    <h2 className="text-lg font-semibold text-slate-900">Añadir</h2>
                                    <button
                                        onClick={() => setShowMobileAddModal(false)}
                                        className="text-blue-600 text-base font-medium"
                                    >
                                        Cancelar
                                    </button>
                                </div>

                                {/* Opciones */}
                                <div className="px-4 py-4 space-y-2">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            // Cerrar el modal actual y abrir el nuevo en el siguiente ciclo
                                            setShowMobileAddModal(false);
                                            setTimeout(() => {
                                                setGroupModalTab('create');
                                                setShowGroupModal(true);
                                            }, 200);
                                        }}
                                        className="w-full flex items-center gap-4 px-4 py-4 bg-slate-50 rounded-xl active:bg-slate-100 transition-colors text-left"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                            <FolderPlus size={24} className="text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-slate-900">Nuevo espacio</p>
                                            <p className="text-sm text-slate-500">Crea un nuevo espacio de trabajo</p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            // Cerrar el modal actual y abrir el nuevo en el siguiente ciclo
                                            setShowMobileAddModal(false);
                                            setTimeout(() => {
                                                setGroupModalTab('invite');
                                                setShowGroupModal(true);
                                            }, 200);
                                        }}
                                        className="w-full flex items-center gap-4 px-4 py-4 bg-slate-50 rounded-xl active:bg-slate-100 transition-colors text-left"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                                            <UserPlus size={24} className="text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-slate-900">Invitar</p>
                                            <p className="text-sm text-slate-500">Invita miembros a un espacio</p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            // Cerrar el modal actual y abrir el nuevo en el siguiente ciclo
                                            setShowMobileAddModal(false);
                                            setTimeout(() => {
                                                setGroupModalTab('join');
                                                setShowGroupModal(true);
                                            }, 200);
                                        }}
                                        className="w-full flex items-center gap-4 px-4 py-4 bg-slate-50 rounded-xl active:bg-slate-100 transition-colors text-left"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                                            <LogIn size={24} className="text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-slate-900">Unirse</p>
                                            <p className="text-sm text-slate-500">Únete a un espacio con código</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODAL PARA CREAR NUEVA TAREA */}
                    {showNewTaskModal && (
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end">
                            <div
                                className="w-full bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300"
                                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                            >
                                {/* Header del modal */}
                                <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200">
                                    <button
                                        onClick={() => {
                                            setShowNewTaskModal(false);
                                            setNewTaskInput('');
                                            setMobileSelectedAssignees([currentUser?.id || 'user']);
                                            setMobileSelectedCategory(categories[0]?.id || 'general');
                                            setMobileSelectedDue('Hoy');
                                            setMobileSelectedTime('');
                                            setMobileSelectedPriority('medium');
                                        }}
                                        className="text-blue-600 text-base font-medium"
                                    >
                                        Cancelar
                                    </button>
                                    <h2 className="text-lg font-semibold text-slate-900">Nueva tarea</h2>
                                    <button
                                        onClick={async () => {
                                            if (newTaskInput.trim()) {
                                                try {
                                                    // Crear la tarea directamente
                                                    const categoryObj = categories.find(c => c.id === mobileSelectedCategory);

                                                    // Determinar el grupo destino (Lógica inteligente)
                                                    let targetGroupId;

                                                    if (mobileView === 'list' && activeListConfig?.type === 'group') {
                                                        // Escenario A: Dentro de una Lista de Grupo
                                                        // Asignar automáticamente al grupo activo
                                                        targetGroupId = activeListConfig.id;
                                                    } else if (activeListConfig?.type === 'smart') {
                                                        // Escenario A: Dentro de una Smart List (ej: Hoy)
                                                        // Usar el grupo seleccionado en el modal (o default)
                                                        targetGroupId = mobileSelectedGroupForTask?.id || currentGroups[0]?.id;
                                                    } else if (mobileSelectedGroupForTask) {
                                                        // Escenario B: En el Dashboard con grupo seleccionado
                                                        targetGroupId = mobileSelectedGroupForTask.id;
                                                    } else {
                                                        // Por defecto, primera lista del contexto
                                                        targetGroupId = currentGroups[0]?.id;
                                                    }

                                                    // Determinar el status basado en la fecha
                                                    const taskDate = mobileSelectedDue;
                                                    const now = new Date();
                                                    const year = now.getFullYear();
                                                    const month = String(now.getMonth() + 1).padStart(2, '0');
                                                    const day = String(now.getDate()).padStart(2, '0');
                                                    const today = `${year}-${month}-${day}`;

                                                    let actualTaskDate;
                                                    if (taskDate === 'Hoy') {
                                                        actualTaskDate = today;
                                                    } else if (taskDate === 'Mañana') {
                                                        const tomorrow = new Date();
                                                        tomorrow.setDate(tomorrow.getDate() + 1);
                                                        const tYear = tomorrow.getFullYear();
                                                        const tMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
                                                        const tDay = String(tomorrow.getDate()).padStart(2, '0');
                                                        actualTaskDate = `${tYear}-${tMonth}-${tDay}`;
                                                    } else {
                                                        actualTaskDate = taskDate;
                                                    }

                                                    const isFuture = actualTaskDate > today;
                                                    const status = isFuture ? 'upcoming' : 'pending';

                                                    // Crear la tarea en el backend
                                                    const createdTask = await apiTasks.create({
                                                        title: newTaskInput.trim(),
                                                        groupId: targetGroupId,
                                                        creatorId: currentUser.id,
                                                        assignees: mobileSelectedAssignees,
                                                        category: categoryObj ? categoryObj.name : 'General',
                                                        due: mobileSelectedDue,
                                                        time: mobileSelectedTime || undefined,
                                                        priority: mobileSelectedPriority,
                                                        status: status,
                                                        postponeCount: 0,
                                                        comments: [],
                                                        unreadComments: 0
                                                    });

                                                    // Actualizar estado local inmediatamente (optimistic update)
                                                    if (createdTask) {
                                                        setTasks(prevTasks => [...prevTasks, createdTask]);
                                                    }

                                                    // Limpiar y cerrar
                                                    setNewTaskInput('');
                                                    setShowNewTaskModal(false);
                                                    setMobileSelectedAssignees([currentUser?.id || 'user']);
                                                    setMobileSelectedCategory(categories[0]?.id || 'general');
                                                    setMobileSelectedDue('Hoy');
                                                    setMobileSelectedTime('');
                                                    setMobileSelectedPriority('medium');

                                                    // Las tareas también se actualizarán automáticamente vía WebSocket
                                                } catch (error) {
                                                    console.error('Error creando tarea:', error);
                                                    alert('Error al crear la tarea. Por favor intenta nuevamente.');
                                                }
                                            }
                                        }}
                                        disabled={!newTaskInput.trim()}
                                        className="text-blue-600 text-base font-semibold disabled:text-slate-400"
                                    >
                                        Guardar
                                    </button>
                                </div>

                                {/* Contenido del modal simplificado */}
                                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                                    {/* 1. Título */}
                                    <input
                                        type="text"
                                        value={newTaskInput}
                                        onChange={(e) => setNewTaskInput(e.target.value)}
                                        placeholder="¿Qué hay que hacer?"
                                        className="w-full text-xl font-medium py-3 border-b border-slate-200 focus:outline-none focus:border-blue-500 transition-colors bg-transparent"
                                        autoFocus
                                    />

                                    {/* 2. Urgencia (Prioridad) */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Urgencia</label>
                                        <div className="flex bg-slate-100 p-1 rounded-xl">
                                            <button
                                                onClick={() => setMobileSelectedPriority('low')}
                                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mobileSelectedPriority === 'low' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500'}`}
                                            >
                                                Baja
                                            </button>
                                            <button
                                                onClick={() => setMobileSelectedPriority('medium')}
                                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mobileSelectedPriority === 'medium' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                                            >
                                                Normal
                                            </button>
                                            <button
                                                onClick={() => setMobileSelectedPriority('high')}
                                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mobileSelectedPriority === 'high' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
                                            >
                                                Alta
                                            </button>
                                        </div>
                                    </div>

                                    {/* 3. Fecha */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Para cuándo</label>
                                        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                            <button
                                                onClick={() => setMobileSelectedDue('Hoy')}
                                                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${mobileSelectedDue === 'Hoy' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
                                            >
                                                Hoy
                                            </button>
                                            <button
                                                onClick={() => setMobileSelectedDue('Mañana')}
                                                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${mobileSelectedDue === 'Mañana' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
                                            >
                                                Mañana
                                            </button>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    value={mobileSelectedDue !== 'Hoy' && mobileSelectedDue !== 'Mañana' ? mobileSelectedDue : ''}
                                                    onChange={(e) => setMobileSelectedDue(e.target.value)}
                                                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium border bg-white ${mobileSelectedDue !== 'Hoy' && mobileSelectedDue !== 'Mañana' ? 'border-blue-200 text-blue-700' : 'border-slate-200 text-slate-600'}`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4. Detalles (Categoría y Asignación) - Compacto */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Detalles</label>
                                        <div className="flex gap-3">
                                            {/* Categoría */}
                                            <div className="flex-1">
                                                <div className="relative">
                                                    <select
                                                        value={mobileSelectedCategory}
                                                        onChange={(e) => setMobileSelectedCategory(e.target.value)}
                                                        className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2.5 px-3 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500"
                                                    >
                                                        {categories.map(cat => (
                                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                        <Tag size={14} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Asignación (Multi-selección) */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                                    {/* Botón "Para mí" */}
                                                    <button
                                                        onClick={() => {
                                                            if (mobileSelectedAssignees.includes(currentUser?.id)) {
                                                                if (mobileSelectedAssignees.length > 1) {
                                                                    setMobileSelectedAssignees(mobileSelectedAssignees.filter(id => id !== currentUser?.id));
                                                                }
                                                            } else {
                                                                setMobileSelectedAssignees([...mobileSelectedAssignees, currentUser?.id]);
                                                            }
                                                        }}
                                                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${mobileSelectedAssignees.includes(currentUser?.id)
                                                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                            : 'bg-slate-50 border-slate-200 text-slate-600'
                                                            }`}
                                                    >
                                                        <span>{currentUser?.avatar || '👤'}</span>
                                                        <span className="whitespace-nowrap">Para mí</span>
                                                    </button>

                                                    {/* Otros miembros */}
                                                    {teamMembers.filter(m => m.id !== currentUser?.id).map(member => (
                                                        <button
                                                            key={member.id}
                                                            onClick={() => {
                                                                if (mobileSelectedAssignees.includes(member.id)) {
                                                                    if (mobileSelectedAssignees.length > 1) {
                                                                        setMobileSelectedAssignees(mobileSelectedAssignees.filter(id => id !== member.id));
                                                                    }
                                                                } else {
                                                                    setMobileSelectedAssignees([...mobileSelectedAssignees, member.id]);
                                                                }
                                                            }}
                                                            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${mobileSelectedAssignees.includes(member.id)
                                                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                                : 'bg-slate-50 border-slate-200 text-slate-600'
                                                                }`}
                                                        >
                                                            <span>{member.avatar}</span>
                                                            <span className="whitespace-nowrap">{member.name || member.username}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODAL DE TAREA VENCIDA */}
                    {showOverdueTaskModal && overdueTask && (
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end">
                            <div
                                className="w-full bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300"
                                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                            >
                                {/* Header del modal */}
                                <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 bg-red-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                            <AlertTriangle size={20} className="text-red-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-slate-900">Tarea Vencida</h2>
                                            <p className="text-sm text-slate-600">Esta tarea ya pasó su fecha de vencimiento</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Contenido del modal */}
                                <div className="flex-1 overflow-y-auto px-4 py-6">
                                    <div className="bg-slate-50 rounded-xl p-4 mb-4">
                                        <p className="text-base font-medium text-slate-900 mb-2">{overdueTask.title}</p>
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Calendar size={16} />
                                            <span>Venció: {overdueTask.due}</span>
                                        </div>
                                    </div>

                                    <p className="text-sm text-slate-700 mb-4">
                                        ¿Qué deseas hacer con esta tarea?
                                    </p>

                                    <div className="space-y-3">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    // Dejar para hoy
                                                    const today = new Date().toISOString().split('T')[0];
                                                    const updatedTask = {
                                                        ...overdueTask,
                                                        due: 'Hoy',
                                                        status: 'pending'
                                                    };
                                                    setTasks(tasks.map(t => t.id === overdueTask.id ? updatedTask : t));
                                                    await apiTasks.update(overdueTask.id, {
                                                        due: 'Hoy',
                                                        status: 'pending'
                                                    });
                                                    setShowOverdueTaskModal(false);
                                                    setOverdueTask(null);
                                                } catch (error) {
                                                    console.error('Error actualizando tarea:', error);
                                                    alert('Error al actualizar la tarea');
                                                }
                                            }}
                                            className="w-full flex items-center justify-between px-4 py-4 bg-blue-50 border-2 border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Calendar size={20} className="text-blue-600" />
                                                <div className="text-left">
                                                    <p className="text-base font-semibold text-blue-900">Dejarla para hoy</p>
                                                    <p className="text-sm text-blue-700">Mantener la tarea activa para hoy</p>
                                                </div>
                                            </div>
                                            <ChevronRight size={20} className="text-blue-600" />
                                        </button>

                                        <button
                                            onClick={async () => {
                                                try {
                                                    // Bloquear la tarea
                                                    const updatedTask = {
                                                        ...overdueTask,
                                                        status: 'blocked',
                                                        blockedBy: currentUser?.id || 'user',
                                                        blockReason: 'Tarea vencida - requiere revisión'
                                                    };
                                                    setTasks(tasks.map(t => t.id === overdueTask.id ? updatedTask : t));
                                                    await apiTasks.update(overdueTask.id, {
                                                        status: 'blocked',
                                                        blockedBy: currentUser?.id || 'user',
                                                        blockReason: 'Tarea vencida - requiere revisión'
                                                    });
                                                    setShowOverdueTaskModal(false);
                                                    setOverdueTask(null);
                                                } catch (error) {
                                                    console.error('Error bloqueando tarea:', error);
                                                    alert('Error al bloquear la tarea');
                                                }
                                            }}
                                            className="w-full flex items-center justify-between px-4 py-4 bg-red-50 border-2 border-red-200 rounded-xl hover:bg-red-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Ban size={20} className="text-red-600" />
                                                <div className="text-left">
                                                    <p className="text-base font-semibold text-red-900">Bloquear</p>
                                                    <p className="text-sm text-red-700">Marcar como bloqueada para revisión</p>
                                                </div>
                                            </div>
                                            <ChevronRight size={20} className="text-red-600" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODAL PARA VER CHAT DE TAREA */}
                    {selectedTaskForChat && (
                        <div className="fixed inset-0 bg-white z-50 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
                                <button
                                    onClick={() => {
                                        setSelectedTaskForChat(null);
                                        setMobileCommentInput('');
                                        // Marcar comentarios como leídos
                                        if (selectedTaskForChat.unreadComments > 0) {
                                            markCommentsRead(selectedTaskForChat.id);
                                        }
                                    }}
                                    className="text-blue-600 text-base font-medium flex items-center gap-1"
                                >
                                    <ChevronLeft size={20} />
                                    <span>Atrás</span>
                                </button>
                                <h2 className="text-lg font-semibold text-slate-900 flex-1 text-center truncate px-4">{selectedTaskForChat.title}</h2>
                                <div className="w-20" />
                            </div>

                            {/* Chat content - Reutilizar TaskCard chat */}
                            <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
                                {(() => {
                                    // Obtener la tarea actualizada
                                    const currentTask = tasks.find(t => t.id === selectedTaskForChat.id) || selectedTaskForChat;
                                    return currentTask.comments && currentTask.comments.length > 0 ? (
                                        <div className="space-y-3">
                                            {currentTask.comments.map(comment => {
                                                const highlightMentions = (text) => {
                                                    const parts = text.split(/([@!]\w+)/g);
                                                    return parts.map((part, index) => {
                                                        if (part.match(/^[@!]\w+$/)) {
                                                            return <span key={index} className="bg-purple-100 text-purple-700 font-semibold px-1 rounded">{part}</span>;
                                                        }
                                                        return <span key={index}>{part}</span>;
                                                    });
                                                };

                                                return (
                                                    <div key={comment.id} className="flex gap-2.5">
                                                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-xs border border-slate-200 shadow-sm mt-0.5 flex-shrink-0">
                                                            <span style={{ fontSize: '0.875rem', lineHeight: '1', fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>
                                                                {comment.avatar}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-baseline gap-2 mb-0.5">
                                                                <span className="text-sm font-bold text-slate-700">{comment.user}</span>
                                                                <span className="text-xs text-slate-400">{comment.date}</span>
                                                            </div>
                                                            <div className="bg-white border border-slate-200 rounded-lg rounded-tl-none p-3 text-sm text-slate-700 shadow-sm">
                                                                {highlightMentions(comment.text)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-16 text-center">
                                            <MessageSquare size={48} className="text-slate-300 mb-4" />
                                            <p className="text-base text-slate-500">No hay comentarios</p>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Input de comentario */}
                            <div className="border-t border-slate-200 bg-white p-4 relative">
                                {mobileMentionPosition && mobileFilteredMentions.length > 0 && (
                                    <div className="absolute bottom-full left-0 mb-2 w-full bg-white border border-slate-200 rounded-t-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                                        {mobileFilteredMentions.map((member, index) => (
                                            <button
                                                key={member.id}
                                                type="button"
                                                onClick={() => handleMobileMentionSelect(member)}
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0`}
                                            >
                                                <span className="text-xl">{member.avatar}</span>
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
                                <div className="flex gap-2">
                                    <input
                                        id="mobile-comment-input"
                                        type="text"
                                        value={mobileCommentInput}
                                        onChange={handleMobileCommentInputChange}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey && mobileCommentInput.trim()) {
                                                e.preventDefault();
                                                addComment(selectedTaskForChat.id, mobileCommentInput);
                                                setMobileCommentInput('');
                                                // Actualizar la tarea en el modal
                                                setTimeout(() => {
                                                    const updatedTask = tasks.find(t => t.id === selectedTaskForChat.id);
                                                    if (updatedTask) {
                                                        setSelectedTaskForChat(updatedTask);
                                                    }
                                                }, 100);
                                            }
                                        }}
                                        placeholder="Escribe un comentario... (@ para mencionar)"
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                    <button
                                        onClick={() => {
                                            if (mobileCommentInput.trim()) {
                                                addComment(selectedTaskForChat.id, mobileCommentInput);
                                                setMobileCommentInput('');
                                                // Actualizar la tarea en el modal
                                                setTimeout(() => {
                                                    const updatedTask = tasks.find(t => t.id === selectedTaskForChat.id);
                                                    if (updatedTask) {
                                                        setSelectedTaskForChat(updatedTask);
                                                    }
                                                }, 100);
                                            }
                                        }}
                                        disabled={!mobileCommentInput.trim()}
                                        className="bg-blue-600 text-white p-2.5 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* MODALS FOR MOBILE */}
                <GroupModal
                    isOpen={showGroupModal}
                    onClose={() => setShowGroupModal(false)}
                    activeTab={groupModalTab}
                    setActiveTab={setGroupModalTab}
                    currentContext={currentContext}
                    groups={groups}
                    inviteSelectedGroup={inviteSelectedGroup}
                    setInviteSelectedGroup={setInviteSelectedGroup}
                    newGroupName={newGroupName}
                    setNewGroupName={setNewGroupName}
                    joinCodeInput={joinCodeInput}
                    setJoinCodeInput={setJoinCodeInput}
                    onCreateGroup={handleCreateGroup}
                    onJoinGroup={handleJoinGroup}
                    onScanQR={async () => {
                        if (isMobile && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                            setQrScannerMode('group'); // Modo para unirse a grupos
                            setShowQRScanner(true);
                        } else {
                            alert('El escáner QR requiere acceso a la cámara. Por favor, ingresa el código manualmente.');
                        }
                    }}
                    isMobile={isMobile}
                />

                <SettingsModal
                    isOpen={showSettings}
                    onClose={() => setShowSettings(false)}
                    currentUser={currentUser}
                    onUserUpdate={async (newAvatar) => {
                        try {
                            const result = await apiAuth.updateProfile(newAvatar);
                            if (result.success && result.user) {
                                if (onUserUpdate) {
                                    onUserUpdate(result.user);
                                }
                            }
                        } catch (error) {
                            console.error('Error actualizando perfil:', error);
                        }
                    }}
                    userConfig={userConfig}
                    setUserConfig={setUserConfig}
                    onDeleteAccount={() => setShowDeleteAccountConfirm(true)}
                    isMobile={isMobile}
                    showAvatarSelector={showAvatarSelector}
                    setShowAvatarSelector={setShowAvatarSelector}
                />

                {/* QR Scanner Modal */}
                {showQRScanner && (
                    <QRScannerModal
                        onCodeScanned={(code) => {
                            if (qrScannerMode === 'equipment') {
                                handleEquipmentQRScanned(code);
                            } else {
                                // Modo grupo: unirse a grupo
                                setJoinCodeInput(code.toUpperCase());
                                setShowQRScanner(false);
                            }
                        }}
                        onClose={() => {
                            setShowQRScanner(false);
                        }}
                    />
                )}

                {/* Avatar Selector Modal - Mobile Only */}
                {showAvatarSelector && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end">
                        <div
                            className="w-full bg-white rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
                            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                        >
                            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200">
                                <h2 className="text-lg font-semibold text-slate-900">Cambiar Avatar</h2>
                                <button
                                    onClick={() => setShowAvatarSelector(false)}
                                    className="text-blue-600 text-base font-medium"
                                >
                                    Cerrar
                                </button>
                            </div>
                            <div className="p-4 max-h-[60vh] overflow-y-auto">
                                <div className="grid grid-cols-6 gap-3">
                                    {['👤', '👨', '👩', '🧑', '👨‍💼', '👩‍💼', '👨‍🔬', '👩‍🔬', '👨‍💻', '👩‍💻', '👨‍🎨', '👩‍🎨', '👨‍🏫', '👩‍🏫', '👨‍⚕️', '👩‍⚕️', '👨‍🚀', '👩‍🚀', '👨‍✈️', '👩‍✈️', '👨‍🎓', '👩‍🎓', '👨‍🏭', '👩‍🏭', '🧑‍🌾', '🧑‍🍳', '🧑‍🎤', '🧑‍🎨', '🧑‍🏫', '🧑‍💼', '🧑‍🔬', '🧑‍💻', '🧑‍🎓', '🧑‍🏭', '🧑‍🚀', '🧑‍⚕️', '🤴', '👸', '🦸', '🦸‍♂️', '🦸‍♀️', '🧙', '🧙‍♂️', '🧙‍♀️', '🧚', '🧚‍♂️', '🧚‍♀️', '🧛', '🧛‍♂️', '🧛‍♀️', '🧜', '🧜‍♂️', '🧜‍♀️', '🧝', '🧝‍♂️', '🧝‍♀️', '🧞', '🧞‍♂️', '🧞‍♀️', '🧟', '🧟‍♂️', '🧟‍♀️'].map((emoji) => {
                                        const isSelected = currentUser?.avatar === emoji;
                                        return (
                                            <button
                                                key={emoji}
                                                onClick={async () => {
                                                    try {
                                                        const result = await apiAuth.updateProfile(emoji);
                                                        if (result.success && result.user) {
                                                            if (onUserUpdate) {
                                                                onUserUpdate(result.user);
                                                            }
                                                        }
                                                        setShowAvatarSelector(false);
                                                    } catch (error) {
                                                        console.error('Error actualizando avatar:', error);
                                                    }
                                                }}
                                                className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl transition-all active:scale-95 ${isSelected
                                                    ? 'bg-blue-500 shadow-lg shadow-blue-500/30 scale-105'
                                                    : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                                                    }`}
                                            >
                                                {emoji}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // VERSIÓN DESKTOP (original)
    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden selection:bg-blue-100 relative">

            {/* SIDEBAR */}
            {/* SIDEBAR */}
            <Sidebar
                currentUser={currentUser}
                onLogout={onLogout}
                currentContext={currentContext}
                setCurrentContext={setCurrentContext}
                activeGroupId={activeGroupId}
                setActiveGroupId={setActiveGroupId}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                tasks={tasks}
                groups={groups}
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                setViewMode={setViewMode}
                isSpacesExpanded={isSpacesExpanded}
                setIsSpacesExpanded={setIsSpacesExpanded}
                setShowGroupModal={setShowGroupModal}
                setGroupModalTab={setGroupModalTab}
                handleLeaveGroup={handleLeaveGroup}
                handleDeleteGroup={handleDeleteGroup}
                isIntelligenceExpanded={isIntelligenceExpanded}
                toggleIntelligence={toggleIntelligence}
                filteredSuggestions={filteredSuggestions}
                unreadNotifications={unreadNotifications}
                handleProcessSuggestion={handleProcessSuggestion}
                handleScanQR={handleScanQR}
                setShowSettings={setShowSettings}
                setShowEndDay={setShowEndDay}
            />

            {/* MAIN CONTENT */}
            {/* MAIN CONTENT */}
            <main className="flex-1 overflow-y-auto relative">
                <div className="max-w-4xl mx-auto p-6 md:p-10">

                    <Header
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                        showViewSelector={showViewSelector}
                        setShowViewSelector={setShowViewSelector}
                        currentContext={currentContext}
                        activeGroupId={activeGroupId}
                        activeGroupObj={activeGroupObj}
                        showMetrics={showMetrics}
                        setShowMetrics={setShowMetrics}
                        weeklyReport={weeklyReport}
                        teamMembers={teamMembers}
                        groups={groups}
                        allUsers={allUsers}
                        handleGenerateSummary={handleGenerateSummary}
                        showSummary={showSummary}
                        isThinking={isThinking}
                    />
                    {showSummary && summaryData && summaryData.narrative && (
                        <div className="mb-8 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 border border-indigo-100 rounded-2xl p-6 animate-in fade-in slide-in-from-top-4 duration-500 shadow-lg">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600 flex-shrink-0">
                                    <BrainCircuit size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-bold text-indigo-900 text-xl">Resumen Inteligente</h3>
                                        <button
                                            onClick={() => setShowSummary(false)}
                                            className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-indigo-700/70 mb-4">
                                        <span className="flex items-center gap-1">
                                            <CheckSquare size={12} className="text-green-600" />
                                            {summaryData.completedTasks} completadas
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} className="text-amber-600" />
                                            {summaryData.pendingTasks} pendientes
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Layers size={12} className="text-blue-600" />
                                            {summaryData.totalTasks} total
                                        </span>
                                    </div>

                                    {/* Texto Narrativo Natural */}
                                    <div className="bg-white/80 rounded-xl p-5 border border-indigo-200/50 shadow-sm">
                                        <div className="prose prose-sm max-w-none">
                                            <p className="text-slate-700 leading-relaxed whitespace-pre-line text-sm">
                                                {summaryData.narrative.split('**').map((part, idx) => {
                                                    if (idx % 2 === 1) {
                                                        // Es texto en negrita
                                                        return <strong key={idx} className="font-bold text-slate-900">{part}</strong>;
                                                    }
                                                    return <span key={idx}>{part}</span>;
                                                })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Referencias rápidas a tareas mencionadas (opcional, solo si hay tareas críticas) */}
                                    {(summaryData.insights.overdue.length > 0 || summaryData.insights.blocked.length > 0 || summaryData.insights.validation.length > 0) && (
                                        <div className="mt-4 pt-4 border-t border-indigo-200">
                                            <p className="text-xs font-semibold text-indigo-700 mb-2">Tareas mencionadas:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {[...summaryData.insights.overdue, ...summaryData.insights.blocked, ...summaryData.insights.validation].slice(0, 5).map(task => {
                                                    const category = categories.find(c => c.name === task.category);
                                                    return (
                                                        <button
                                                            key={task.id}
                                                            onClick={() => {
                                                                // Scroll a la tarea en la lista
                                                                const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
                                                                if (taskElement) {
                                                                    taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                    taskElement.classList.add('ring-2', 'ring-indigo-500');
                                                                    setTimeout(() => taskElement.classList.remove('ring-2', 'ring-indigo-500'), 2000);
                                                                }
                                                            }}
                                                            className="flex items-center gap-1.5 bg-white/90 hover:bg-white border border-slate-200 hover:border-indigo-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-all shadow-sm hover:shadow-md"
                                                        >
                                                            <div className={`w-1.5 h-1.5 rounded-full ${category?.dot || 'bg-slate-400'}`}></div>
                                                            <span className="truncate max-w-[120px]">{task.title}</span>
                                                            {task.status === 'overdue' && <span className="text-[10px] text-red-600">⚠️</span>}
                                                            {task.status === 'blocked' && <span className="text-[10px] text-orange-600">🔒</span>}
                                                            {task.status === 'waiting_validation' && <span className="text-[10px] text-amber-600">👁️</span>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VISTA DE LISTA */}
                    {viewMode === 'list' && (
                        <div className="space-y-6 pb-20 animate-in fade-in">
                            {/* INPUT BAR */}
                            <div className="relative z-30">
                                <div className={`bg-white shadow-lg border border-slate-200 transition-all duration-300 rounded-2xl ${showInputToolbar ? 'ring-2 ring-blue-500/20 border-blue-400' : 'hover:border-slate-300'}`}>
                                    <div className="flex items-start p-2 transition-all">
                                        <div className="pl-2 pr-3 pt-2 text-slate-400"><Plus size={20} /></div>
                                        <textarea
                                            ref={textareaRef}
                                            value={newTaskInput}
                                            onChange={(e) => {
                                                const text = e.target.value;
                                                setNewTaskInput(text);

                                                // Detectar fecha automáticamente
                                                const detectedDateValue = detectDateFromText(text);
                                                if (detectedDateValue && detectedDateValue !== detectedDate) {
                                                    setDetectedDate(detectedDateValue);
                                                    // Mostrar sugerencia visual
                                                    const dateObj = new Date(detectedDateValue);
                                                    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                                                    const dayName = dayNames[dateObj.getDay()];
                                                    setShowSmartSuggestion({
                                                        type: 'date',
                                                        value: detectedDateValue,
                                                        text: `📅 Fecha detectada: ${dayName} ${dateObj.getDate()}/${dateObj.getMonth() + 1}`
                                                    });
                                                }
                                            }}
                                            onFocus={() => {
                                                setIsInputFocused(true);
                                                // Cerrar todos los chats cuando se enfoca el input de nueva tarea
                                                setOpenChats(new Set());
                                            }}
                                            onBlur={(e) => {
                                                setTimeout(() => {
                                                    // Add null check before calling closest()
                                                    if (!e.currentTarget) return;

                                                    // Verificar si el elemento activo está dentro del contenedor de la toolbar o del date picker
                                                    const activeElement = document.activeElement;
                                                    const toolbarContainer = e.currentTarget.closest('.relative.z-30');
                                                    const isInToolbar = toolbarContainer && toolbarContainer.contains(activeElement);
                                                    const isInDatePicker = datePickerRef.current && datePickerRef.current.contains(activeElement);

                                                    if (!isInToolbar && !isInDatePicker && !showDatePicker) {
                                                        if (newTaskInput.length === 0) setIsInputFocused(false);
                                                    }
                                                }, 200);
                                            }}
                                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAddTask())}
                                            placeholder={`Agregar tarea en ${activeGroupId === 'all' ? (currentGroups[0]?.name || 'General') : activeGroupObj?.name}...`}
                                            className="w-full bg-transparent text-slate-700 placeholder:text-slate-400 focus:outline-none text-base resize-none py-2 min-h-[40px] max-h-[200px]"
                                            rows={1}
                                        />
                                    </div>
                                    {showInputToolbar && (
                                        <div className="flex items-center justify-between bg-slate-50/50 px-3 py-2 border-t border-slate-100 rounded-b-2xl animate-in slide-in-from-top-2 duration-200 relative z-40">
                                            <div className="flex items-center gap-3 overflow-visible flex-1">
                                                <div className="flex -space-x-1">{teamMembers.map(member => (<button key={member.id} onMouseDown={(e) => e.preventDefault()} onClick={() => toggleAssignee(member.id)} className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-transform hover:scale-110 hover:z-10 ${selectedAssignees.includes(member.id) ? 'border-blue-500 bg-blue-100 z-10 shadow-sm' : 'border-white bg-slate-200 text-slate-400 opacity-70 hover:opacity-100'}`} title={member.name}><span className="text-sm">{member.avatar}</span></button>))}</div>
                                                <div className="w-px h-6 bg-slate-200 mx-1"></div>

                                                {/* CATEGORY SELECTOR */}
                                                <div className="relative" onMouseDown={(e) => e.preventDefault()}>
                                                    <button
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => { setShowCategoryDropdown(!showCategoryDropdown); setShowDatePicker(false); }}
                                                        className={`flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm text-xs font-bold transition-all hover:border-blue-300 hover:shadow-md ${showCategoryDropdown ? 'border-blue-500 ring-2 ring-blue-500/20 text-blue-600' : 'text-slate-600'}`}
                                                    >
                                                        <Tag size={14} className={selectedCategory !== 'general' ? 'text-blue-500' : 'text-slate-400'} />
                                                        <span className="max-w-[80px] truncate">{categories.find(c => c.id === selectedCategory)?.name || 'Etiqueta'}</span>
                                                    </button>

                                                    {showCategoryDropdown && (
                                                        <div className="absolute top-full left-0 mt-3 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100 p-2 w-56 z-[100] animate-in fade-in zoom-in-95 origin-top-left" onMouseDown={(e) => e.preventDefault()}>
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2">Seleccionar Etiqueta</div>
                                                            <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                                                {categories.map(cat => (
                                                                    <button
                                                                        key={cat.id}
                                                                        onMouseDown={(e) => e.preventDefault()}
                                                                        onClick={() => { setSelectedCategory(cat.id); setShowCategoryDropdown(false); }}
                                                                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-colors ${cat.id === selectedCategory ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                                                                    >
                                                                        <div className={`w-2 h-2 rounded-full ${cat.id === selectedCategory ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                                                                        {cat.name}
                                                                        {cat.id === selectedCategory && <Check size={14} className="ml-auto text-blue-500" />}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* DATE PICKER - Estilo iOS Reminders */}
                                                <div className="relative" ref={datePickerRef}>
                                                    <button
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => {
                                                            setShowDatePicker(!showDatePicker);
                                                            setShowCategoryDropdown(false);
                                                            if (!showDatePicker) {
                                                                const today = new Date();
                                                                setDatePickerMonth(today.getMonth());
                                                                setDatePickerYear(today.getFullYear());
                                                            }
                                                        }}
                                                        className={`flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm text-xs font-bold transition-all hover:border-blue-300 hover:shadow-md ${showDatePicker ? 'border-blue-500 ring-2 ring-blue-500/20 text-blue-600' : 'text-slate-600'}`}
                                                    >
                                                        <Clock size={14} className={detectedDate ? 'text-blue-500' : 'text-slate-400'} />
                                                        <span>{formatDateForDisplay(detectedDate) || 'Hoy'}</span>
                                                    </button>

                                                    {showDatePicker && (
                                                        <div
                                                            className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-72 z-[100] animate-in fade-in zoom-in-95 origin-top-left"
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {/* Botones rápidos */}
                                                            <div className="grid grid-cols-2 gap-2 mb-4">
                                                                <button
                                                                    onMouseDown={(e) => e.preventDefault()}
                                                                    onClick={() => { setDetectedDate('Hoy'); setShowDatePicker(false); }}
                                                                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 text-xs font-semibold transition-all border border-slate-200 hover:border-blue-300"
                                                                >
                                                                    <Calendar size={14} /> Hoy
                                                                </button>
                                                                <button
                                                                    onMouseDown={(e) => e.preventDefault()}
                                                                    onClick={() => { setDetectedDate('Mañana'); setShowDatePicker(false); }}
                                                                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 text-xs font-semibold transition-all border border-slate-200 hover:border-blue-300"
                                                                >
                                                                    <ArrowRight size={14} /> Mañana
                                                                </button>
                                                            </div>

                                                            {/* Calendario estilo iOS */}
                                                            <div className="border-t border-slate-100 pt-3">
                                                                {/* Header del calendario */}
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <button
                                                                        onMouseDown={(e) => e.preventDefault()}
                                                                        onClick={handlePrevMonth}
                                                                        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                                                    >
                                                                        <ChevronLeft size={16} className="text-slate-600" />
                                                                    </button>
                                                                    <div className="text-sm font-semibold text-slate-800">
                                                                        {months[datePickerMonth]} {datePickerYear}
                                                                    </div>
                                                                    <button
                                                                        onMouseDown={(e) => e.preventDefault()}
                                                                        onClick={handleNextMonth}
                                                                        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                                                    >
                                                                        <ChevronRight size={16} className="text-slate-600" />
                                                                    </button>
                                                                </div>

                                                                {/* Días de la semana */}
                                                                <div className="grid grid-cols-7 gap-1 mb-2">
                                                                    {weekDays.map((day, idx) => (
                                                                        <div key={idx} className="text-center text-[10px] font-semibold text-slate-400 py-1">
                                                                            {day.charAt(0)}
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Grid de días */}
                                                                <div className="grid grid-cols-7 gap-1">
                                                                    {(() => {
                                                                        const daysInMonth = getDaysInMonth(datePickerMonth, datePickerYear);
                                                                        const firstDay = getFirstDayOfMonth(datePickerMonth, datePickerYear);
                                                                        const today = new Date();
                                                                        const isToday = (day) => {
                                                                            return today.getDate() === day &&
                                                                                today.getMonth() === datePickerMonth &&
                                                                                today.getFullYear() === datePickerYear;
                                                                        };
                                                                        const isSelected = (day) => {
                                                                            if (!detectedDate || detectedDate === 'Hoy' || detectedDate === 'Mañana') return false;
                                                                            try {
                                                                                const selected = new Date(detectedDate);
                                                                                return selected.getDate() === day &&
                                                                                    selected.getMonth() === datePickerMonth &&
                                                                                    selected.getFullYear() === datePickerYear;
                                                                            } catch {
                                                                                return false;
                                                                            }
                                                                        };

                                                                        const days = [];
                                                                        // Días vacíos al inicio
                                                                        for (let i = 0; i < firstDay; i++) {
                                                                            days.push(<div key={`empty-${i}`} className="h-8"></div>);
                                                                        }
                                                                        // Días del mes
                                                                        for (let day = 1; day <= daysInMonth; day++) {
                                                                            const todayClass = isToday(day) ? 'bg-blue-100 text-blue-700 font-bold' : '';
                                                                            const selectedClass = isSelected(day) ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700';
                                                                            days.push(
                                                                                <button
                                                                                    key={day}
                                                                                    onMouseDown={(e) => e.preventDefault()}
                                                                                    onClick={() => handleDateSelect(day)}
                                                                                    className={`h-8 w-8 rounded-full text-xs transition-all ${todayClass} ${selectedClass} ${isSelected(day) ? '' : todayClass}`}
                                                                                >
                                                                                    {day}
                                                                                </button>
                                                                            );
                                                                        }
                                                                        return days;
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm"><button onMouseDown={(e) => e.preventDefault()} onClick={() => setNewTaskPriority('low')} className={`p-1 rounded ${newTaskPriority === 'low' ? 'bg-green-100 text-green-600' : 'text-slate-300'}`}><Flag size={14} fill={newTaskPriority === 'low' ? "currentColor" : "none"} /></button><button onMouseDown={(e) => e.preventDefault()} onClick={() => setNewTaskPriority('medium')} className={`p-1 rounded ${newTaskPriority === 'medium' ? 'bg-amber-100 text-amber-600' : 'text-slate-300'}`}><Flag size={14} fill={newTaskPriority === 'medium' ? "currentColor" : "none"} /></button><button onMouseDown={(e) => e.preventDefault()} onClick={() => setNewTaskPriority('high')} className={`p-1 rounded ${newTaskPriority === 'high' ? 'bg-red-100 text-red-600' : 'text-slate-300'}`}><Flag size={14} fill={newTaskPriority === 'high' ? "currentColor" : "none"} /></button></div>
                                            </div>
                                            <button onMouseDown={(e) => e.preventDefault()} onClick={handleAddTask} disabled={!newTaskInput.trim()} className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:shadow-none transition-all"><ArrowRight size={18} /></button>
                                        </div>
                                    )}
                                </div>
                                {showSmartSuggestion && showInputToolbar && (<div className="absolute top-full left-4 mt-2 animate-in slide-in-from-top-2 fade-in z-10"><button onClick={handleSmartAction} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-full shadow-xl hover:bg-indigo-700 border border-indigo-400"><Sparkles size={14} className="text-indigo-200" /> {showSmartSuggestion.text}</button></div>)}
                            </div>

                            {/* LISTA DE TAREAS */}
                            <TaskList
                                filteredTasks={filteredTasks}
                                currentContext={currentContext}
                                activeGroupId={activeGroupId}
                                activeGroupObj={activeGroupObj}
                                teamMembers={teamMembers}
                                categories={categories}
                                onTaskAction={handleTaskMainAction}
                                onUnblock={handleUnblock}
                                onAddComment={addComment}
                                onReadComments={markCommentsRead}
                                openChats={openChats}
                                onToggleChat={handleToggleChat}
                                currentUser={currentUser}
                            />
                        </div >
                    )}

                    {/* VISTA DE CALENDARIO iOS STYLE (INTERACTIVO & RESPONSIVE) */}
                    {
                        viewMode === 'calendar' && (
                            <CalendarView
                                calendarMonth={calendarMonth}
                                setCalendarMonth={setCalendarMonth}
                                calendarYear={calendarYear}
                                setCalendarYear={setCalendarYear}
                                calendarSelectedDate={calendarSelectedDate}
                                setCalendarSelectedDate={setCalendarSelectedDate}
                                filteredTasks={filteredTasks}
                                categories={categories}
                                teamMembers={teamMembers}
                                onTaskAction={handleTaskMainAction}
                                onUnblock={handleUnblock}
                                onAddComment={addComment}
                                onReadComments={markCommentsRead}
                                openChats={openChats}
                                onToggleChat={handleToggleChat}
                            />
                        )
                    }
                </div>
            </main>

            {/* MODAL GRUPOS */}
            <GroupModal
                isOpen={showGroupModal}
                onClose={() => setShowGroupModal(false)}
                activeTab={groupModalTab}
                setActiveTab={setGroupModalTab}
                currentContext={currentContext}
                groups={groups}
                inviteSelectedGroup={inviteSelectedGroup}
                setInviteSelectedGroup={setInviteSelectedGroup}
                newGroupName={newGroupName}
                setNewGroupName={setNewGroupName}
                joinCodeInput={joinCodeInput}
                setJoinCodeInput={setJoinCodeInput}
                onCreateGroup={handleCreateGroup}
                onJoinGroup={handleJoinGroup}
                onScanQR={async () => {
                    if (isMobile && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                        setShowQRScanner(true);
                    } else {
                        alert('El escáner QR requiere acceso a la cámara. Por favor, ingresa el código manualmente.');
                    }
                }}
                isMobile={isMobile}
            />


            {/* MODAL CONFIRMAR ELIMINAR CUENTA */}
            <DeleteAccountModal
                isOpen={showDeleteAccountConfirm}
                onClose={() => setShowDeleteAccountConfirm(false)}
                onConfirm={handleDeleteAccount}
            />

            {/* MODAL CONFIRMAR DEJAR GRUPO */}
            <LeaveGroupModal
                isOpen={showLeaveGroupConfirm}
                onClose={() => { setShowLeaveGroupConfirm(false); setGroupToLeave(null); }}
                group={groupToLeave}
                onConfirm={confirmLeaveGroup}
            />



            {/* MODAL DE CONFIGURACIÓN */}
            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                currentUser={currentUser}
                onUserUpdate={async (newAvatar) => {
                    try {
                        const result = await apiAuth.updateProfile(newAvatar);
                        if (result.success && result.user) {
                            if (onUserUpdate) {
                                onUserUpdate(result.user);
                            }
                        }
                    } catch (error) {
                        console.error('Error actualizando avatar:', error);
                    }
                }}
                userConfig={userConfig}
                setUserConfig={setUserConfig}
                onDeleteAccount={() => setShowDeleteAccountConfirm(true)}
                isMobile={isMobile}
                showAvatarSelector={showAvatarSelector}
                setShowAvatarSelector={setShowAvatarSelector}
            />

            {
                showEndDay && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="bg-indigo-600 p-6 text-white relative overflow-hidden">
                                <h2 className="text-2xl font-bold relative z-10">Cierre de Jornada</h2>
                                <button onClick={() => { setShowEndDay(false); setActiveTaskAction(null); }} className="absolute top-4 right-4 text-white/50 hover:text-white z-20"><X size={24} /></button>
                            </div>
                            <div className="p-6 overflow-y-auto">
                                {!activeTaskAction ? (
                                    <div className="space-y-3">
                                        <p className="text-slate-600 mb-4 text-sm">Pendientes en <strong>{activeGroupId === 'all' ? 'Todos los grupos' : activeGroupObj?.name}</strong>:</p>
                                        {filteredTasks.filter(t => {
                                            if (!t.assignees.includes(currentUser?.id || 'user')) return false;
                                            if (t.status !== 'pending') return false;

                                            // Exclude future tasks
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
                                            <div key={task.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                <div className="flex justify-between items-start mb-2"><span className="text-sm font-medium text-slate-700 leading-tight">{task.title}</span></div>
                                                <div className="flex gap-2 mt-2">
                                                    <button onClick={() => initiateAction(task.id, 'snooze')} className="flex-1 flex items-center justify-center gap-1 text-xs font-bold text-indigo-600 bg-white border border-indigo-100 py-2 rounded hover:bg-indigo-50 transition-colors">Mañana <ArrowRight size={12} /></button>
                                                    <button onClick={() => initiateAction(task.id, 'block')} className="flex-1 flex items-center justify-center gap-1 px-3 text-xs font-bold text-red-600 bg-white border border-red-100 py-2 rounded hover:bg-red-50 transition-colors"><Ban size={12} /> Bloquear</button>
                                                </div>
                                            </div>
                                        ))}
                                        {filteredTasks.filter(t => t.assignees.includes(currentUser?.id || 'user') && t.status === 'pending').length === 0 && <div className="text-center text-slate-400 py-4">Todo listo por hoy.</div>}
                                    </div>
                                ) : (
                                    <div className="animate-in slide-in-from-right">
                                        <h4 className="font-bold text-sm mb-2">Motivo</h4>
                                        <textarea value={actionReason} onChange={(e) => setActionReason(e.target.value)} className="w-full border rounded p-2 text-sm h-20" autoFocus />
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={() => setActiveTaskAction(null)} className="flex-1 py-2 text-sm text-slate-500">Volver</button>
                                            <button onClick={confirmAction} className="flex-1 py-2 text-sm font-bold text-white bg-blue-600 rounded">Confirmar</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showQRScanner && (
                    <QRScannerModal
                        onCodeScanned={(code) => {
                            if (qrScannerMode === 'equipment') {
                                handleEquipmentQRScanned(code);
                            } else {
                                // Modo grupo: unirse a grupo
                                setJoinCodeInput(code.toUpperCase());
                                setShowQRScanner(false);
                            }
                        }}
                        onClose={() => {
                            setShowQRScanner(false);
                        }}
                    />
                )
            }

            {/* Modal antiguo de equipo - DESHABILITADO, usar el nuevo modal con currentEquipment */}
            {/* {
                showEquipmentDetail && (
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in duration-200">
                        <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="bg-slate-800 text-white p-6 flex justify-between">
                                <h2 className="text-xl font-bold">{equipmentData.name}</h2>
                                <button onClick={() => setShowEquipmentDetail(false)}><X size={24} /></button>
                            </div>
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-3"><h3 className="text-xs font-bold text-slate-400 uppercase">Bitácora</h3><button onClick={() => setIsAddingLog(!isAddingLog)} className="text-blue-600 text-xs font-bold">+ Agregar</button></div>
                                {isAddingLog && (
                                    <div className="flex gap-2 mb-4">
                                        <input type="text" value={newLogInput} onChange={(e) => setNewLogInput(e.target.value)} className="flex-1 border rounded px-2 py-1 text-sm" />
                                        <button onClick={handleAddLog} className="bg-blue-600 text-white px-3 rounded">→</button>
                                    </div>
                                )}
                                <div className="space-y-3">
                                    {equipmentData.logs.map(log => (
                                        <div key={log.id} className="text-sm border-l-2 border-slate-200 pl-3"><p className="font-medium">{log.action}</p><p className="text-xs text-slate-400">{log.date} • {log.user}</p></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            } */}

            {/* MODAL RESTAURAR TAREA FINALIZADA */}
            {
                showRestoreModal && taskToRestore && (
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
                        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <History size={20} className="text-blue-600" />
                                    Restaurar Tarea
                                </h2>
                                <button onClick={() => { setShowRestoreModal(false); setTaskToRestore(null); setRestoreAssignees([]); setRestoreDue('Hoy'); setRestoreTime(''); }}>
                                    <X size={24} className="text-slate-400 hover:text-slate-600" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Información de la tarea - Minimalista */}
                                <div className="text-center pb-4 border-b border-slate-100">
                                    <p className="text-base font-semibold text-slate-800 mb-1">{taskToRestore.title}</p>
                                    <p className="text-xs text-slate-500">
                                        Completada {taskToRestore.completedAt ? new Date(taskToRestore.completedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'anteriormente'}
                                    </p>
                                </div>

                                {/* Miembros asignados - Estilo iOS */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                        Asignar a
                                    </label>
                                    <div className="flex -space-x-2 flex-wrap gap-2">
                                        {teamMembers.map(member => {
                                            const isSelected = restoreAssignees.includes(member.id);
                                            return (
                                                <button
                                                    key={member.id}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            // Solo permitir deseleccionar si hay más de un miembro seleccionado
                                                            if (restoreAssignees.length > 1) {
                                                                setRestoreAssignees(restoreAssignees.filter(id => id !== member.id));
                                                            }
                                                        } else {
                                                            setRestoreAssignees([...restoreAssignees, member.id]);
                                                        }
                                                    }}
                                                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-200 hover:scale-110 relative z-0 ${isSelected
                                                        ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-200/50 scale-105 z-10'
                                                        : 'border-slate-200 bg-slate-100 hover:border-slate-300 hover:bg-slate-200'
                                                        }`}
                                                    title={member.name}
                                                >
                                                    <span className="text-xl">{member.avatar}</span>
                                                    {isSelected && (
                                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                                                            <Check size={12} className="text-white" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {restoreAssignees.length === 0 && (
                                        <p className="text-xs text-red-500 mt-2">Debes asignar al menos un miembro</p>
                                    )}
                                </div>

                                {/* Fecha de vencimiento - Estilo iOS */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                        Fecha de vencimiento
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setRestoreDue('Hoy')}
                                            className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${restoreDue === 'Hoy'
                                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95'
                                                }`}
                                        >
                                            Hoy
                                        </button>
                                        <button
                                            onClick={() => setRestoreDue('Mañana')}
                                            className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${restoreDue === 'Mañana'
                                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95'
                                                }`}
                                        >
                                            Mañana
                                        </button>
                                        <button
                                            onClick={() => {
                                                // Si ya está en modo personalizada, no hacer nada
                                                if (restoreDue !== 'Hoy' && restoreDue !== 'Mañana') return;
                                                // Si no, establecer fecha de mañana como default
                                                const tomorrow = new Date();
                                                tomorrow.setDate(tomorrow.getDate() + 1);
                                                setRestoreDue(tomorrow.toISOString().split('T')[0]);
                                            }}
                                            className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${restoreDue !== 'Hoy' && restoreDue !== 'Mañana'
                                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95'
                                                }`}
                                        >
                                            Personalizada
                                        </button>
                                    </div>
                                    {restoreDue !== 'Hoy' && restoreDue !== 'Mañana' && (
                                        <input
                                            type="date"
                                            value={restoreDue}
                                            onChange={(e) => setRestoreDue(e.target.value)}
                                            className="w-full mt-3 border border-slate-200 rounded-xl p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        />
                                    )}
                                </div>

                                {/* Hora (opcional) - Estilo iOS */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                        Hora (Opcional)
                                    </label>
                                    <input
                                        type="time"
                                        value={restoreTime}
                                        onChange={(e) => setRestoreTime(e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>

                                {/* Botones de acción - Estilo iOS */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => { setShowRestoreModal(false); setTaskToRestore(null); setRestoreAssignees([]); setRestoreDue('Hoy'); setRestoreTime(''); }}
                                        className="flex-1 px-4 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 active:scale-95 transition-all duration-200"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmRestoreTask}
                                        disabled={restoreAssignees.length === 0}
                                        className="flex-1 px-4 py-3.5 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all duration-200 shadow-lg shadow-blue-500/30 disabled:shadow-none"
                                    >
                                        Restaurar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* MODAL TAREA VENCIDA */}
            {showOverdueTaskModal && overdueTask && (
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle size={32} className="text-red-600" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">¡Tarea Vencida!</h2>
                            <p className="text-slate-600 mb-6">
                                La tarea <span className="font-bold text-slate-800">"{overdueTask.title}"</span> venció ayer.
                                <br />¿Qué quieres hacer con ella?
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={async () => {
                                        // Mantener para hoy
                                        const updatedTask = { ...overdueTask, due: 'Hoy', status: 'pending' };
                                        setTasks(tasks.map(t => t.id === overdueTask.id ? updatedTask : t));
                                        setShowOverdueTaskModal(false);
                                        setOverdueTask(null);
                                        await apiTasks.update(overdueTask.id, { due: 'Hoy', status: 'pending' });
                                    }}
                                    className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-base shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
                                >
                                    Mantener para Hoy
                                </button>

                                <button
                                    onClick={async () => {
                                        // Bloquear
                                        const updatedTask = { ...overdueTask, status: 'blocked', blockedBy: currentUser?.id, blockReason: 'Vencida y no gestionada' };
                                        setTasks(tasks.map(t => t.id === overdueTask.id ? updatedTask : t));
                                        setShowOverdueTaskModal(false);
                                        setOverdueTask(null);
                                        await apiTasks.update(overdueTask.id, { status: 'blocked', blockedBy: currentUser?.id, blockReason: 'Vencida y no gestionada' });
                                    }}
                                    className="w-full py-3.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-base hover:bg-slate-200 active:scale-95 transition-all"
                                >
                                    Bloquear Tarea
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE ESCÁNER QR */}
            {showQRScanner && (
                <QRScannerModal
                    onCodeScanned={(code) => {
                        if (qrScannerMode === 'equipment') {
                            handleEquipmentQRScanned(code);
                        } else if (typeof onQRScanSuccess === 'function') {
                            // Si hay una función onQRScanSuccess, usarla (para casos especiales)
                            onQRScanSuccess(code);
                            setShowQRScanner(false);
                        } else {
                            // Modo grupo por defecto
                            setJoinCodeInput(code.toUpperCase());
                            setShowQRScanner(false);
                        }
                    }}
                    onClose={() => setShowQRScanner(false)}
                />
            )}

            {/* MODAL DE DETALLE DE EQUIPO */}
            {showEquipmentDetail && currentEquipment && (() => {
                console.log('🎯 RENDERIZANDO MODAL DE EQUIPO:', {
                    showEquipmentDetail,
                    currentEquipment: currentEquipment ? { qr_code: currentEquipment.qr_code, isNew: currentEquipment.isNew } : null,
                    isMobile,
                    windowWidth: typeof window !== 'undefined' ? window.innerWidth : 0
                });
                return (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        style={{
                            zIndex: 10000,
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            width: '100vw',
                            height: '100vh',
                            margin: 0,
                            padding: isMobile ? '1rem' : '1.5rem',
                            overflow: 'auto',
                            WebkitOverflowScrolling: 'touch'
                        }}
                        onClick={(e) => {
                            // Cerrar al hacer click fuera del modal
                            if (e.target === e.currentTarget) {
                                setShowEquipmentDetail(false);
                                setCurrentEquipment(null);
                                setEquipmentLogs([]);
                            }
                        }}
                    >
                        <div
                            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                            style={{
                                zIndex: 10001,
                                position: 'relative',
                                maxHeight: isMobile ? 'calc(100vh - 2rem)' : '90vh',
                                margin: 'auto',
                                width: '100%'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                                <h2 className="text-xl font-bold text-slate-900">
                                    {currentEquipment.isNew ? 'Nuevo Equipo' : 'Detalle de Equipo'}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowEquipmentDetail(false);
                                        setCurrentEquipment(null);
                                        setEquipmentLogs([]);
                                    }}
                                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <X size={24} className="text-slate-600" />
                                </button>
                            </div>

                            {/* Contenido */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Código QR */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Código QR</label>
                                    <div className="px-4 py-3 bg-slate-100 rounded-lg font-mono text-sm text-slate-900">
                                        {currentEquipment.qr_code}
                                    </div>
                                </div>

                                {/* Nombre */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre del Equipo</label>
                                    <input
                                        type="text"
                                        value={currentEquipment.name || ''}
                                        onChange={(e) => setCurrentEquipment({ ...currentEquipment, name: e.target.value })}
                                        placeholder="Ej: Cromatógrafo Líquido #02"
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                </div>

                                {/* Estado */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Estado</label>
                                    <select
                                        value={currentEquipment.status || 'operational'}
                                        onChange={(e) => setCurrentEquipment({ ...currentEquipment, status: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    >
                                        <option value="operational">✅ Operativo</option>
                                        <option value="maintenance">🔧 En Mantenimiento</option>
                                        <option value="out_of_service">❌ Fuera de Servicio</option>
                                    </select>
                                </div>

                                {/* Fechas de Mantenimiento */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Última Mantención</label>
                                        <input
                                            type="date"
                                            value={currentEquipment.last_maintenance || ''}
                                            onChange={(e) => setCurrentEquipment({ ...currentEquipment, last_maintenance: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Próxima Mantención</label>
                                        <input
                                            type="date"
                                            value={currentEquipment.next_maintenance || ''}
                                            onChange={(e) => setCurrentEquipment({ ...currentEquipment, next_maintenance: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        />
                                    </div>
                                </div>

                                {/* Bitácora */}
                                {!currentEquipment.isNew && (
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-bold text-slate-900">Bitácora</h3>
                                            <button
                                                onClick={() => setIsAddingLog(!isAddingLog)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                            >
                                                + Agregar Entrada
                                            </button>
                                        </div>

                                        {isAddingLog && (
                                            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                                <textarea
                                                    value={newLogInput}
                                                    onChange={(e) => setNewLogInput(e.target.value)}
                                                    placeholder="Describe el cambio o evento..."
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                                                    rows={3}
                                                />
                                                <div className="flex gap-2 mt-2">
                                                    <button
                                                        onClick={async () => {
                                                            if (newLogInput.trim()) {
                                                                try {
                                                                    const newLog = await apiEquipment.addLog(currentEquipment.qr_code, newLogInput);
                                                                    setEquipmentLogs([newLog, ...equipmentLogs]);
                                                                    setNewLogInput('');
                                                                    setIsAddingLog(false);
                                                                } catch (error) {
                                                                    console.error('Error agregando log:', error);
                                                                    alert('Error al agregar entrada');
                                                                }
                                                            }
                                                        }}
                                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                                    >
                                                        Guardar
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setIsAddingLog(false);
                                                            setNewLogInput('');
                                                        }}
                                                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-3 max-h-64 overflow-y-auto">
                                            {equipmentLogs.length === 0 ? (
                                                <p className="text-sm text-slate-500 text-center py-4">No hay entradas en la bitácora</p>
                                            ) : (
                                                equipmentLogs.map((log) => (
                                                    <div key={log.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                                <span className="text-sm">{log.avatar || '👤'}</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-sm font-semibold text-slate-900">{log.username}</span>
                                                                    <span className="text-xs text-slate-500">
                                                                        {new Date(log.created_at).toLocaleString('es-CL')}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-slate-700">{log.content}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer con botones */}
                            <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowEquipmentDetail(false);
                                        setCurrentEquipment(null);
                                        setEquipmentLogs([]);
                                    }}
                                    className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            if (currentEquipment.isNew) {
                                                // Crear nuevo equipo
                                                await apiEquipment.create({
                                                    qrCode: currentEquipment.qr_code,
                                                    name: currentEquipment.name,
                                                    groupId: activeGroupId === 'all' ? currentGroups[0]?.id : activeGroupId,
                                                    status: currentEquipment.status || 'operational',
                                                    lastMaintenance: currentEquipment.last_maintenance,
                                                    nextMaintenance: currentEquipment.next_maintenance
                                                });
                                                alert('✅ Equipo creado exitosamente');
                                            } else {
                                                // Actualizar equipo existente
                                                await apiEquipment.update(currentEquipment.qr_code, {
                                                    name: currentEquipment.name,
                                                    status: currentEquipment.status,
                                                    lastMaintenance: currentEquipment.last_maintenance,
                                                    nextMaintenance: currentEquipment.next_maintenance
                                                });
                                                alert('✅ Equipo actualizado exitosamente');
                                            }
                                            setShowEquipmentDetail(false);
                                            setCurrentEquipment(null);
                                            setEquipmentLogs([]);
                                        } catch (error) {
                                            console.error('Error guardando equipo:', error);
                                            alert('Error al guardar el equipo');
                                        }
                                    }}
                                    disabled={!currentEquipment.name || !currentEquipment.name.trim()}
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {currentEquipment.isNew ? 'Crear Equipo' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* MODAL DE CONFIRMACIÓN PARA CREAR EQUIPO (DESKTOP) */}
            {showCreateEquipmentConfirm && pendingEquipmentCode && !isMobile && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    style={{
                        zIndex: 100000,
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: '100vw',
                        height: '100vh'
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            handleCancelCreateEquipment();
                        }
                    }}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                        style={{
                            zIndex: 10000,
                            position: 'relative'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                            Equipo no encontrado
                        </h3>
                        <p className="text-slate-600 mb-6">
                            El equipo con código <span className="font-mono font-bold text-slate-900">{pendingEquipmentCode}</span> no existe.
                            <br /><br />
                            ¿Deseas crear una nueva ficha para este equipo?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancelCreateEquipment}
                                className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmCreateEquipment}
                                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Crear Equipo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMACIÓN PARA CREAR EQUIPO (MÓVIL INDEPENDIENTE) */}
            {showMobileConfirm && pendingEquipmentCode && isMobile && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        zIndex: 999999, // Z-index extremo
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            width: '100%',
                            maxWidth: '320px',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}
                    >
                        <h3 className="text-xl font-bold text-slate-900 mb-4 text-center">
                            ¿Crear Nuevo Equipo?
                        </h3>
                        <p className="text-slate-600 mb-6 text-center">
                            El código <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">{pendingEquipmentCode}</span> no está registrado.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    setShowMobileConfirm(false);
                                    handleConfirmCreateEquipment();
                                }}
                                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform"
                            >
                                Crear Equipo
                            </button>
                            <button
                                onClick={() => {
                                    setShowMobileConfirm(false);
                                    setPendingEquipmentCode(null);
                                }}
                                className="w-full py-4 bg-slate-100 text-slate-700 rounded-xl font-bold text-lg active:scale-95 transition-transform"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default FlowSpace;
