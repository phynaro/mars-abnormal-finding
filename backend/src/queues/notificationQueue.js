/**
 * BullMQ notification queue (producer).
 * Backend enqueues notification jobs here; a separate worker process consumes them.
 */

const { Queue } = require('bullmq');

const QUEUE_NAME = 'notifications';
const JOB_NAME_CREATE_TICKET = 'create-ticket';
const JOB_NAME_ACCEPT_TICKET = 'accept-ticket';
const JOB_NAME_PLAN_TICKET = 'plan-ticket';
const JOB_NAME_START_TICKET = 'start-ticket';
const JOB_NAME_FINISH_TICKET = 'finish-ticket';
const JOB_NAME_REJECT_TICKET = 'reject-ticket';
const JOB_NAME_ESCALATE_TICKET = 'escalate-ticket';
const JOB_NAME_REVIEWED_TICKET = 'reviewed-ticket';
const JOB_NAME_CLOSE_TICKET = 'close-ticket';
const JOB_NAME_REASSIGN_TICKET = 'reassign-ticket';
const JOB_NAME_REOPEN_TICKET = 'reopen-ticket';
const JOB_NAME_STATUS_UPDATE_TICKET = 'status-update-ticket';
const JOB_NAME_ASSIGNMENT_TICKET = 'assignment-ticket';
const JOB_NAME_SCHEDULE_PENDING_TICKETS = 'schedule-pending-tickets';
const JOB_NAME_SCHEDULE_DUE_DATE = 'schedule-due-date';
const JOB_NAME_SCHEDULE_OLD_OPEN_TICKETS = 'schedule-old-open-tickets';

let queue = null;
let connectionFailed = false;

function getConnection() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  return { url };
}

function getQueue() {
  if (queue) return queue;
  if (connectionFailed) return null;
  try {
    const connection = getConnection();
    queue = new Queue(QUEUE_NAME, {
      connection: connection.url ? { url: connection.url } : { host: 'localhost', port: 6379 },
    });
    return queue;
  } catch (err) {
    connectionFailed = true;
    console.warn('Notification queue: Redis connection failed, notifications will be skipped:', err.message);
    return null;
  }
}

/**
 * Add a create-ticket notification job. Payload must be serializable (no functions/circular refs).
 * @param {Object} payload - { ticketData, reporterName, emailRecipients, lineRecipients, linePayload }
 * @returns {Promise<string|null>} - Job id if enqueued, null if queue unavailable or enqueue failed
 */
async function addCreateTicketNotificationJob(payload) {
  const q = getQueue();
  if (!q) return null;
  try {
    const job = await q.add(JOB_NAME_CREATE_TICKET, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 1000 },
    });
    console.log(`📬 Enqueued notification job ${job.id} (create-ticket) for ticket ${payload?.ticketData?.ticket_number || '?'}`);
    return job.id;
  } catch (err) {
    console.error('Failed to enqueue create-ticket notification:', err.message);
    return null;
  }
}

/**
 * Add an accept-ticket notification job.
 * @param {Object} payload - { ticketData, acceptorName, emailRecipients, lineRecipients, linePayload }
 * @returns {Promise<string|null>} - Job id if enqueued, null otherwise
 */
async function addAcceptTicketNotificationJob(payload) {
  const q = getQueue();
  if (!q) return null;
  try {
    const job = await q.add(JOB_NAME_ACCEPT_TICKET, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 1000 },
    });
    console.log(`📬 Enqueued notification job ${job.id} (accept-ticket) for ticket ${payload?.ticketData?.ticket_number || '?'}`);
    return job.id;
  } catch (err) {
    console.error('Failed to enqueue accept-ticket notification:', err.message);
    return null;
  }
}

/**
 * Add a plan-ticket notification job.
 * @param {Object} payload - { ticketData, plannerName, emailRecipients, lineRecipients, linePayload }
 * @returns {Promise<string|null>} - Job id if enqueued, null otherwise
 */
async function addPlanTicketNotificationJob(payload) {
  const q = getQueue();
  if (!q) return null;
  try {
    const job = await q.add(JOB_NAME_PLAN_TICKET, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 1000 },
    });
    console.log(`📬 Enqueued notification job ${job.id} (plan-ticket) for ticket ${payload?.ticketData?.ticket_number || '?'}`);
    return job.id;
  } catch (err) {
    console.error('Failed to enqueue plan-ticket notification:', err.message);
    return null;
  }
}

/**
 * Add a start-ticket notification job.
 * @param {Object} payload - { ticketData, starterName, emailRecipients, lineRecipients, linePayload }
 * @returns {Promise<string|null>} - Job id if enqueued, null otherwise
 */
async function addStartTicketNotificationJob(payload) {
  const q = getQueue();
  if (!q) return null;
  try {
    const job = await q.add(JOB_NAME_START_TICKET, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 1000 },
    });
    console.log(`📬 Enqueued notification job ${job.id} (start-ticket) for ticket ${payload?.ticketData?.ticket_number || '?'}`);
    return job.id;
  } catch (err) {
    console.error('Failed to enqueue start-ticket notification:', err.message);
    return null;
  }
}

/**
 * Add a finish-ticket (job completion) notification job.
 * @param {Object} payload - { ticketData, finishrName, completion_notes, downtime_avoidance_hours, cost_avoidance, emailRecipients, lineRecipients, linePayload }
 * @returns {Promise<string|null>} - Job id if enqueued, null otherwise
 */
