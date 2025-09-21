const { buildTicketFlexMessage } = require('./templates/ticketFlexMessage');

function buildAssignmentMessage(ticket) {
  return `📌 Ticket Assigned\n#${ticket.ticket_number}\n${ticket.title}\nSeverity: ${ticket.severity_level}\nPriority: ${ticket.priority}`;
}

function buildTicketAssignedFlexMessage(ticket, assigneeName, images = [], options = {}) {
  return buildTicketFlexMessage(
    ticket,
    'assigned',
    images,
    {
      assigneeName,
      reporterName: ticket.reporter_name || 'ไม่ระบุ',
    },
    options,
  );
}

module.exports = {
  buildAssignmentMessage,
  buildTicketAssignedFlexMessage,
};
