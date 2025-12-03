import { pool } from '../db/connection.js';
import { sendPushNotification } from '../utils/notificationService.js';
import { runChallengeTasks } from './challengeScheduler.js';

export function startScheduler() {
    console.log('⏰ Iniciando planificador de notificaciones...');

    // Ejecutar cada minuto - verificar tareas pendientes
    setInterval(async () => {
        try {
            await checkUpcomingTasks();
        } catch (error) {
            console.error('❌ Error en el planificador:', error);
        }
    }, 60 * 1000);

    // Ejecutar cada hora - gestionar desafíos (crear nuevos, actualizar progreso)
    setInterval(async () => {
        try {
            await runChallengeTasks();
        } catch (error) {
            console.error('❌ Error en scheduler de desafíos:', error);
        }
    }, 60 * 60 * 1000);

    // Ejecutar inmediatamente al iniciar para crear desafíos si no existen
    runChallengeTasks().catch(error => {
        console.error('❌ Error inicializando desafíos:', error);
    });
}

async function checkUpcomingTasks() {
    const client = await pool.connect();
    try {
        // Obtener tareas pendientes con fecha de vencimiento
        const result = await client.query(`
            SELECT t.*, u.username as creator_name 
            FROM tasks t
            JOIN users u ON t.creator_id = u.id
            WHERE t.status = 'pending' 
            AND t.due IS NOT NULL
        `);

        const tasks = result.rows;
        const now = new Date();

        for (const task of tasks) {
            if (!task.due) continue;

            // Construir fecha de vencimiento (dueDateTime)
            let dueDateStr = task.due;
            if (dueDateStr === 'Hoy') {
                dueDateStr = now.toISOString().split('T')[0];
            } else if (dueDateStr === 'Mañana') {
                const tmr = new Date();
                tmr.setDate(tmr.getDate() + 1);
                dueDateStr = tmr.toISOString().split('T')[0];
            }

            let dueDateTime;
            if (task.time) {
                dueDateTime = new Date(`${dueDateStr}T${task.time}`);
            } else {
                // Si no tiene hora, asumimos 9:00 AM
                dueDateTime = new Date(`${dueDateStr}T09:00:00`);
            }

            // Lógica de Notificación según Urgencia
            let shouldNotify = false;
            const lastNotified = task.last_notification_at ? new Date(task.last_notification_at) : null;

            // Diferencia en milisegundos
            const timeDiff = dueDateTime.getTime() - now.getTime();
            const daysDiff = timeDiff / (1000 * 3600 * 24);

            // Helpers de tiempo
            const oneDayMs = 24 * 60 * 60 * 1000;
            const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
            const timeSinceLastNotification = lastNotified ? (now.getTime() - lastNotified.getTime()) : Infinity;

            switch (task.priority) {
                case 'low':
                    // BAJA: Avisar el mismo día (si ya es la fecha o pasó)
                    // Solo una vez
                    if (daysDiff <= 1 && !lastNotified) {
                        shouldNotify = true;
                    }
                    break;

                case 'medium':
                    // MEDIA: Avisar 1 semana antes, y desde ahí cada día
                    if (daysDiff <= 7) {
                        // Si nunca se ha notificado O pasó más de 1 día desde la última vez
                        if (!lastNotified || timeSinceLastNotification >= oneDayMs) {
                            shouldNotify = true;
                        }
                    }
                    break;

                case 'high':
                    // ALTA: Avisar 1 mes antes (aprox 30 días)
                    if (daysDiff <= 30) {
                        if (daysDiff <= 7) {
                            // Última semana: Cada día
                            if (!lastNotified || timeSinceLastNotification >= oneDayMs) {
                                shouldNotify = true;
                            }
                        } else {
                            // Entre 1 mes y 1 semana: Una vez a la semana
                            if (!lastNotified || timeSinceLastNotification >= oneWeekMs) {
                                shouldNotify = true;
                            }
                        }
                    }
                    break;
            }

            if (shouldNotify) {
                await sendTaskNotification(task);

                // Actualizar timestamp de última notificación
                await client.query('UPDATE tasks SET last_notification_at = NOW() WHERE id = $1', [task.id]);
            }
        }
    } catch (error) {
        console.error('Error chequeando tareas:', error);
    } finally {
        client.release();
    }
}

async function sendTaskNotification(task) {
    // Parsear asignados
    let assignees = [];
    if (typeof task.assignees === 'string') {
        try {
            assignees = JSON.parse(task.assignees);
        } catch (e) {
            assignees = [];
        }
    } else if (Array.isArray(task.assignees)) {
        assignees = task.assignees;
    }

    if (!assignees.length) return;

    const urgencyText = {
        'high': '🔴 Alta Urgencia',
        'medium': '🟡 Urgencia Normal',
        'low': '🟢 Baja Urgencia'
    };

    const notification = {
        title: `Recordatorio: ${task.title}`,
        body: `${urgencyText[task.priority || 'medium']} - Vence: ${task.due} ${task.time || ''}`,
        data: {
            type: 'task_reminder',
            taskId: task.id,
            groupId: task.group_id,
            priority: task.priority
        }
    };

    // Enviar a todos los asignados
    for (const userId of assignees) {
        await sendPushNotification(userId, notification);
    }
}
