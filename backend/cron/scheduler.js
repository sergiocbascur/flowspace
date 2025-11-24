import { pool } from '../db/connection.js';
import { sendPushNotification } from '../utils/notificationService.js';

export function startScheduler() {
    console.log('⏰ Iniciando planificador de notificaciones...');

    // Ejecutar cada minuto
    setInterval(async () => {
        try {
            await checkUpcomingTasks();
        } catch (error) {
            console.error('❌ Error en el planificador:', error);
        }
    }, 60 * 1000);
}

async function checkUpcomingTasks() {
    const client = await pool.connect();
    try {
        // Obtener tareas pendientes que no han sido notificadas
        const result = await client.query(`
            SELECT t.*, u.username as creator_name 
            FROM tasks t
            JOIN users u ON t.creator_id = u.id
            WHERE t.status = 'pending' 
            AND t.notification_sent = false
            AND t.due IS NOT NULL
        `);

        const tasks = result.rows;
        const now = new Date();

        for (const task of tasks) {
            if (!task.due) continue;

            // Construir fecha de vencimiento
            let dueDateStr = task.due;
            if (dueDateStr === 'Hoy') {
                dueDateStr = now.toISOString().split('T')[0];
            } else if (dueDateStr === 'Mañana') {
                const tmr = new Date();
                tmr.setDate(tmr.getDate() + 1);
                dueDateStr = tmr.toISOString().split('T')[0];
            }

            // Si tiene hora, agregarla
            let dueDateTime;
            if (task.time) {
                dueDateTime = new Date(`${dueDateStr}T${task.time}`);
            } else {
                // Si no tiene hora, asumimos final del día (o inicio, según preferencia)
                // Para notificaciones, mejor asumir una hora default, ej: 9:00 AM si es "Hoy"
                dueDateTime = new Date(`${dueDateStr}T09:00:00`);
            }

            // Calcular tiempo de notificación según prioridad
            let notifyTime = new Date(dueDateTime);

            switch (task.priority) {
                case 'high':
                    // Avisar 2 horas antes
                    notifyTime.setHours(notifyTime.getHours() - 2);
                    break;
                case 'medium':
                    // Avisar 1 hora antes
                    notifyTime.setHours(notifyTime.getHours() - 1);
                    break;
                case 'low':
                    // Avisar a la hora exacta (o 15 min antes)
                    notifyTime.setMinutes(notifyTime.getMinutes() - 15);
                    break;
                default:
                    notifyTime.setHours(notifyTime.getHours() - 1);
            }

            // Si ya pasó la hora de notificar
            if (now >= notifyTime) {
                await sendTaskNotification(task);

                // Marcar como notificada
                await client.query('UPDATE tasks SET notification_sent = true WHERE id = $1', [task.id]);
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
        body: `${urgencyText[task.priority || 'medium']} - Vence: ${task.time || 'Hoy'}`,
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
