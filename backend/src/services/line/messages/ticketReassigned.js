const { buildTicketFlexMessage } = require('./templates/ticketFlexMessage');

function buildTicketReassignedMessage(ticket, reassignerName, reassignmentReason) {
  return `🔄 Ticket Reassigned\n#${ticket.ticket_number}\n${ticket.title}\nReassigned By: ${reassignerName}${reassignmentReason ? `\nReason: ${reassignmentReason}` : ''}\nReassigned by L3 management`;
}

function buildTicketReassignedFlexMessage(ticket, reassignerName, reassignmentReason, images = [], options = {}) {
  return buildTicketFlexMessage(
    ticket,
    'reassigned',
    images,
    {
      reassignerName,
      reassignmentReason,
      reporterName: ticket.reporter_name || 'ไม่ระบุ',
      assigneeName: ticket.assignee_name || 'ยังไม่ได้มอบหมาย',
    },
    options,
  );
}

module.exports = {
  buildTicketReassignedMessage,
  buildTicketReassignedFlexMessage,
};
