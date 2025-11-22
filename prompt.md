Rol



Actúa como un Ingeniero de Software Senior experto en Producto y UX/UI, especializado en crear aplicaciones web modernas con estética "Apple-like" (iOS/macOS).



Proyecto: LabSync



Vas a construir una aplicación web progresiva (PWA) de gestión operativa y personal llamada LabSync.

Objetivo: Ser el "Segundo Cerebro" para equipos operativos (ej: laboratorios) y la vida personal del usuario.

Filosofía de Diseño: Minimalismo absoluto, inspirado fuertemente en Apple Reminders y Apple Calendar. Uso extensivo de espacios en blanco, tipografía limpia, sombras suaves, bordes redondeados y efectos de desenfoque (backdrop-blur).



Tech Stack Requerido



Framework: Next.js 14+ (App Router) con TypeScript.



Estilos: Tailwind CSS (Mandatorio) + clsx / tailwind-merge.



Iconos: Lucide React.



Estado Global: Zustand (para manejo de UI como modales y sidebar).



Backend/DB: Supabase (PostgreSQL + Auth) o Convex.



Animaciones: Framer Motion (para transiciones suaves, acordeones y modales).



Fechas: date-fns.



Arquitectura de Navegación y Layout



La app se divide en una Sidebar Lateral Inteligente y un Área Principal.



1\. Sidebar (La Torre de Control)



Persistente en desktop, Drawer en móvil.



Header: Selector de Contexto (Tabs grandes): \[ TRABAJO 💼 ] vs \[ PERSONAL 🏠 ].



Buscador Global: Estilo spotlight (Cmd+K).



Filtros Estáticos: Hoy, Programado, Críticos (Rojo), Por Validar (Ojo - Filtra tareas donde status === 'waiting\_validation').



Lista de Espacios (Acordeón):



Lista los grupos según el contexto activo.



Botón + para abrir el Gestor de Grupos (Crear/Unirse/Invitar).



Estado colapsable para ahorrar espacio visual.



Módulo de Inteligencia (Bottom Corner):



Muestra sugerencias contextuales (Emails parseados, Alertas de equipos, Avisos de postergación).



UI: Expandible hacia arriba. Si está colapsado y hay alertas nuevas, muestra un indicador (punto rojo).



Footer de Utilidad: Botones para "Escanear QR", "Ajustes" y el botón crítico "Cierre de Jornada" (End Day).



2\. Área Principal (El Tablero)



Header Dinámico: Muestra la fecha y breadcrumbs del grupo activo.



Selector de Vista: Dropdown para alternar entre Lista y Calendario Mensual.



Botón de Métricas: (Solo visible en contexto Trabajo). Abre un popover con gráficos simples (Completadas vs Atrasadas).



Funcionalidades Core (Lógica de Negocio)



1\. Smart Task Input (Barra de Comando)



Al escribir una tarea, aparece una barra de herramientas inferior (solo al tener foco):



Asignación Múltiple: Avatares de miembros del grupo actual.



Detección NLP: Regex para extraer fecha/hora del texto ("mañana a las 10").



Etiquetas Inteligentes: Sugerir etiquetas basadas en keywords (ej: "validar" -> Etiqueta: Crítico).



Prioridad: Selector simple (Baja, Media, Alta).



2\. Tarjetas de Tareas (Task Cards)



Diseño limpio tipo iOS Reminders.



Estados de Tarea:



pending: Estado normal.



blocked: Icono candado rojo. Requiere sub-tarea de desbloqueo (Razón).



waiting\_validation: Icono Ojo ámbar. (Lógica Maker-Checker: Si el asignado != creador, requiere validación para cerrarse).



completed: Check verde.



overdue: Resaltado sutil rojo si due\_date < now.



Comentarios: Sistema de chat colapsable por tarea. Indicador visual si hay mensajes no leídos.



3\. Calendario Estilo iOS



Vista Mensual: Cuadrícula limpia con "puntos" de colores por categoría.



Interacción: Al hacer clic en un día, la lista de tareas de ese día se renderiza debajo del calendario (o al lado en pantallas grandes), aprovechando todo el espacio vertical. No usar modales pequeños para esto.



4\. Flujo "Cierre de Jornada" (The End Day)



Modal inmersivo que recorre las tareas pendientes del día.



Acción Snooze: Mover a mañana. Si se hace >2 veces, incrementa un contador postpone\_count.



Acción Bloqueo: Solicita razón obligatoria.



Inteligencia: Si postpone\_count >= 3, el sistema genera una "Alerta de Sistema" en el módulo de inteligencia sugiriendo una reunión.



5\. Módulo de Equipos (QR)



URL dinámica /equipment/\[id].



Muestra estado (Operativo/Mantención) y Bitácora de eventos.



Log Automático: Al cambiar estado o agregar nota, se guarda quién y cuándo.



Modelo de Datos Sugerido (Mental Model)



Para garantizar la seguridad y separación de contextos:



Profiles: id, email, avatar\_url, full\_name.



Groups: id, name, type (work/personal), join\_code.



GroupMembers: group\_id, user\_id, role (admin/member).



Tasks:



id, title, group\_id, creator\_id



status (enum: pending, completed, blocked, waiting\_validation)



priority, due\_date, postpone\_count



block\_reason (text)



TaskAssignees: task\_id, user\_id.



TaskComments: id, task\_id, user\_id, content, created\_at.



Equipment: id, group\_id, name, status, next\_maintenance.



EquipmentLogs: id, equipment\_id, user\_id, action, created\_at.



Instrucciones de Inicio



Genera la estructura de carpetas para Next.js.



Configura Tailwind con los colores: Slate (Base), Blue/Indigo (Trabajo), Emerald (Personal), Red/Amber (Alertas).



Crea el Layout Principal con la Sidebar adaptable y el contexto de navegación.

