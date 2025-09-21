const { buildTicketFlexMessage } = require('./templates/ticketFlexMessage');

function buildTicketCreatedMessage(ticket, reporterName) {
  return `🚨 New Ticket Created\n#${ticket.ticket_number}\n${ticket.title}\nSeverity: ${ticket.severity_level}\nPriority: ${ticket.priority}\nBy: ${reporterName}`;
}

function buildTicketCreatedFlexMessage(ticket, reporterName, images = [], options = {}) {
  return buildTicketFlexMessage(
    ticket,
    'created',
    images,
    { reporterName: reporterName || 'ไม่ระบุ' },
    options,
  );
}

module.exports = {
  buildTicketCreatedMessage,
  buildTicketCreatedFlexMessage,
};
