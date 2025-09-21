const { buildTicketFlexMessage } = require('./templates/ticketFlexMessage');

function buildTicketStatusUpdateMessage(ticket, oldStatus, newStatus, changedByName) {
  return `🔄 Ticket Status Updated\n#${ticket.ticket_number}\n${ticket.title}\n${oldStatus || 'N/A'} → ${newStatus}\nBy: ${changedByName}`;
}

function buildTicketStatusUpdateFlexMessage(ticket, oldStatus, newStatus, changedByName, images = [], options = {}) {
  return buildTicketFlexMessage(
    ticket,
    'status_update',
    images,
    {
      changedByName,
      oldStatus,
      newStatus,
      reporterName: ticket.reporter_name || 'ไม่ระบุ',
      assigneeName: ticket.assignee_name || 'ยังไม่ได้มอบหมาย',
    },
    options,
  );
}

module.exports = {
  buildTicketStatusUpdateMessage,
  buildTicketStatusUpdateFlexMessage,
};
