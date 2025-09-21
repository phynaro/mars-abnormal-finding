const { buildTicketFlexMessage } = require('./templates/ticketFlexMessage');

function buildTicketReopenedMessage(ticket, reopenerName, reopenReason) {
  return `🔄 Ticket Reopened\n#${ticket.ticket_number}\n${ticket.title}\nReopened By: ${reopenerName}${reopenReason ? `\nReason: ${reopenReason}` : ''}`;
}

function buildTicketReopenedFlexMessage(ticket, reopenerName, reopenReason, images = [], options = {}) {
  return buildTicketFlexMessage(
    ticket,
    'reopened',
    images,
    {
      reopenerName,
      reopenReason,
      reporterName: ticket.reporter_name || 'ไม่ระบุ',
      assigneeName: ticket.assignee_name || 'ยังไม่ได้มอบหมาย',
    },
    options,
  );
}

module.exports = {
  buildTicketReopenedMessage,
  buildTicketReopenedFlexMessage,
};
