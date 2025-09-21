const { buildTicketFlexMessage } = require('./templates/ticketFlexMessage');
const {
  safeText,
  getNotificationTitle,
  getNotificationSubtitle,
} = require('../utils');

function buildTicketRejectedMessage(ticket, rejectorName, rejectionReason, status) {
  return `❌ Ticket Rejected\n#${ticket.ticket_number}\n${ticket.title}\nRejected By: ${rejectorName}\nReason: ${rejectionReason}\nStatus: ${status}`;
}

function buildTicketRejectedFlexMessage(ticket, rejectorName, rejectionReason, status, images = [], options = {}) {
  return buildTicketFlexMessage(
    ticket,
    'rejected',
    images,
    {
      rejectorName,
      rejectionReason,
      status,
      reporterName: ticket.reporter_name || 'ไม่ระบุ',
      assigneeName: ticket.assignee_name || 'ยังไม่ได้มอบหมาย',
    },
    options,
  );
}

function buildTicketRejectedFlexMessageSimple(ticket, rejectorName, rejectionReason, options = {}) {
  const baseUrl = options.baseUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
  const ticketUrl = `${baseUrl}/tickets/${ticket.id}`;

  return {
    type: 'flex',
    altText: 'Ticket Rejected Notification',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: getNotificationTitle('rejected'),
            weight: 'bold',
            color: '#FF6B6B',
            size: 'sm',
          },
          {
            type: 'text',
            text: `Ticket #${safeText(ticket.ticket_number)}`,
            weight: 'bold',
            size: 'xl',
            margin: 'md',
          },
          {
            type: 'text',
            text: safeText(ticket.title),
            size: 'sm',
            color: '#666666',
            wrap: true,
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: 'Asset',
                color: '#aaaaaa',
                size: 'sm',
                flex: 3,
              },
              {
                type: 'text',
                text:
                  safeText(ticket.PUNAME) ||
                  safeText(ticket.PUCODE) ||
                  safeText(ticket.pu_id) ||
                  'ไม่ระบุ',
                wrap: true,
                color: '#666666',
                size: 'sm',
                flex: 5,
              },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: 'Problem',
                color: '#aaaaaa',
                size: 'sm',
                flex: 3,
              },
              {
                type: 'text',
                text: safeText(ticket.title) || 'ไม่ระบุ',
                wrap: true,
                color: '#666666',
                size: 'sm',
                flex: 5,
              },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: 'Reject Reason',
                color: '#aaaaaa',
                size: 'sm',
                flex: 3,
              },
              {
                type: 'text',
                text: safeText(rejectionReason) || 'ไม่ระบุ',
                wrap: true,
                color: '#666666',
                size: 'sm',
                flex: 5,
              },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: 'Reject by',
                color: '#aaaaaa',
                size: 'sm',
                flex: 3,
              },
              {
                type: 'text',
                text: safeText(rejectorName) || 'ไม่ระบุ',
                wrap: true,
                color: '#666666',
                size: 'sm',
                flex: 5,
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'link',
            height: 'sm',
            action: {
              type: 'uri',
              label: 'OPEN IN APP',
              uri: ticketUrl,
            },
            color: '#25AD76',
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [],
            margin: 'sm',
          },
        ],
        flex: 0,
      },
    },
  };
}

module.exports = {
  buildTicketRejectedMessage,
  buildTicketRejectedFlexMessage,
  buildTicketRejectedFlexMessageSimple,
};
