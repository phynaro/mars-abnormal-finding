const { buildTicketFlexMessage } = require('./templates/ticketFlexMessage');
const { safeText } = require('../utils');

function buildTicketClosedMessage(ticket, closerName, closeReason, satisfactionRating) {
  return `✅ Ticket Closed\n#${ticket.ticket_number}\n${ticket.title}\nClosed By: ${closerName}${closeReason ? `\nReason: ${closeReason}` : ''}${satisfactionRating ? `\nSatisfaction: ${satisfactionRating}/5` : ''}`;
}

function buildTicketClosedFlexMessage(ticket, closerName, closeReason, satisfactionRating, images = [], options = {}) {
  return buildTicketFlexMessage(
    ticket,
    'closed',
    images,
    {
      closerName,
      closeReason,
      satisfactionRating,
      reporterName: ticket.reporter_name || 'ไม่ระบุ',
      assigneeName: ticket.assignee_name || 'ยังไม่ได้มอบหมาย',
    },
    options,
  );
}

function buildTicketClosedFlexMessageSimple(ticket, closerName, satisfactionRating, options = {}) {
  const baseUrl = options.baseUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
  const ticketUrl = `${baseUrl}/tickets/${ticket.id}`;

  const satisfactionText = (() => {
    if (!satisfactionRating || satisfactionRating < 1 || satisfactionRating > 5) {
      return 'ไม่ระบุ';
    }
    return '⭐'.repeat(satisfactionRating);
  })();

  return {
    type: 'flex',
    altText: 'Ticket Closed Notification',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'Ticket Closed',
            weight: 'bold',
            color: '#1DB446',
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
                text: 'Closed by',
                color: '#aaaaaa',
                size: 'sm',
                flex: 3,
              },
              {
                type: 'text',
                text: safeText(closerName) || 'ไม่ระบุ',
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
                text: 'Satisfaction',
                color: '#aaaaaa',
                size: 'sm',
                flex: 3,
              },
              {
                type: 'text',
                text: satisfactionText,
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
  buildTicketClosedMessage,
  buildTicketClosedFlexMessage,
  buildTicketClosedFlexMessageSimple,
};
