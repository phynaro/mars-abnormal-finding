/**
 * BullMQ notification worker (consumer).
 * Run as a separate process: node src/workers/notificationWorker.js
 * Requires: REDIS_URL, RESEND_API_TOKEN, LINE_CHANNEL_ACCESS_TOKEN, LIFF_URL (for payload URLs)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { Worker } = require('bullmq');
const notificationQueue = require('../queues/notificationQueue');
const emailService = require('../services/emailService');
const abnFlexService = require('../services/abnormalFindingFlexService');

const QUEUE_NAME = notificationQueue.QUEUE_NAME;
const JOB_NAME_CREATE_TICKET = notificationQueue.JOB_NAME_CREATE_TICKET;
const JOB_NAME_ACCEPT_TICKET = notificationQueue.JOB_NAME_ACCEPT_TICKET;
const JOB_NAME_PLAN_TICKET = notificationQueue.JOB_NAME_PLAN_TICKET;
const JOB_NAME_START_TICKET = notificationQueue.JOB_NAME_START_TICKET;
const JOB_NAME_FINISH_TICKET = notificationQueue.JOB_NAME_FINISH_TICKET;
const JOB_NAME_REJECT_TICKET = notificationQueue.JOB_NAME_REJECT_TICKET;
const JOB_NAME_ESCALATE_TICKET = notificationQueue.JOB_NAME_ESCALATE_TICKET;
const JOB_NAME_REVIEWED_TICKET = notificationQueue.JOB_NAME_REVIEWED_TICKET;
const JOB_NAME_CLOSE_TICKET = notificationQueue.JOB_NAME_CLOSE_TICKET;
const JOB_NAME_REASSIGN_TICKET = notificationQueue.JOB_NAME_REASSIGN_TICKET;
const JOB_NAME_REOPEN_TICKET = notificationQueue.JOB_NAME_REOPEN_TICKET;
const JOB_NAME_STATUS_UPDATE_TICKET = notificationQueue.JOB_NAME_STATUS_UPDATE_TICKET;
const JOB_NAME_ASSIGNMENT_TICKET = notificationQueue.JOB_NAME_ASSIGNMENT_TICKET;

const connection = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : { host: 'localhost', port: 6379 };

async function processCreateTicketNotification(job) {
  const { ticketData, reporterName, emailRecipients, lineRecipients, linePayload } = job.data;

  if (!ticketData || !ticketData.ticket_number) {
    console.warn('create-ticket job missing ticketData or ticket_number, skipping');
    return;
  }

  const ticketNumber = ticketData.ticket_number;

  if (emailRecipients && emailRecipients.length > 0) {
    try {
      await emailService.sendNewTicketNotification(ticketData, reporterName || 'Ticket Creator', emailRecipients);
      console.log(`✅ [Worker] Email notifications sent for ticket ${ticketNumber} to ${emailRecipients.length} recipient(s)`);
    } catch (err) {
      console.error(`❌ [Worker] Email notification failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }

  if (lineRecipients && lineRecipients.length > 0 && linePayload) {
    try {
      const language = (job.data.language !== undefined) ? job.data.language : 'th';
      const linePromises = lineRecipients.map((user) =>
        abnFlexService.sendToUser(user.LineID, [
          abnFlexService.buildTicketFlexMessage(abnFlexService.TicketState.CREATED, linePayload, { language }),
        ])
      );
      const lineResults = await Promise.all(linePromises);
      const successful = lineResults.filter((r) => r && r.success).length;
      console.log(`✅ [Worker] LINE notifications sent for ticket ${ticketNumber} to ${successful}/${lineRecipients.length} recipient(s)`);
    } catch (err) {
      console.error(`❌ [Worker] LINE notification failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }
}

async function processAcceptTicketNotification(job) {
  const { ticketData, acceptorName, emailRecipients, lineRecipients, linePayload } = job.data;

  if (!ticketData || !ticketData.ticket_number) {
    console.warn('accept-ticket job missing ticketData or ticket_number, skipping');
    return;
  }

  const ticketNumber = ticketData.ticket_number;

  if (emailRecipients && emailRecipients.length > 0) {
    try {
      await emailService.sendTicketAcceptedNotification(ticketData, acceptorName || 'Acceptor', emailRecipients);
      console.log(`✅ [Worker] Accept email notifications sent for ticket ${ticketNumber} to ${emailRecipients.length} recipient(s)`);
    } catch (err) {
      console.error(`❌ [Worker] Accept email notification failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }

  if (lineRecipients && lineRecipients.length > 0 && linePayload) {
    try {
      const language = (job.data.language !== undefined) ? job.data.language : 'th';
      const linePromises = lineRecipients.map((user) =>
        abnFlexService.sendToUser(user.LineID, [
          abnFlexService.buildTicketFlexMessage(abnFlexService.TicketState.ACCEPTED, linePayload, { language }),
        ])
      );
      const lineResults = await Promise.all(linePromises);
      const successful = lineResults.filter((r) => r && r.success).length;
      console.log(`✅ [Worker] Accept LINE notifications sent for ticket ${ticketNumber} to ${successful}/${lineRecipients.length} recipient(s)`);
    } catch (err) {
      console.error(`❌ [Worker] Accept LINE notification failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }
}

async function processPlanTicketNotification(job) {
  const { ticketData, plannerName, emailRecipients, lineRecipients, linePayload } = job.data;

  if (!ticketData || !ticketData.ticket_number) {
    console.warn('plan-ticket job missing ticketData or ticket_number, skipping');
    return;
  }

  const ticketNumber = ticketData.ticket_number;

  if (emailRecipients && emailRecipients.length > 0) {
    try {
      for (let i = 0; i < emailRecipients.length; i++) {
        const user = emailRecipients[i];
        await emailService.sendTicketStatusUpdateNotification(
          ticketData,
          'accepted',
          'planed',
          plannerName || 'Planner',
          user.EMAIL
        );
        if (i < emailRecipients.length - 1) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
      console.log(`✅ [Worker] Plan email notifications sent for ticket ${ticketNumber} to ${emailRecipients.length} recipient(s)`);
    } catch (err) {
      console.error(`❌ [Worker] Plan email notification failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }

  if (lineRecipients && lineRecipients.length > 0 && linePayload) {
    try {
      const language = (job.data.language !== undefined) ? job.data.language : 'th';
      const linePromises = lineRecipients.map((user) =>
        abnFlexService.sendToUser(user.LineID, [
          abnFlexService.buildTicketFlexMessage(abnFlexService.TicketState.PLANED, linePayload, { language }),
        ])
      );
      const lineResults = await Promise.all(linePromises);
      const successful = lineResults.filter((r) => r && r.success).length;
      console.log(`✅ [Worker] Plan LINE notifications sent for ticket ${ticketNumber} to ${successful}/${lineRecipients.length} recipient(s)`);
    } catch (err) {
      console.error(`❌ [Worker] Plan LINE notification failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }
}

async function processStartTicketNotification(job) {
  const { ticketData, starterName, emailRecipients, lineRecipients, linePayload } = job.data;

  if (!ticketData || !ticketData.ticket_number) {
    console.warn('start-ticket job missing ticketData or ticket_number, skipping');
    return;
  }

  const ticketNumber = ticketData.ticket_number;

  if (emailRecipients && emailRecipients.length > 0) {
    try {
      for (let i = 0; i < emailRecipients.length; i++) {
        const user = emailRecipients[i];
        await emailService.sendTicketStatusUpdateNotification(
          ticketData,
          'planed',
          'in_progress',
          starterName || 'Starter',
          user.EMAIL
        );
        if (i < emailRecipients.length - 1) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
      console.log(`✅ [Worker] Start email notifications sent for ticket ${ticketNumber} to ${emailRecipients.length} recipient(s)`);
    } catch (err) {
      console.error(`❌ [Worker] Start email notification failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }

  if (lineRecipients && lineRecipients.length > 0 && linePayload) {
    try {
      const language = (job.data.language !== undefined) ? job.data.language : 'th';
      const linePromises = lineRecipients.map((user) =>
        abnFlexService.sendToUser(user.LineID, [
          abnFlexService.buildTicketFlexMessage(abnFlexService.TicketState.IN_PROGRESS, linePayload, { language }),
        ])
      );
      const lineResults = await Promise.all(linePromises);
      const successful = lineResults.filter((r) => r && r.success).length;
      console.log(`✅ [Worker] Start LINE notifications sent for ticket ${ticketNumber} to ${successful}/${lineRecipients.length} recipient(s)`);
    } catch (err) {
      console.error(`❌ [Worker] Start LINE notification failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }
}

async function processFinishTicketNotification(job) {
  const {
    ticketData,
    finishrName,
    completion_notes,
    downtime_avoidance_hours,
    cost_avoidance,
    emailRecipients,
    lineRecipients,
    linePayload,
  } = job.data;

  if (!ticketData || !ticketData.ticket_number) {
    console.warn('finish-ticket job missing ticketData or ticket_number, skipping');
    return;
  }

  const ticketNumber = ticketData.ticket_number;

  if (emailRecipients && emailRecipients.length > 0) {
    try {
      await emailService.sendJobFinishedNotification(
        ticketData,
        finishrName || 'Finisher',
        completion_notes,
        downtime_avoidance_hours,
        cost_avoidance,
        emailRecipients
      );
      console.log(`✅ [Worker] Finish email notifications sent for ticket ${ticketNumber} to ${emailRecipients.length} recipient(s)`);
    } catch (err) {
      console.error(`❌ [Worker] Finish email notification failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }

  if (lineRecipients && lineRecipients.length > 0 && linePayload) {
    try {
      const language = (job.data.language !== undefined) ? job.data.language : 'th';
      const linePromises = lineRecipients.map((user) =>
        abnFlexService.sendToUser(user.LineID, [
          abnFlexService.buildTicketFlexMessage(abnFlexService.TicketState.Finished, linePayload, { language }),
        ])
      );
      const lineResults = await Promise.all(linePromises);
      const successful = lineResults.filter((r) => r && r.success).length;
      console.log(`✅ [Worker] Finish LINE notifications sent for ticket ${ticketNumber} to ${successful}/${lineRecipients.length} recipient(s)`);
    } catch (err) {
      console.error(`❌ [Worker] Finish LINE notification failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }
}

function statusToTicketState(status) {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'accepted':
    case 'in_progress':
      return abnFlexService.TicketState.ACCEPTED;
    case 'finished':
      return abnFlexService.TicketState.Finished;
    case 'rejected_final':
      return abnFlexService.TicketState.REJECT_FINAL;
    case 'rejected_pending_l3_review':
      return abnFlexService.TicketState.REJECT_TO_MANAGER;
    case 'escalated':
      return abnFlexService.TicketState.ESCALATED;
    case 'closed':
      return abnFlexService.TicketState.CLOSED;
    case 'reopened_in_progress':
      return abnFlexService.TicketState.REOPENED;
    default:
      return abnFlexService.TicketState.CREATED;
  }
}

async function processRejectTicketNotification(job) {
  const { ticketData, rejectorName, rejection_reason, newStatus, emailRecipients, lineRecipients, linePayload, rejectionStateKey } = job.data;
  if (!ticketData || !ticketData.ticket_number) {
    console.warn('reject-ticket job missing ticketData or ticket_number, skipping');
    return;
  }
  const ticketNumber = ticketData.ticket_number;
  if (emailRecipients && emailRecipients.length > 0) {
    try {
      await emailService.sendTicketRejectedNotification(ticketData, rejectorName || 'Rejector', rejection_reason, newStatus, emailRecipients);
      console.log(`✅ [Worker] Reject email sent for ticket ${ticketNumber} to ${emailRecipients.length} recipient(s)`);
    } catch (err) {
      console.error(`❌ [Worker] Reject email failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }
  if (lineRecipients && lineRecipients.length > 0 && linePayload) {
    try {
      const state = rejectionStateKey === 'REJECT_FINAL' ? abnFlexService.TicketState.REJECT_FINAL : abnFlexService.TicketState.REJECT_TO_MANAGER;
      const language = (job.data.language !== undefined) ? job.data.language : 'th';
      const linePromises = lineRecipients.map((user) =>
        abnFlexService.sendToUser(user.LineID, [
          abnFlexService.buildTicketFlexMessage(state, linePayload, { language }),
        ])
      );
      await Promise.all(linePromises);
      console.log(`✅ [Worker] Reject LINE sent for ticket ${ticketNumber} to ${lineRecipients.length} recipient(s)`);
    } catch (err) {
      console.error(`❌ [Worker] Reject LINE failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }
}

async function processEscalateTicketNotification(job) {
  const { ticketData, escalatorName, escalation_reason, emailRecipients, lineRecipients, linePayload } = job.data;
  if (!ticketData || !ticketData.ticket_number) {
    console.warn('escalate-ticket job missing ticketData or ticket_number, skipping');
    return;
  }
  const ticketNumber = ticketData.ticket_number;
  if (emailRecipients && emailRecipients.length > 0) {
    try {
      await emailService.sendTicketEscalatedNotification(ticketData, escalatorName || 'Escalator', escalation_reason, emailRecipients);
      console.log(`✅ [Worker] Escalate email sent for ticket ${ticketNumber} to ${emailRecipients.length} recipient(s)`);
    } catch (err) {
      console.error(`❌ [Worker] Escalate email failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }
  if (lineRecipients && lineRecipients.length > 0 && linePayload) {
    try {
      const language = (job.data.language !== undefined) ? job.data.language : 'th';
      const linePromises = lineRecipients.map((user) =>
        abnFlexService.sendToUser(user.LineID, [
          abnFlexService.buildTicketFlexMessage(abnFlexService.TicketState.ESCALATED, linePayload, { language }),
        ])
      );
      await Promise.all(linePromises);
      console.log(`✅ [Worker] Escalate LINE sent for ticket ${ticketNumber} to ${lineRecipients.length} recipient(s)`);
    } catch (err) {
      console.error(`❌ [Worker] Escalate LINE failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }
}

async function processReviewedTicketNotification(job) {
  const { ticketData, reviewerName, review_reason, satisfaction_rating, emailRecipients, lineRecipients, linePayload } = job.data;
  if (!ticketData || !ticketData.ticket_number) {
    console.warn('reviewed-ticket job missing ticketData or ticket_number, skipping');
    return;
  }
  const ticketNumber = ticketData.ticket_number;
  if (emailRecipients && emailRecipients.length > 0) {
    try {
      await emailService.sendTicketReviewedNotification(ticketData, reviewerName || 'Reviewer', review_reason, satisfaction_rating, emailRecipients);
      console.log(`✅ [Worker] Reviewed email sent for ticket ${ticketNumber} to ${emailRecipients.length} recipient(s)`);
    } catch (err) {
      console.error(`❌ [Worker] Reviewed email failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }
  if (lineRecipients && lineRecipients.length > 0 && linePayload) {
    try {
      const language = (job.data.language !== undefined) ? job.data.language : 'th';
      const linePromises = lineRecipients.map((user) =>
        abnFlexService.sendToUser(user.LineID, [
          abnFlexService.buildTicketFlexMessage(abnFlexService.TicketState.REVIEWED, linePayload, { language }),
        ])
      );
      await Promise.all(linePromises);
      console.log(`✅ [Worker] Reviewed LINE sent for ticket ${ticketNumber} to ${lineRecipients.length} recipient(s)`);
    } catch (err) {
      console.error(`❌ [Worker] Reviewed LINE failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }
}

async function processCloseTicketNotification(job) {
  const { ticketData, closerName, close_reason, satisfaction_rating, emailRecipients, lineRecipients, linePayload } = job.data;
  if (!ticketData || !ticketData.ticket_number) {
    console.warn('close-ticket job missing ticketData or ticket_number, skipping');
    return;
  }
  const ticketNumber = ticketData.ticket_number;
  if (emailRecipients && emailRecipients.length > 0) {
    try {
      await emailService.sendTicketClosedNotification(ticketData, closerName || 'Closer', close_reason, satisfaction_rating ?? null, emailRecipients);
      console.log(`✅ [Worker] Close email sent for ticket ${ticketNumber} to ${emailRecipients.length} recipient(s)`);
    } catch (err) {
      console.error(`❌ [Worker] Close email failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }
  if (lineRecipients && lineRecipients.length > 0 && linePayload) {
    try {
      const language = (job.data.language !== undefined) ? job.data.language : 'th';
      const linePromises = lineRecipients.map((user) =>
        abnFlexService.sendToUser(user.LineID, [
          abnFlexService.buildTicketFlexMessage(abnFlexService.TicketState.CLOSED, linePayload, { language }),
        ])
      );
      await Promise.all(linePromises);
      console.log(`✅ [Worker] Close LINE sent for ticket ${ticketNumber} to ${lineRecipients.length} recipient(s)`);
    } catch (err) {
      console.error(`❌ [Worker] Close LINE failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }
}

async function processReassignTicketNotification(job) {
  const { ticketData, plannerName, oldStatus, newStatus, emailRecipients, lineRecipients, linePayload, lineStateKey } = job.data;
  if (!ticketData || !ticketData.ticket_number) {
    console.warn('reassign-ticket job missing ticketData or ticket_number, skipping');
    return;
  }
  const ticketNumber = ticketData.ticket_number;
  const fromStatus = oldStatus || 'accepted';
  const toStatus = newStatus || 'planed';
  if (emailRecipients && emailRecipients.length > 0) {
    try {
      for (let i = 0; i < emailRecipients.length; i++) {
        const user = emailRecipients[i];
        await emailService.sendTicketStatusUpdateNotification(ticketData, fromStatus, toStatus, plannerName || 'Planner', user.EMAIL);
        if (i < emailRecipients.length - 1) await new Promise((r) => setTimeout(r, 600));
      }
      console.log(`✅ [Worker] Reassign email sent for ticket ${ticketNumber} to ${emailRecipients.length} recipient(s)`);
    } catch (err) {
      console.error(`❌ [Worker] Reassign email failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }
  if (lineRecipients && lineRecipients.length > 0 && linePayload) {
    try {
      const state = lineStateKey === 'REASSIGNED' ? abnFlexService.TicketState.REASSIGNED : abnFlexService.TicketState.PLANED;
      const language = (job.data.language !== undefined) ? job.data.language : 'th';
      const linePromises = lineRecipients.map((user) =>
        abnFlexService.sendToUser(user.LineID, [
          abnFlexService.buildTicketFlexMessage(state, linePayload, { language }),
        ])
      );
      await Promise.all(linePromises);
      console.log(`✅ [Worker] Reassign LINE sent for ticket ${ticketNumber} to ${lineRecipients.length} recipient(s)`);
    } catch (err) {
      console.error(`❌ [Worker] Reassign LINE failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }
}

async function processReopenTicketNotification(job) {
  const { ticketData, reopenerName, reopen_reason, emailRecipients, lineRecipients, linePayload } = job.data;
  if (!ticketData || !ticketData.ticket_number) {
    console.warn('reopen-ticket job missing ticketData or ticket_number, skipping');
    return;
  }
  const ticketNumber = ticketData.ticket_number;
  if (emailRecipients && emailRecipients.length > 0) {
    try {
      await emailService.sendTicketReopenedNotification(ticketData, reopenerName || 'Reopener', reopen_reason, emailRecipients);
      console.log(`✅ [Worker] Reopen email sent for ticket ${ticketNumber} to ${emailRecipients.length} recipient(s)`);
    } catch (err) {
      console.error(`❌ [Worker] Reopen email failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }
  if (lineRecipients && lineRecipients.length > 0 && linePayload) {
    try {
      const language = (job.data.language !== undefined) ? job.data.language : 'th';
      const linePromises = lineRecipients.map((user) =>
        abnFlexService.sendToUser(user.LineID, [
          abnFlexService.buildTicketFlexMessage(abnFlexService.TicketState.REOPENED, linePayload, { language }),
        ])
      );
      await Promise.all(linePromises);
      console.log(`✅ [Worker] Reopen LINE sent for ticket ${ticketNumber} to ${lineRecipients.length} recipient(s)`);
    } catch (err) {
      console.error(`❌ [Worker] Reopen LINE failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }
}

async function processStatusUpdateTicketNotification(job) {
  const { ticketData, oldStatus, newStatus, changedByName, reporter, linePayload } = job.data;
  if (!ticketData || !ticketData.ticket_number) {
    console.warn('status-update-ticket job missing ticketData or ticket_number, skipping');
    return;
  }
  const ticketNumber = ticketData.ticket_number;
  if (reporter && reporter.EMAIL) {
    try {
      await emailService.sendTicketStatusUpdateNotification(ticketData, oldStatus, newStatus, changedByName || 'User', reporter.EMAIL);
      console.log(`✅ [Worker] Status-update email sent for ticket ${ticketNumber}`);
    } catch (err) {
      console.error(`❌ [Worker] Status-update email failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }
  if (reporter && reporter.LineID && linePayload) {
    try {
      const state = statusToTicketState(newStatus);
      const language = (job.data.language !== undefined) ? job.data.language : 'th';
      await abnFlexService.sendToUser(reporter.LineID, [
        abnFlexService.buildTicketFlexMessage(state, linePayload, { language }),
      ]);
      console.log(`✅ [Worker] Status-update LINE sent for ticket ${ticketNumber}`);
    } catch (err) {
      console.error(`❌ [Worker] Status-update LINE failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }
}

async function processAssignmentTicketNotification(job) {
  const { ticketData, assigneeDisplayName, assignee, linePayload } = job.data;
  if (!ticketData || !ticketData.ticket_number) {
    console.warn('assignment-ticket job missing ticketData or ticket_number, skipping');
    return;
  }
  const ticketNumber = ticketData.ticket_number;
  if (assignee && assignee.EMAIL) {
    try {
      await emailService.sendTicketAssignmentNotification(ticketData, assigneeDisplayName || 'Assignee', assignee.EMAIL);
      console.log(`✅ [Worker] Assignment email sent for ticket ${ticketNumber}`);
    } catch (err) {
      console.error(`❌ [Worker] Assignment email failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }
  if (assignee && assignee.LineID && linePayload) {
    try {
      const language = (job.data.language !== undefined) ? job.data.language : 'th';
      await abnFlexService.sendToUser(assignee.LineID, [
        abnFlexService.buildTicketFlexMessage(abnFlexService.TicketState.REASSIGNED, linePayload, { language }),
      ]);
      console.log(`✅ [Worker] Assignment LINE sent for ticket ${ticketNumber}`);
    } catch (err) {
      console.error(`❌ [Worker] Assignment LINE failed for ticket ${ticketNumber}:`, err.message);
      throw err;
    }
  }
}

async function processor(job) {
  if (job.name === JOB_NAME_CREATE_TICKET) {
    await processCreateTicketNotification(job);
    return;
  }
  if (job.name === JOB_NAME_ACCEPT_TICKET) {
    await processAcceptTicketNotification(job);
    return;
  }
  if (job.name === JOB_NAME_PLAN_TICKET) {
    await processPlanTicketNotification(job);
    return;
  }
  if (job.name === JOB_NAME_START_TICKET) {
    await processStartTicketNotification(job);
    return;
  }
  if (job.name === JOB_NAME_FINISH_TICKET) {
    await processFinishTicketNotification(job);
    return;
  }
  if (job.name === JOB_NAME_REJECT_TICKET) {
    await processRejectTicketNotification(job);
    return;
  }
  if (job.name === JOB_NAME_ESCALATE_TICKET) {
    await processEscalateTicketNotification(job);
    return;
  }
  if (job.name === JOB_NAME_REVIEWED_TICKET) {
    await processReviewedTicketNotification(job);
    return;
  }
  if (job.name === JOB_NAME_CLOSE_TICKET) {
    await processCloseTicketNotification(job);
    return;
  }
  if (job.name === JOB_NAME_REASSIGN_TICKET) {
    await processReassignTicketNotification(job);
    return;
  }
  if (job.name === JOB_NAME_REOPEN_TICKET) {
    await processReopenTicketNotification(job);
    return;
  }
  if (job.name === JOB_NAME_STATUS_UPDATE_TICKET) {
    await processStatusUpdateTicketNotification(job);
    return;
  }
  if (job.name === JOB_NAME_ASSIGNMENT_TICKET) {
    await processAssignmentTicketNotification(job);
    return;
  }
  console.warn(`[Worker] Unknown job name: ${job.name}`);
}

const worker = new Worker(QUEUE_NAME, processor, {
  connection,
  concurrency: 5,
});

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} (${job.name}) completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} (${job?.name}) failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('[Worker] Worker error:', err);
});

console.log(`📬 Notification worker started, listening to queue "${QUEUE_NAME}"`);
console.log('   Redis:', process.env.REDIS_URL || 'localhost:6379');
