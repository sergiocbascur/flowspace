import React, { useState, useRef, useEffect, useMemo } from 'react';
import { deleteUser } from './authService';
import { apiGroups, apiTasks, apiAuth } from './apiService';
import { init, getEmojiDataFromNative } from 'emoji-mart';
import {
    CheckCircle2, CheckCircle, Circle, Clock, AlertTriangle, Mail, BrainCircuit, Plus, Search, Calendar, Users, MoreHorizontal, LogOut, Lock, ArrowRight, X, QrCode, MapPin, History, Save, Moon, MessageSquare, Send, Ban, Unlock, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Settings, CalendarCheck, Sparkles, Flag, Lightbulb, Check, Tag, Briefcase, Home, Layers, UserPlus, Copy, LogIn, LayoutGrid, Folder, Share2, ScanLine, Eye, Bell, ShieldCheck, CheckSquare, BarChart3, Wrench, Activity, Maximize2, Minimize2, List, Grid3X3, UserMinus, Pencil
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

    // Estado Calendario
    const today = new Date();
    const [calendarSelectedDate, setCalendarSelectedDate] = useState(today.getDate());
    const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
    const [calendarYear, setCalendarYear] = useState(today.getFullYear());

    useEffect(() => {
        const firstGroup = groups.find(g => g.type === currentContext);
        if (firstGroup) setInviteSelectedGroup(firstGroup.id);
    }, [currentContext, groups]);

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

                console.log('Conectando WebSocket:', wsUrl);
                ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                    console.log('✅ WebSocket conectado');
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
                        console.log('📩 Mensaje WS recibido:', data);

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
                            console.log('📩 Notificación recibida por WebSocket:', data.notification);
                            console.log('📩 Tipo de notificación:', data.notification.type);
                            console.log('📩 userId de notificación:', data.notification.userId);
                            console.log('📩 currentUserId:', currentUser?.id);
                            
                            setAllSuggestions(prev => {
                                const updated = [data.notification, ...prev];
                                console.log('Total notificaciones después de agregar:', updated.length);
                                console.log('Notificaciones con userId:', updated.filter(s => s.userId).map(s => ({
                                    id: s.id,
                                    type: s.type,
                                    userId: s.userId
                                })));
                                return updated;
                            });
                            // Solo mostrar indicador de Inteligencia si NO es un comentario normal
                            // Los comentarios se muestran en el botón de comentarios de la tarea
                            if (data.notification.type !== 'comment') {
                                console.log('✅ Activando indicador de Inteligencia para:', data.notification.type);
                                setIntelligenceHasUnread(true);
                            } else {
                                console.log('⏭️ Notificación de comentario ignorada para Inteligencia');
                            }
                        }
                    } catch (error) {
                        console.error('Error procesando mensaje WS:', error);
                    }
                };

                ws.onclose = () => {
                    console.log('❌ WebSocket desconectado. Reintentando en 5s...');
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

    // Resetear resumen cuando cambian las tareas o el contexto
    useEffect(() => {
        setShowSummary(false);
        setSummaryData(null);
    }, [tasks, currentContext, activeGroupId]);

    // Config
    const [userConfig, setUserConfig] = useState({
        googleCalendarSync: true,
        syncScope: 'mine',
        autoScheduleMeeting: true,
        defaultMeetingTime: '09:00',
        notifyDeadline: true,
        notifyAssignment: true,
        notifyValidation: true
    });

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

    // SUGERENCIAS
    const [allSuggestions, setAllSuggestions] = useState([
        { id: 101, groupId: 'lab1', type: 'email', subject: 'Vencimiento Certificado Balanza', sender: 'Metrología', context: 'Vence en 3 días', suggestedAction: 'Agendar visita' },
        { id: 102, groupId: 'comite', type: 'email', subject: 'Acta Reunión Anterior', sender: 'Secretaría', context: 'Pendiente firma', suggestedAction: 'Firmar digitalmente' }
    ]);

    // Filtrar sugerencias por contexto/grupo activo y usuario
    const filteredSuggestions = useMemo(() => {
        console.log('🔍 Filtrando notificaciones:', {
            total: allSuggestions.length,
            currentUserId: currentUser?.id,
            activeGroupId,
            currentContext
        });
        
        return allSuggestions.filter(suggestion => {
            // NO mostrar notificaciones de comentarios normales en Inteligencia
            // Los comentarios se muestran en el botón de comentarios de la tarea
            if (suggestion.type === 'comment') {
                console.log('⏭️ Notificación de comentario filtrada:', suggestion.id);
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
                
                console.log('🔍 Verificando userId:', {
                    suggestionId: suggestion.id,
                    suggestionType: suggestion.type,
                    suggestionUserId: suggestion.userId,
                    suggestionUserIdStr,
                    currentUserId: currentUser?.id,
                    currentUserIdStr,
                    matches: matchesUser
                });
                
                if (!matchesUser) {
                    console.log('❌ Notificación filtrada por userId:', {
                        suggestionId: suggestion.id,
                        suggestionType: suggestion.type,
                        suggestionUserId: suggestion.userId,
                        currentUserId: currentUser?.id
                    });
                    return false; // No mostrar esta notificación al usuario actual
                }
                // Si el userId coincide, mostrar la notificación independientemente del grupo
                // (esto es importante para menciones que pueden venir de cualquier grupo)
                console.log('✅ Notificación aprobada por userId:', {
                    suggestionId: suggestion.id,
                    suggestionType: suggestion.type,
                    suggestionUserId: suggestion.userId
                });
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
            
            if (!matchesGroup) {
                console.log('❌ Notificación filtrada por grupo:', {
                    suggestionId: suggestion.id,
                    suggestionType: suggestion.type,
                    suggestionGroupId: suggestion.groupId,
                    activeGroupId,
                    currentContext
                });
            }
            
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
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [showEquipmentDetail, setShowEquipmentDetail] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showAvatarSelector, setShowAvatarSelector] = useState(false);
    const [newLogInput, setNewLogInput] = useState('');
    const [isAddingLog, setIsAddingLog] = useState(false);
    const [activeTaskAction, setActiveTaskAction] = useState(null);
    const [actionReason, setActionReason] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false); // Nuevo estado para date picker
    const [datePickerMonth, setDatePickerMonth] = useState(new Date().getMonth());
    const [datePickerYear, setDatePickerYear] = useState(new Date().getFullYear());
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
            console.log('Comentario guardado en el backend');
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
    const executeSnooze = (taskId) => { setTasks(tasks.map(t => t.id === taskId ? { ...t, due: 'Mañana', status: 'upcoming', postponeCount: t.postponeCount + 1 } : t)); setActiveTaskAction(null); };
    const executeBlock = (taskId, reason) => { setTasks(tasks.map(t => t.id === taskId ? { ...t, status: 'blocked', blockedBy: 'Tú', blockReason: reason } : t)); setActiveTaskAction(null); };
    const confirmAction = () => { if (!activeTaskAction || !actionReason.trim()) return; if (activeTaskAction.type === 'snooze') executeSnooze(activeTaskAction.taskId); else executeBlock(activeTaskAction.taskId, actionReason); };
    const handleScanQR = () => { setShowQRScanner(true); setTimeout(() => { setShowQRScanner(false); setShowEquipmentDetail(true); }, 1500); };
    const updateEquipmentStatus = (newStatus) => { const today = new Date().toISOString().split('T')[0]; setEquipmentData({ ...equipmentData, status: newStatus, logs: [{ id: Date.now(), date: today, user: currentUser.name, action: `Cambio de estado a: ${newStatus}` }, ...equipmentData.logs] }); };
    const handleAddLog = () => { if (!newLogInput.trim()) return; const today = new Date().toISOString().split('T')[0]; setEquipmentData({ ...equipmentData, logs: [{ id: Date.now(), date: today, user: currentUser.name, action: newLogInput }, ...equipmentData.logs] }); setNewLogInput(''); setIsAddingLog(false); };
    const handleSmartAction = () => { alert(`📅 Evento creado: ${newTaskInput}`); handleAddTask(); setShowSmartSuggestion(null); };
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

    // Funciones para el calendario principal estilo iOS
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

    // Componente TaskCard
    const TaskCard = ({ task, team, categories, onToggle, isOverdue, isBlocked, completed, onUnblock, onAddComment, onReadComments }) => {
        const isChatOpen = openChats.has(task.id);
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
            
            // Actualizar el estado global de chats abiertos
            setOpenChats(prev => {
                const newSet = new Set(prev);
                if (willShow) {
                    newSet.add(task.id);
                } else {
                    newSet.delete(task.id);
                }
                return newSet;
            });
            
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
                                            className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 transition-colors ${
                                                index === selectedMentionIndex ? 'bg-blue-50' : ''
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

    // Estados para móvil
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showNewTaskModal, setShowNewTaskModal] = useState(false);
    const [selectedTaskForChat, setSelectedTaskForChat] = useState(null);
    const [mobileCommentInput, setMobileCommentInput] = useState('');

    // Si es móvil, renderizar versión iOS Reminders
    if (isMobile) {
        return (
            <div className="h-screen bg-white font-sans text-slate-900 overflow-hidden relative" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>
                {/* Safe area para iPhone notch */}
                <div className="h-full flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
                    
                    {/* HEADER MÓVIL - Estilo iOS */}
                    <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 py-3 flex items-center justify-between sticky top-0 z-50" style={{ paddingTop: 'max(12px, env(safe-area-inset-top) + 12px)' }}>
                        <button
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                            className="p-2 -ml-2"
                        >
                            <List size={22} className="text-slate-700" />
                        </button>
                        <h1 className="text-lg font-semibold text-slate-900">
                            {activeGroupId === 'all' 
                                ? (currentContext === 'work' ? 'Trabajo' : 'Personal')
                                : groups.find(g => g.id === activeGroupId)?.name || 'Tareas'
                            }
                        </h1>
                        <div className="w-10" /> {/* Spacer para centrar */}
                    </header>

                    {/* MENÚ MÓVIL DESLIZABLE */}
                    {showMobileMenu && (
                        <>
                            <div 
                                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                                onClick={() => setShowMobileMenu(false)}
                            />
                            <aside className="fixed left-0 top-0 h-full w-72 bg-white/95 backdrop-blur-xl border-r border-slate-200/50 z-50 shadow-xl transform transition-transform duration-300 ease-out" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                                <div className="h-full overflow-y-auto p-4">
                                    {/* Header del menú */}
                                    <div className="mb-6 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                                                <Layers size={18} className="text-blue-400" />
                                            </div>
                                            <div>
                                                <h2 className="text-base font-bold text-slate-900">GENSHIKEN</h2>
                                                <p className="text-[10px] text-slate-500 uppercase">FlowSpace</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setShowMobileMenu(false)} className="p-2">
                                            <X size={20} className="text-slate-600" />
                                        </button>
                                    </div>

                                    {/* Context Toggle */}
                                    <div className="bg-slate-100 p-1 rounded-xl flex mb-4">
                                        <button 
                                            onClick={() => { setCurrentContext('work'); setActiveGroupId('all'); setShowMobileMenu(false); }} 
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${currentContext === 'work' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
                                        >
                                            Trabajo
                                        </button>
                                        <button 
                                            onClick={() => { setCurrentContext('personal'); setActiveGroupId('all'); setShowMobileMenu(false); }} 
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${currentContext === 'personal' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600'}`}
                                        >
                                            Personal
                                        </button>
                                    </div>

                                    {/* Filtros */}
                                    <div className="space-y-1 mb-4">
                                        <button
                                            onClick={() => { setActiveFilter('today'); setShowMobileMenu(false); }}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeFilter === 'today' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Calendar size={18} />
                                                <span>Hoy</span>
                                            </div>
                                            <span className="text-xs text-slate-500">
                                                {tasks.filter(t => {
                                                    const today = new Date().toISOString().split('T')[0];
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
                                                    return (isToday || isOverdue) && (t.status === 'pending' || t.status === 'blocked') && groups.find(g => g.id === t.groupId)?.type === currentContext;
                                                }).length}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => { setActiveFilter('scheduled'); setShowMobileMenu(false); }}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeFilter === 'scheduled' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Clock size={18} />
                                                <span>Programado</span>
                                            </div>
                                        </button>
                                    </div>

                                    {/* Grupos */}
                                    <div className="border-t border-slate-200 pt-4">
                                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2 px-3">Espacios</p>
                                        <button
                                            onClick={() => { setActiveGroupId('all'); setShowMobileMenu(false); }}
                                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeGroupId === 'all' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            <Folder size={16} />
                                            <span>Todos</span>
                                        </button>
                                        {currentGroups.map(group => (
                                            <button
                                                key={group.id}
                                                onClick={() => { setActiveGroupId(group.id); setShowMobileMenu(false); }}
                                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeGroupId === group.id ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'}`}
                                            >
                                                <Folder size={16} />
                                                <span className="flex-1 text-left">{group.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </aside>
                        </>
                    )}

                    {/* CONTENIDO PRINCIPAL MÓVIL - Estilo iOS Reminders */}
                    <main className="flex-1 overflow-y-auto bg-white">
                        <div className="px-4 py-2">
                            {/* Lista de tareas - Estilo iOS Reminders */}
                            {filteredTasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                                    <div className="w-20 h-20 bg-slate-100/50 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle2 size={36} className="text-slate-300" />
                                    </div>
                                    <p className="text-lg font-semibold text-slate-700 mb-1">No hay tareas</p>
                                    <p className="text-sm text-slate-500">Toca el botón + abajo para agregar una</p>
                                </div>
                            ) : (
                                <div className="space-y-0.5">
                                    {filteredTasks.map(task => {
                                        const isOverdue = task.status === 'pending' && task.due && task.due !== 'Hoy' && task.due !== 'Mañana' && new Date(task.due) < new Date();
                                        const priorityColor = task.priority === 'high' ? 'text-red-500' : task.priority === 'medium' ? 'text-amber-500' : '';
                                        
                                        return (
                                            <div
                                                key={task.id}
                                                className="flex items-start gap-3 px-4 py-3.5 active:bg-slate-50/50 transition-colors"
                                            >
                                                {/* Checkbox circular grande - Estilo iOS */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleTaskMainAction(task); }}
                                                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${
                                                        task.status === 'completed' 
                                                            ? 'bg-blue-500 border-blue-500 shadow-sm' 
                                                            : isOverdue
                                                            ? 'border-red-300'
                                                            : 'border-slate-300'
                                                    }`}
                                                >
                                                    {task.status === 'completed' && (
                                                        <Check size={14} className="text-white" strokeWidth={3} />
                                                    )}
                                                </button>

                                                {/* Contenido de la tarea - Clickable para abrir detalles */}
                                                <div 
                                                    className="flex-1 min-w-0"
                                                    onClick={() => setSelectedTaskForChat(task)}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <p className={`text-[15px] leading-snug flex-1 ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                                            {task.title}
                                                        </p>
                                                        {task.priority === 'high' && (
                                                            <Flag size={14} className={`${priorityColor} flex-shrink-0 mt-0.5`} fill="currentColor" />
                                                        )}
                                                    </div>
                                                    
                                                    {/* Metadatos */}
                                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                        {task.due && (
                                                            <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                                                                {task.due}
                                                            </span>
                                                        )}
                                                        {task.time && (
                                                            <span className="text-xs text-slate-500">
                                                                {task.due ? '•' : ''} {task.time}
                                                            </span>
                                                        )}
                                                        {task.category && (
                                                            <span className="text-xs text-slate-500">
                                                                {task.due || task.time ? '•' : ''} {task.category}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Asignados */}
                                                    {task.assignees && task.assignees.length > 0 && (
                                                        <div className="flex items-center gap-1.5 mt-2">
                                                            {task.assignees.slice(0, 3).map((assigneeId, idx) => {
                                                                const member = teamMembers.find(m => m.id === assigneeId);
                                                                return (
                                                                    <div 
                                                                        key={idx}
                                                                        className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px]"
                                                                        title={member?.name || member?.username || assigneeId}
                                                                    >
                                                                        {member?.avatar || '?'}
                                                                    </div>
                                                                );
                                                            })}
                                                            {task.assignees.length > 3 && (
                                                                <span className="text-xs text-slate-400">+{task.assignees.length - 3}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Botón de chat */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedTaskForChat(task);
                                                    }}
                                                    className="flex-shrink-0 p-2 -mr-2"
                                                >
                                                    <MessageSquare 
                                                        size={18} 
                                                        className={task.unreadComments > 0 ? 'text-blue-500' : 'text-slate-400'} 
                                                        fill={task.unreadComments > 0 ? 'currentColor' : 'none'}
                                                    />
                                                    {task.unreadComments > 0 && (
                                                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full border border-white" />
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </main>

                    {/* INPUT FLOTANTE PARA NUEVA TAREA - Estilo iOS */}
                    <div className="bg-white/95 backdrop-blur-xl border-t border-slate-200/50 px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom) + 16px)' }}>
                        <button
                            onClick={() => setShowNewTaskModal(true)}
                            className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 active:bg-slate-100 transition-colors"
                        >
                            <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center flex-shrink-0">
                                <Plus size={14} className="text-slate-400" />
                            </div>
                            <span className="text-[15px] text-slate-500 flex-1 text-left">Nueva tarea</span>
                        </button>
                    </div>

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
                                            setSelectedAssignees([currentUser?.id || 'user']);
                                            setSelectedCategory(categories[0]?.id || '');
                                            setSelectedDue('Hoy');
                                            setSelectedTime('');
                                        }}
                                        className="text-blue-600 text-base font-medium"
                                    >
                                        Cancelar
                                    </button>
                                    <h2 className="text-lg font-semibold text-slate-900">Nueva tarea</h2>
                                    <button
                                        onClick={async () => {
                                            if (newTaskInput.trim()) {
                                                await handleAddTask();
                                                setShowNewTaskModal(false);
                                                setNewTaskInput('');
                                                setSelectedAssignees([currentUser?.id || 'user']);
                                                setSelectedCategory(categories[0]?.id || '');
                                                setSelectedDue('Hoy');
                                                setSelectedTime('');
                                            }
                                        }}
                                        disabled={!newTaskInput.trim()}
                                        className="text-blue-600 text-base font-semibold disabled:text-slate-400"
                                    >
                                        Guardar
                                    </button>
                                </div>

                                {/* Contenido del modal */}
                                <div className="flex-1 overflow-y-auto px-4 py-4">
                                    {/* Input de título */}
                                    <input
                                        type="text"
                                        value={newTaskInput}
                                        onChange={(e) => setNewTaskInput(e.target.value)}
                                        placeholder="Título de la tarea"
                                        className="w-full text-lg py-3 border-b border-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                                        autoFocus
                                    />

                                    {/* Opciones */}
                                    <div className="mt-4 space-y-1">
                                        {/* Fecha */}
                                        <button
                                            onClick={() => {
                                                // Toggle date picker
                                                const today = new Date().toISOString().split('T')[0];
                                                if (selectedDue === 'Hoy') {
                                                    setSelectedDue('Mañana');
                                                } else if (selectedDue === 'Mañana') {
                                                    setSelectedDue(today);
                                                } else {
                                                    setSelectedDue('Hoy');
                                                }
                                            }}
                                            className="w-full flex items-center justify-between py-3 px-2 active:bg-slate-50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Calendar size={20} className="text-slate-400" />
                                                <span className="text-base text-slate-900">Fecha</span>
                                            </div>
                                            <span className="text-base text-slate-500">{selectedDue}</span>
                                        </button>

                                        {/* Hora */}
                                        <button
                                            onClick={() => {
                                                // Toggle time
                                                if (!selectedTime) {
                                                    const now = new Date();
                                                    const hours = now.getHours().toString().padStart(2, '0');
                                                    const minutes = now.getMinutes().toString().padStart(2, '0');
                                                    setSelectedTime(`${hours}:${minutes}`);
                                                } else {
                                                    setSelectedTime('');
                                                }
                                            }}
                                            className="w-full flex items-center justify-between py-3 px-2 active:bg-slate-50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Clock size={20} className="text-slate-400" />
                                                <span className="text-base text-slate-900">Hora</span>
                                            </div>
                                            <span className="text-base text-slate-500">{selectedTime || 'Sin hora'}</span>
                                        </button>

                                        {/* Categoría */}
                                        <div className="py-3 px-2">
                                            <div className="flex items-center gap-3 mb-3">
                                                <Tag size={20} className="text-slate-400" />
                                                <span className="text-base text-slate-900">Categoría</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {categories.map(cat => (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => setSelectedCategory(cat.id)}
                                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                                            selectedCategory === cat.id
                                                                ? `${cat.color} text-white`
                                                                : 'bg-slate-100 text-slate-700'
                                                        }`}
                                                    >
                                                        {cat.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Miembros */}
                                        <div className="py-3 px-2">
                                            <div className="flex items-center gap-3 mb-3">
                                                <Users size={20} className="text-slate-400" />
                                                <span className="text-base text-slate-900">Asignar a</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {teamMembers.map(member => (
                                                    <button
                                                        key={member.id}
                                                        onClick={() => {
                                                            if (selectedAssignees.includes(member.id)) {
                                                                if (selectedAssignees.length > 1) {
                                                                    setSelectedAssignees(selectedAssignees.filter(id => id !== member.id));
                                                                }
                                                            } else {
                                                                setSelectedAssignees([...selectedAssignees, member.id]);
                                                            }
                                                        }}
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                                                            selectedAssignees.includes(member.id)
                                                                ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                                                                : 'bg-slate-100 text-slate-700 border-2 border-transparent'
                                                        }`}
                                                    >
                                                        <span className="text-base">{member.avatar}</span>
                                                        <span>{member.name || member.username}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODAL PARA VER CHAT DE TAREA */}
                    {selectedTaskForChat && (
                        <div className="fixed inset-0 bg-white z-50 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                                <button
                                    onClick={() => {
                                        setSelectedTaskForChat(null);
                                        setMobileCommentInput('');
                                        // Actualizar la tarea para reflejar cambios
                                        const updatedTask = tasks.find(t => t.id === selectedTaskForChat.id);
                                        if (updatedTask) {
                                            setSelectedTaskForChat(updatedTask);
                                        }
                                    }}
                                    className="text-blue-600 text-base font-medium"
                                >
                                    Atrás
                                </button>
                                <h2 className="text-lg font-semibold text-slate-900">{selectedTaskForChat.title}</h2>
                                <div className="w-16" />
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
                            <div className="border-t border-slate-200 bg-white p-4">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={mobileCommentInput}
                                        onChange={(e) => setMobileCommentInput(e.target.value)}
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
                                        placeholder="Escribe un comentario..."
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
            </div>
        );
    }

    // VERSIÓN DESKTOP (original)
    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden selection:bg-blue-100 relative">

            {/* SIDEBAR */}
            <aside className="w-80 bg-slate-100/80 backdrop-blur-xl border-r border-slate-200 flex flex-col p-4 hidden md:flex relative z-30 h-full">

                {/* HEADER: LOGO */}
                <div className="mb-8 flex items-center gap-3 px-2">
                    <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
                        <Layers size={18} className="text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">GENSHIKEN</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">FlowSpace OS</p>
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
                        count={tasks.filter(t => (t.priority === 'high' || t.category === 'Crítico' || t.status === 'overdue') && groups.find(g => g.id === t.groupId)?.type === currentContext).length}
                        active={activeFilter === 'critical'}
                        onClick={() => { setActiveFilter('critical'); setViewMode('list'); }}
                    />
                    <SidebarItem
                        icon={<Eye size={18} />}
                        label="Por Validar"
                        count={tasks.filter(t => t.status === 'waiting_validation' && groups.find(g => g.id === t.groupId)?.type === currentContext).length}
                        active={activeFilter === 'validation'}
                        onClick={() => { setActiveFilter('validation'); setViewMode('list'); }}
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
                            // Debug: verificar filtrado
                            console.log('Filtrando notificaciones:', {
                                currentUserId: currentUser?.id,
                                totalSuggestions: allSuggestions.length,
                                filteredCount: filteredSuggestions.length,
                                suggestionsWithUserId: allSuggestions.filter(s => s.userId).map(s => ({
                                    id: s.id,
                                    type: s.type,
                                    userId: s.userId,
                                    matches: s.userId === currentUser?.id
                                }))
                            });
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

            {/* MAIN CONTENT */}
            {/* MAIN CONTENT */}
            <main className="flex-1 overflow-y-auto relative">
                <div className="max-w-4xl mx-auto p-6 md:p-10">

                    <header className="flex justify-between items-end mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="relative z-30">
                                    <button
                                        onClick={() => setShowViewSelector(!showViewSelector)}
                                        className={`flex items-center gap-2 text-xs font-bold px-2 py-1 rounded-lg uppercase transition-colors ${currentContext === 'work' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                                    >
                                        {viewMode === 'list' ? <List size={12} /> : <Calendar size={12} />}
                                        {viewMode === 'list' ? 'Vista General' : 'Vista Mensual'}
                                        <ChevronDown size={10} />
                                    </button>

                                    {showViewSelector && (
                                        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-100 p-1 z-20 min-w-[140px] animate-in fade-in zoom-in-95">
                                            <button onClick={() => { setViewMode('list'); setShowViewSelector(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-md text-left hover:text-blue-600">
                                                <List size={14} /> Lista
                                            </button>
                                            <button onClick={() => { setViewMode('calendar'); setShowViewSelector(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-md text-left hover:text-blue-600">
                                                <Grid3X3 size={14} /> Calendario
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <span className="text-slate-300">/</span>
                                <span className="text-slate-500 text-xs font-bold uppercase">
                                    {activeGroupId === 'all' ? 'Unificado' : activeGroupObj?.name}
                                </span>
                            </div>
                            <h1 className="text-4xl font-bold text-slate-800 mb-1">Hoy</h1>
                            <p className="text-slate-500 font-medium">Viernes, 21 de Noviembre</p>
                        </div>

                        <div className="flex gap-3">
                            {/* BOTÓN MÉTRICAS (SOLO EN TRABAJO) */}
                            {currentContext === 'work' && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowMetrics(!showMetrics)}
                                        className={`flex items-center justify-center w-10 h-10 rounded-full border shadow-sm transition-all ${showMetrics ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'}`}
                                        title="Métricas y Reportes"
                                    >
                                        <BarChart3 size={20} />
                                    </button>

                                    {showMetrics && (
                                        <div className="absolute top-12 right-0 w-96 max-h-[80vh] bg-white rounded-2xl shadow-xl border border-slate-100 p-5 z-50 animate-in fade-in zoom-in-95 origin-top-right overflow-y-auto custom-scrollbar">
                                            {weeklyReport ? (
                                                <>
                                                    <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b border-slate-100">
                                                        <h3 className="font-bold text-slate-800 text-base">Reporte Semanal</h3>
                                                        <button
                                                            onClick={() => setShowMetrics(false)}
                                                            className="text-slate-400 hover:text-slate-600 transition-colors"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>

                                                    {/* Métricas principales visuales */}
                                                    <div className="mb-4 space-y-3">
                                                        <div>
                                                            <div className="flex justify-between text-xs mb-2 text-slate-600">
                                                                <span className="font-semibold">Tasa de Cumplimiento</span>
                                                                <span className={`font-bold ${weeklyReport.metrics.completionRate >= 85 ? 'text-green-600' : weeklyReport.metrics.completionRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                                                                    {weeklyReport.metrics.completionRate}%
                                                                </span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all ${weeklyReport.metrics.completionRate >= 85 ? 'bg-green-500' :
                                                                        weeklyReport.metrics.completionRate >= 70 ? 'bg-amber-500' :
                                                                            'bg-red-500'
                                                                        }`}
                                                                    style={{ width: `${weeklyReport.metrics.completionRate}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-100">
                                                                <span className="block text-2xl font-bold text-blue-700">{weeklyReport.metrics.completed}</span>
                                                                <span className="text-[10px] text-blue-600 uppercase font-semibold">Completadas</span>
                                                            </div>
                                                            <div className="bg-red-50 p-3 rounded-lg text-center border border-red-100">
                                                                <span className="block text-2xl font-bold text-red-700">{weeklyReport.metrics.overdue}</span>
                                                                <span className="text-[10px] text-red-600 uppercase font-semibold">Atrasadas</span>
                                                            </div>
                                                            <div className="bg-amber-50 p-3 rounded-lg text-center border border-amber-100">
                                                                <span className="block text-2xl font-bold text-amber-700">{weeklyReport.metrics.blocked}</span>
                                                                <span className="text-[10px] text-amber-600 uppercase font-semibold">Bloqueadas</span>
                                                            </div>
                                                            <div className="bg-purple-50 p-3 rounded-lg text-center border border-purple-100">
                                                                <span className="block text-2xl font-bold text-purple-700">{weeklyReport.metrics.validation}</span>
                                                                <span className="text-[10px] text-purple-600 uppercase font-semibold">Por Validar</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Ranking de participantes */}
                                                    {weeklyReport.ranking && weeklyReport.ranking.length > 0 && (
                                                        <div className="mb-4">
                                                            <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1">
                                                                <span>🏆</span> Ranking del Equipo
                                                            </h4>
                                                            <div className="space-y-2">
                                                                {weeklyReport.ranking.map((member, index) => {
                                                                    const memberObj = teamMembers.find(m => m.id === member.memberId);
                                                                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                                                                    const isTop3 = index < 3;
                                                                    const bgColor = index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200' :
                                                                        index === 1 ? 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200' :
                                                                            index === 2 ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200' :
                                                                                'bg-white border-slate-100';
                                                                    return (
                                                                        <div key={member.memberId} className={`${bgColor} border rounded-lg p-2.5 flex items-center justify-between`}>
                                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                <span className="text-sm font-bold text-slate-600 flex-shrink-0">{medal}</span>
                                                                                <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-base shadow-sm border border-slate-200 flex-shrink-0">
                                                                                    {memberObj?.avatar || member.avatar || '👤'}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="text-xs font-bold text-slate-800 truncate">{member.name}</div>
                                                                                    <div className="text-[10px] text-slate-500">
                                                                                        {member.completed} {member.completed === 1 ? 'completada' : 'completadas'}
                                                                                        {member.overdue > 0 && ` • ${member.overdue} ${member.overdue === 1 ? 'atrasada' : 'atrasadas'}`}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                                                {member.completionRate === 100 && (
                                                                                    <span className="text-xs">✨</span>
                                                                                )}
                                                                                <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${member.completionRate === 100 ? 'bg-green-100 text-green-700' :
                                                                                    member.completionRate >= 80 ? 'bg-blue-100 text-blue-700' :
                                                                                        member.completionRate >= 60 ? 'bg-amber-100 text-amber-700' :
                                                                                            'bg-red-100 text-red-700'
                                                                                    }`}>
                                                                                    {member.completionRate}%
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Ranking de Puntuación (Sistema de Puntos) */}
                                                    {(() => {
                                                        const activeGroup = groups.find(g => g.id === activeGroupId);
                                                        if (!activeGroup || !activeGroup.scores || Object.keys(activeGroup.scores).length === 0) return null;

                                                        const scoresArray = Object.entries(activeGroup.scores)
                                                            .map(([userId, score]) => {
                                                                const user = allUsers.find(u => u.id === userId) || teamMembers.find(m => m.id === userId);
                                                                return {
                                                                    userId,
                                                                    name: user?.name || 'Usuario',
                                                                    avatar: user?.avatar || '👤',
                                                                    score: score || 0
                                                                };
                                                            })
                                                            .filter(item => item.score > 0) // Solo mostrar usuarios con puntos
                                                            .sort((a, b) => b.score - a.score); // Ordenar por puntaje descendente

                                                        if (scoresArray.length === 0) return null;

                                                        const maxScore = Math.max(...scoresArray.map(s => s.score));

                                                        return (
                                                            <div className="mb-4 border-t border-slate-200 pt-4">
                                                                <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1">
                                                                    <span>⭐</span> Ranking de Puntuación
                                                                </h4>
                                                                <p className="text-[10px] text-slate-500 mb-3">
                                                                    Puntos basados en prioridad, plazo, atrasos y postergaciones
                                                                </p>
                                                                <div className="space-y-2">
                                                                    {scoresArray.map((member, index) => {
                                                                        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                                                                        const bgColor = index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200' :
                                                                            index === 1 ? 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200' :
                                                                                index === 2 ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200' :
                                                                                    'bg-white border-slate-100';
                                                                        const percentage = maxScore > 0 ? (member.score / maxScore) * 100 : 0;

                                                                        return (
                                                                            <div key={member.userId} className={`${bgColor} border rounded-lg p-2.5`}>
                                                                                <div className="flex items-center justify-between mb-1.5">
                                                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                        <span className="text-sm font-bold text-slate-600 flex-shrink-0">{medal}</span>
                                                                                        <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-base shadow-sm border border-slate-200 flex-shrink-0">
                                                                                            {member.avatar}
                                                                                        </div>
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <div className="text-xs font-bold text-slate-800 truncate">{member.name}</div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                                                        <span className={`text-sm font-bold ${index === 0 ? 'text-yellow-600' :
                                                                                            index === 1 ? 'text-slate-600' :
                                                                                                index === 2 ? 'text-orange-600' :
                                                                                                    'text-slate-700'
                                                                                            }`}>
                                                                                            {member.score.toLocaleString()} pts
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                                    <div
                                                                                        className={`h-full rounded-full transition-all ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                                                                                            index === 1 ? 'bg-gradient-to-r from-slate-400 to-gray-500' :
                                                                                                index === 2 ? 'bg-gradient-to-r from-orange-400 to-amber-500' :
                                                                                                    'bg-blue-500'
                                                                                            }`}
                                                                                        style={{ width: `${percentage}%` }}
                                                                                    ></div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Reporte narrativo corto y amigable */}
                                                    <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
                                                        <div className="text-slate-700 leading-relaxed whitespace-pre-line text-xs">
                                                            {weeklyReport.narrative.split('**').map((part, idx) => {
                                                                if (idx % 2 === 1) {
                                                                    return <strong key={idx} className="font-bold text-slate-900">{part}</strong>;
                                                                }
                                                                return <span key={idx}>{part}</span>;
                                                            })}
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center py-8 text-slate-400">
                                                    <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                                                    <p className="text-xs">No hay datos suficientes para generar el reporte</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <button onClick={handleGenerateSummary} disabled={showSummary || isThinking} className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all shadow-sm ${isThinking ? 'bg-slate-100 text-slate-400 cursor-wait' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'}`}>{isThinking ? <>Analizando...</> : <><BrainCircuit size={16} /> Resumen</>}</button>
                        </div>
                    </header>

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
                            {filteredTasks.length === 0 ? (
                                <div className="text-center py-16 opacity-50">
                                    <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        {currentContext === 'work' ? <Briefcase size={32} className="text-slate-300" /> : <Home size={32} className="text-slate-300" />}
                                    </div>
                                    <p className="text-slate-500 font-medium text-lg">Todo al día en {activeGroupId === 'all' ? (currentContext === 'work' ? 'tu Trabajo' : 'tu Vida Personal') : activeGroupObj?.name}.</p>
                                </div>
                            ) : (
                                <>
                                    {/* VENCIDAS */}
                                    {filteredTasks.filter(t => t.status === 'overdue').length > 0 && (
                                        <section>
                                            <h2 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-2"><AlertTriangle size={14} /> Urgente</h2>
                                            <div className="bg-red-50/50 rounded-2xl border border-red-100 overflow-hidden">
                                                {filteredTasks.filter(t => t.status === 'overdue').map(task => (
                                                    <TaskCard key={task.id} task={task} team={teamMembers} categories={categories} onToggle={() => handleTaskMainAction(task)} onUnblock={() => handleUnblock(task)} isOverdue onAddComment={addComment} onReadComments={markCommentsRead} />
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {/* PENDIENTES (HOY) */}
                                    <section>
                                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Para hoy</h2>
                                        <div className="space-y-2">
                                            {filteredTasks.filter(t => t.status === 'waiting_validation').map(task => (
                                                <TaskCard key={task.id} task={task} team={teamMembers} categories={categories} onToggle={() => handleTaskMainAction(task)} onUnblock={() => handleUnblock(task)} onAddComment={addComment} onReadComments={markCommentsRead} />
                                            ))}
                                            {filteredTasks.filter(t => t.status === 'blocked').map(task => (
                                                <TaskCard key={task.id} task={task} team={teamMembers} categories={categories} onToggle={() => { }} isBlocked onUnblock={() => handleUnblock(task)} onAddComment={addComment} onReadComments={markCommentsRead} />
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
                                                <TaskCard key={task.id} task={task} team={teamMembers} categories={categories} onToggle={() => handleTaskMainAction(task)} onUnblock={() => handleUnblock(task)} onAddComment={addComment} onReadComments={markCommentsRead} />
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
                                                <TaskCard key={task.id} task={task} team={teamMembers} categories={categories} onToggle={() => handleTaskMainAction(task)} onUnblock={() => handleUnblock(task)} onAddComment={addComment} onReadComments={markCommentsRead} />
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
                                                    <TaskCard key={task.id} task={task} team={teamMembers} categories={categories} onToggle={() => handleTaskMainAction(task)} onUnblock={() => handleUnblock(task)} completed onAddComment={addComment} onReadComments={markCommentsRead} />
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
                                            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2"><History size={14} /> Finalizadas</h2>
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
                                                    <TaskCard key={task.id} task={task} team={teamMembers} categories={categories} onToggle={() => handleTaskMainAction(task)} onUnblock={() => handleUnblock(task)} completed onAddComment={addComment} onReadComments={markCommentsRead} />
                                                ))}
                                            </div>
                                        </section>
                                    )}
                                </>
                            )
                            }
                        </div >
                    )}

                    {/* VISTA DE CALENDARIO iOS STYLE (INTERACTIVO & RESPONSIVE) */}
                    {
                        viewMode === 'calendar' && (
                            <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">

                                {/* CALENDARIO GRID (COMPACT) - Estilo iOS Calendar */}
                                <div className="bg-white p-5 z-10 relative">
                                    <div className="flex justify-between items-center mb-5">
                                        <button
                                            onClick={handleCalendarPrevMonth}
                                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                        >
                                            <ChevronLeft size={20} className="text-slate-600" />
                                        </button>
                                        <span className="font-bold text-slate-900 text-xl">{months[calendarMonth]} {calendarYear}</span>
                                        <button
                                            onClick={handleCalendarNextMonth}
                                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                        >
                                            <ChevronRight size={20} className="text-slate-600" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-7 mb-3">
                                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
                                            <div key={d} className="text-center text-xs font-semibold text-slate-500">{d}</div>
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
                                                const dayTasks = getTasksForDay(day, calendarMonth, calendarYear);
                                                const categoryColors = getCategoryColorsForDay(day, calendarMonth, calendarYear);

                                                calendarDays.push(
                                                    <div key={day} className="flex flex-col items-center justify-center py-1 min-h-[3rem]">
                                                        <button
                                                            onClick={() => setCalendarSelectedDate(day)}
                                                            className={`w-10 h-10 rounded-full flex flex-col items-center justify-center transition-all relative group
                                                                ${isSelected ? 'bg-blue-600 text-white font-semibold shadow-md scale-105' : ''}
                                                                ${isToday && !isSelected ? 'bg-blue-100 text-blue-700 font-semibold' : ''}
                                                                ${!isToday && !isSelected ? 'text-slate-700 hover:bg-slate-100' : ''}
                                                            `}
                                                        >
                                                            <span className={`text-sm leading-none ${isSelected ? 'text-white' : ''}`}>{day}</span>

                                                            {/* Puntos de colores múltiples estilo iOS Calendar */}
                                                            {categoryColors.length > 0 && (
                                                                <div className={`flex items-center justify-center gap-0.5 mt-0.5 ${isSelected ? 'opacity-80' : ''}`}>
                                                                    {categoryColors.slice(0, 3).map((color, idx) => (
                                                                        <div
                                                                            key={idx}
                                                                            className={`w-1.5 h-1.5 rounded-full ${color} ${isSelected ? 'bg-white opacity-90' : isToday ? 'opacity-90' : 'opacity-70'}`}
                                                                        />
                                                                    ))}
                                                                    {categoryColors.length > 3 && (
                                                                        <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white opacity-90' : 'bg-slate-400 opacity-70'}`} />
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

                                    {/* DIVIDER HANDLE (Visual) */}
                                    <div className="flex justify-center mt-4">
                                        <div className="w-12 h-1 bg-slate-200 rounded-full"></div>
                                    </div>
                                </div>

                                {/* DETALLE DEL DÍA (EXPANDED BELOW) - Estilo iOS Calendar */}
                                <div className="flex-1 bg-gradient-to-b from-slate-50 to-white p-5 overflow-y-auto border-t border-slate-200 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                                    <div className="sticky top-0 bg-gradient-to-b from-slate-50 to-transparent pb-3 z-10 border-b border-slate-200 mb-4">
                                        <h3 className="text-base font-bold text-slate-800 mb-1">
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
                                        <p className="text-xs text-slate-500 font-medium">
                                            {(() => {
                                                const selectedDate = new Date(calendarYear, calendarMonth, calendarSelectedDate);
                                                const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                                                return dayNames[selectedDate.getDay()];
                                            })()}
                                        </p>
                                    </div>
                                    <div className="space-y-2.5 pb-20">
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
                                                    <div className="text-center text-slate-400 py-16 flex flex-col items-center">
                                                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                                            <Calendar size={24} className="text-slate-300" />
                                                        </div>
                                                        <span className="text-sm font-medium">Nada programado para este día</span>
                                                    </div>
                                                );
                                            }

                                            return sortedTasks.map(task => {
                                                const category = categories.find(c => c.name === task.category);
                                                const categoryColor = category?.dot || 'bg-slate-400';

                                                return (
                                                    <div key={task.id} className="group">
                                                        <TaskCard
                                                            task={task}
                                                            team={teamMembers}
                                                            categories={categories}
                                                            onToggle={() => handleTaskMainAction(task)}
                                                            onUnblock={() => handleUnblock(task)}
                                                            onAddComment={addComment}
                                                            onReadComments={markCommentsRead}
                                                        />
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </div>
            </main>

            {/* MODAL GRUPOS */}
            {
                showGroupModal && (
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
                        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    {groupModalTab === 'invite' && <UserPlus size={20} />}
                                    {groupModalTab === 'join' && <LogIn size={20} />}
                                    {groupModalTab === 'create' && <Plus size={20} />}
                                    {groupModalTab === 'invite' ? 'Invitar a Equipo' : groupModalTab === 'join' ? 'Unirse a Equipo' : 'Nuevo Equipo'}
                                </h2>
                                <button onClick={() => setShowGroupModal(false)}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
                            </div>

                            <div className="flex border-b border-slate-100">
                                <button onClick={() => { setGroupModalTab('invite'); setNewGroupName(''); }} className={`flex-1 py-3 text-sm font-bold ${groupModalTab === 'invite' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Invitar</button>
                                <button onClick={() => { setGroupModalTab('join'); setNewGroupName(''); }} className={`flex-1 py-3 text-sm font-bold ${groupModalTab === 'join' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Unirse</button>
                                <button onClick={() => { setGroupModalTab('create'); setNewGroupName(''); }} className={`flex-1 py-3 text-sm font-bold ${groupModalTab === 'create' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Crear</button>
                            </div>

                            <div className="p-6 overflow-y-auto bg-white flex-1 text-center">
                                {groupModalTab === 'invite' && (
                                    <div className="space-y-6">
                                        <div className="text-left">
                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">¿A qué espacio invitas?</label>
                                            <div className="relative">
                                                <select value={inviteSelectedGroup} onChange={(e) => setInviteSelectedGroup(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-3 font-medium outline-none focus:border-blue-500 appearance-none">
                                                    {currentGroups.map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}
                                                </select>
                                                <ChevronDown size={16} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1 pl-1">Mostrando solo grupos de {currentContext === 'work' ? 'Trabajo' : 'Personal'}.</p>
                                        </div>
                                        <div className="bg-white p-4 border-2 border-slate-100 rounded-2xl inline-block shadow-sm">
                                            <QRCodeDisplay code={getInviteGroupInfo().code || '---'} />
                                        </div>
                                        <div className="bg-slate-100 rounded-xl p-3 flex items-center justify-between">
                                            <div className="text-left"><span className="text-[10px] text-slate-500 font-bold uppercase block">Código</span><span className="font-mono text-xl font-bold text-slate-800 tracking-widest">{getInviteGroupInfo().code || '---'}</span></div>
                                            <button className="p-2 bg-white rounded-lg shadow-sm hover:text-blue-600 active:scale-95 transition-all"><Copy size={20} /></button>
                                        </div>
                                        <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2"><Share2 size={18} /> Compartir Enlace</button>
                                    </div>
                                )}
                                {groupModalTab === 'join' && (
                                    <div className="space-y-6 py-4">
                                        <div className="space-y-3">
                                            <button className="w-full py-4 border-2 border-blue-100 bg-blue-50 text-blue-700 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 hover:bg-blue-100 hover:border-blue-200 transition-all"><ScanLine size={32} /> Escanear Código QR</button>
                                            <div className="relative flex items-center justify-center"><div className="border-t border-slate-200 w-full absolute"></div><span className="bg-white px-2 text-xs text-slate-400 font-medium relative z-10">O ingresa el código</span></div>
                                            <input type="text" value={joinCodeInput} onChange={(e) => setJoinCodeInput(e.target.value)} placeholder="Ej: LAB-9921" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-center font-mono text-lg tracking-widest uppercase focus:border-blue-500 outline-none" />
                                        </div>
                                        <button
                                            onClick={handleJoinGroup}
                                            disabled={!joinCodeInput.trim()}
                                            className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            Unirse al Equipo
                                        </button>
                                    </div>
                                )}
                                {groupModalTab === 'create' && (
                                    <div className="space-y-4 py-4">
                                        <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-2"><Plus size={40} className="text-blue-500" /></div>
                                        <h3 className="font-bold text-lg text-slate-700">Crear nuevo espacio</h3>
                                        <input
                                            type="text"
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                            placeholder="Nombre del espacio"
                                            className="w-full border border-slate-200 rounded-xl p-3 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleCreateGroup();
                                                }
                                            }}
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleCreateGroup}
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
                )
            }

            {/* MODAL CONFIRMAR ELIMINAR CUENTA */}
            {
                showDeleteAccountConfirm && (
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
                        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <X size={20} className="text-red-600" />
                                    Eliminar Cuenta
                                </h2>
                                <button onClick={() => setShowDeleteAccountConfirm(false)}>
                                    <X size={24} className="text-slate-400 hover:text-slate-600" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <X size={32} className="text-red-600" />
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-800 mb-2">¿Eliminar tu cuenta permanentemente?</h3>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Esta acción no se puede deshacer. Se eliminarán todos tus datos, grupos creados, tareas y puntuaciones.
                                    </p>
                                    <p className="text-xs text-red-600 font-medium">
                                        ⚠️ Esta acción es irreversible
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => setShowDeleteAccountConfirm(false)}
                                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleDeleteAccount();
                                            setShowDeleteAccountConfirm(false);
                                        }}
                                        className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                                    >
                                        Eliminar Cuenta
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* MODAL CONFIRMAR DEJAR GRUPO */}
            {
                showLeaveGroupConfirm && groupToLeave && (
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
                        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <UserMinus size={20} className="text-amber-600" />
                                    Dejar Espacio
                                </h2>
                                <button onClick={() => { setShowLeaveGroupConfirm(false); setGroupToLeave(null); }}>
                                    <X size={24} className="text-slate-400 hover:text-slate-600" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <UserMinus size={32} className="text-amber-600" />
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-800 mb-2">¿Dejar "{groupToLeave.name}"?</h3>
                                    <p className="text-sm text-slate-600">
                                        Los demás miembros del espacio serán notificados. Podrás volver a unirte más tarde si tienes el código.
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => { setShowLeaveGroupConfirm(false); setGroupToLeave(null); }}
                                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmLeaveGroup}
                                        className="flex-1 px-4 py-3 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20"
                                    >
                                        Dejar Espacio
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* MODALES ANTERIORES (SETTINGS, QR, ENDDAY) */}
            {
                showSettings && (
                    <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
                        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Settings size={20} /> Configuración</h2>
                                <button onClick={() => setShowSettings(false)}><X size={24} className="text-slate-400" /></button>
                            </div>
                            <div className="p-6 space-y-6">
                                {/* Selector de Avatar */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Avatar de Perfil</h3>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="relative group">
                                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center border-2 border-slate-200">
                                                <span style={{ fontSize: '3rem', lineHeight: '1', fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>
                                                    {currentUser?.avatar || '👤'}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                                                className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors border-2 border-white"
                                                title="Editar avatar"
                                            >
                                                <Pencil size={12} className="text-white" />
                                            </button>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-700">{currentUser?.name || currentUser?.username || 'Usuario'}</p>
                                            <p className="text-xs text-slate-500">Toca el lápiz para cambiar tu avatar</p>
                                        </div>
                                    </div>
                                    {showAvatarSelector && (
                                        <div className="mt-4 animate-in slide-in-from-top-2 duration-200">
                                            <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                                                {['👤', '👨', '👩', '🧑', '👨‍💼', '👩‍💼', '👨‍🔬', '👩‍🔬', '👨‍💻', '👩‍💻', '👨‍🎨', '👩‍🎨', '👨‍🏫', '👩‍🏫', '👨‍⚕️', '👩‍⚕️', '👨‍🚀', '👩‍🚀', '👨‍✈️', '👩‍✈️', '👨‍🎓', '👩‍🎓', '👨‍🏭', '👩‍🏭', '🧑‍🌾', '🧑‍🍳', '🧑‍🎤', '🧑‍🎨', '🧑‍🏫', '🧑‍💼', '🧑‍🔬', '🧑‍💻', '🧑‍🎓', '🧑‍🏭', '🧑‍🚀', '🧑‍⚕️', '🤴', '👸', '🦸', '🦸‍♂️', '🦸‍♀️', '🧙', '🧙‍♂️', '🧙‍♀️', '🧚', '🧚‍♂️', '🧚‍♀️', '🧛', '🧛‍♂️', '🧛‍♀️', '🧜', '🧜‍♂️', '🧜‍♀️', '🧝', '🧝‍♂️', '🧝‍♀️', '🧞', '🧞‍♂️', '🧞‍♀️', '🧟', '🧟‍♂️', '🧟‍♀️', '🤵', '🤵‍♂️', '🤵‍♀️', '👰', '👰‍♂️', '👰‍♀️', '🤰', '🤱', '👼', '🎅', '🤶', '🦹', '🦹‍♂️', '🦹‍♀️', '🧑‍🎄', '👮', '👮‍♂️', '👮‍♀️', '🕵️', '🕵️‍♂️', '🕵️‍♀️', '💂', '💂‍♂️', '💂‍♀️', '👷', '👷‍♂️', '👷‍♀️', '👳', '👳‍♂️', '👳‍♀️', '👲', '🧕'].map((emoji) => {
                                                    // Función para obtener el emoji base (sin tono de piel) para comparación
                                                    const getBaseEmoji = (e) => {
                                                        return e.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '');
                                                    };
                                                    
                                                    const baseEmoji = getBaseEmoji(emoji);
                                                    const currentAvatarBase = currentUser?.avatar ? getBaseEmoji(currentUser.avatar) : null;
                                                    
                                                    return (
                                                        <button
                                                            key={emoji}
                                                            onClick={async () => {
                                                                try {
                                                                    const result = await apiAuth.updateProfile(baseEmoji);
                                                                    if (result.success && result.user) {
                                                                        if (onUserUpdate) {
                                                                            onUserUpdate(result.user);
                                                                        }
                                                                        setShowAvatarSelector(false);
                                                                    }
                                                                } catch (error) {
                                                                    console.error('Error actualizando avatar:', error);
                                                                }
                                                            }}
                                                            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${
                                                                currentAvatarBase === baseEmoji
                                                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                                                                    : 'bg-white hover:bg-slate-100 border border-slate-200'
                                                            }`}
                                                            title={baseEmoji}
                                                        >
                                                            <EmojiButton emoji={baseEmoji} size={20} />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-slate-200 pt-6">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Notificaciones Inteligentes</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-700">Alertas de Vencimiento</span><button onClick={() => setUserConfig({ ...userConfig, notifyDeadline: !userConfig.notifyDeadline })} className={`w-10 h-6 rounded-full p-1 transition-colors ${userConfig.notifyDeadline ? 'bg-green-500' : 'bg-slate-200'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${userConfig.notifyDeadline ? 'translate-x-4' : ''}`} /></button></div>
                                        <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-700">Solicitudes de Validación</span><button onClick={() => setUserConfig({ ...userConfig, notifyValidation: !userConfig.notifyValidation })} className={`w-10 h-6 rounded-full p-1 transition-colors ${userConfig.notifyValidation ? 'bg-green-500' : 'bg-slate-200'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${userConfig.notifyValidation ? 'translate-x-4' : ''}`} /></button></div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-200 pt-6">
                                    <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-3">Zona de Peligro</h3>
                                    <button
                                        onClick={() => setShowDeleteAccountConfirm(true)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg font-medium transition-colors"
                                    >
                                        <X size={18} />
                                        Eliminar Cuenta
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end"><button onClick={() => setShowSettings(false)} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-900">Guardar</button></div>
                        </div>
                    </div>
                )
            }

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
                    <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center">
                        <p className="text-white mt-8 font-medium">Escaneando...</p>
                        <button onClick={() => { setShowQRScanner(false); setShowEquipmentDetail(true); }} className="mt-4 text-white/50 underline">Simular Escaneo</button>
                    </div>
                )
            }

            {
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
            }

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
                                                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-200 hover:scale-110 relative z-0 ${
                                                        isSelected 
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
                                            className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                                                restoreDue === 'Hoy' 
                                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95'
                                            }`}
                                        >
                                            Hoy
                                        </button>
                                        <button
                                            onClick={() => setRestoreDue('Mañana')}
                                            className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                                                restoreDue === 'Mañana' 
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
                                            className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                                                restoreDue !== 'Hoy' && restoreDue !== 'Mañana' 
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
            </div>
            );
};

            export default FlowSpace;