async function addFinishTicketNotificationJob(payload) {
  const q = getQueue();
  if (!q) return null;
  try {
    const job = await q.add(JOB_NAME_FINISH_TICKET, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 1000 },
    });
    console.log(`📬 Enqueued notification job ${job.id} (finish-ticket) for ticket ${payload?.ticketData?.ticket_number || '?'}`);
    return job.id;
  } catch (err) {
    console.error('Failed to enqueue finish-ticket notification:', err.message);
    return null;
  }
}

async function addNotificationJob(jobName, payload, logLabel) {
  const q = getQueue();
  if (!q) return null;
  try {
    const job = await q.add(jobName, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 1000 },
    });
    console.log(`📬 Enqueued notification job ${job.id} (${logLabel}) for ticket ${payload?.ticketData?.ticket_number || payload?.ticket_number || '?'}`);
    return job.id;
  } catch (err) {
    console.error(`Failed to enqueue ${logLabel} notification:`, err.message);
    return null;
  }
}

async function addRejectTicketNotificationJob(payload) {
  return addNotificationJob(JOB_NAME_REJECT_TICKET, payload, 'reject-ticket');
}
async function addEscalateTicketNotificationJob(payload) {
  return addNotificationJob(JOB_NAME_ESCALATE_TICKET, payload, 'escalate-ticket');
}
async function addReviewedTicketNotificationJob(payload) {
  return addNotificationJob(JOB_NAME_REVIEWED_TICKET, payload, 'reviewed-ticket');
}
async function addCloseTicketNotificationJob(payload) {
  return addNotificationJob(JOB_NAME_CLOSE_TICKET, payload, 'close-ticket');
}
async function addReassignTicketNotificationJob(payload) {
  return addNotificationJob(JOB_NAME_REASSIGN_TICKET, payload, 'reassign-ticket');
}
async function addReopenTicketNotificationJob(payload) {
  return addNotificationJob(JOB_NAME_REOPEN_TICKET, payload, 'reopen-ticket');
}
async function addStatusUpdateTicketNotificationJob(payload) {
  return addNotificationJob(JOB_NAME_STATUS_UPDATE_TICKET, payload, 'status-update-ticket');
}
async function addAssignmentTicketNotificationJob(payload) {
  return addNotificationJob(JOB_NAME_ASSIGNMENT_TICKET, payload, 'assignment-ticket');
}

async function addSchedulePendingTicketsJob(payload) {
  const q = getQueue();
  if (!q) return null;
  try {
    const job = await q.add(JOB_NAME_SCHEDULE_PENDING_TICKETS, payload || { notification_type: 'pending_tickets' }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 1000 },
    });
    console.log(`📬 Enqueued schedule job ${job.id} (schedule-pending-tickets)`);
    return job.id;
  } catch (err) {
    console.error('Failed to enqueue schedule-pending-tickets:', err.message);
    return null;
  }
}
async function addScheduleDueDateJob(payload) {
  const q = getQueue();
  if (!q) return null;
  try {
    const job = await q.add(JOB_NAME_SCHEDULE_DUE_DATE, payload || { notification_type: 'due_date_reminder' }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 1000 },
    });
    console.log(`📬 Enqueued schedule job ${job.id} (schedule-due-date)`);
    return job.id;
  } catch (err) {
    console.error('Failed to enqueue schedule-due-date:', err.message);
    return null;
  }
}
async function addScheduleOldOpenTicketsJob(payload) {
  const q = getQueue();
  if (!q) return null;
  try {
    const job = await q.add(JOB_NAME_SCHEDULE_OLD_OPEN_TICKETS, payload || { notification_type: 'old_open_tickets' }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 1000 },
    });
    console.log(`📬 Enqueued schedule job ${job.id} (schedule-old-open-tickets)`);
    return job.id;
  } catch (err) {
    console.error('Failed to enqueue schedule-old-open-tickets:', err.message);
    return null;
  }
}

module.exports = {
  addCreateTicketNotificationJob,
  addAcceptTicketNotificationJob,
  addPlanTicketNotificationJob,
  addStartTicketNotificationJob,
  addFinishTicketNotificationJob,
  addRejectTicketNotificationJob,
  addEscalateTicketNotificationJob,
  addReviewedTicketNotificationJob,
  addCloseTicketNotificationJob,
  addReassignTicketNotificationJob,
  addReopenTicketNotificationJob,
  addStatusUpdateTicketNotificationJob,
  addAssignmentTicketNotificationJob,
  addSchedulePendingTicketsJob,
  addScheduleDueDateJob,
  addScheduleOldOpenTicketsJob,
  QUEUE_NAME,
  JOB_NAME_CREATE_TICKET,
  JOB_NAME_ACCEPT_TICKET,
  JOB_NAME_PLAN_TICKET,
  JOB_NAME_START_TICKET,
  JOB_NAME_FINISH_TICKET,
  JOB_NAME_REJECT_TICKET,
  JOB_NAME_ESCALATE_TICKET,
  JOB_NAME_REVIEWED_TICKET,
  JOB_NAME_CLOSE_TICKET,
  JOB_NAME_REASSIGN_TICKET,
  JOB_NAME_REOPEN_TICKET,
  JOB_NAME_STATUS_UPDATE_TICKET,
  JOB_NAME_ASSIGNMENT_TICKET,
  JOB_NAME_SCHEDULE_PENDING_TICKETS,
  JOB_NAME_SCHEDULE_DUE_DATE,
  JOB_NAME_SCHEDULE_OLD_OPEN_TICKETS,
};
