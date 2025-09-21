const { buildTicketFlexMessage } = require('./templates/ticketFlexMessage');
const {
  safeText,
  selectHeroImage,
  getNotificationTitle,
  getNotificationSubtitle,
  getStatusColor,
  getPriorityColor,
  getStatusText,
  getPriorityText,
} = require('../utils');

function buildTicketEscalatedMessage(ticket, escalatorName, escalationReason) {
  return `🚨 Ticket Escalated\n#${ticket.ticket_number}\n${ticket.title}\nEscalated By: ${escalatorName}\nReason: ${escalationReason}`;
}

function buildTicketEscalatedToRequestorMessage(ticket, escalatorName, escalationReason) {
  return `🚨 Ticket Escalated\n#${ticket.ticket_number}\n${ticket.title}\nEscalated By: ${escalatorName}\nReason: ${escalationReason}\nEscalated to L3 for review`;
}

function buildTicketEscalatedFlexMessage(ticket, escalatorName, escalationReason, images = [], options = {}) {
  return buildTicketFlexMessage(
    ticket,
    'escalated',
    images,
    {
      escalatorName,
      escalationReason,
      reporterName: ticket.reporter_name || 'ไม่ระบุ',
      assigneeName: ticket.assignee_name || 'ยังไม่ได้มอบหมาย',
    },
    options,
  );
}

function buildTicketEscalatedFlexMessageSimple(ticket, escalatorName, escalationReason, images = [], options = {}) {
  const baseUrl = options.baseUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
  const ticketUrl = `${baseUrl}/tickets/${ticket.id}`;

  const heroImage = selectHeroImage(images, {
    allowLocalImages: options.allowLocalImages,
    backendUrl: options.backendUrl,
    frontendUrl: baseUrl,
    fallbackUrl: options.fallbackHeroUrl,
  });

  const statusColor = getStatusColor(ticket.status || 'escalated');
  const priorityColor = getPriorityColor(ticket.priority || 'normal');

  return {
    type: 'flex',
    altText: `Ticket Escalated ${safeText(ticket.ticket_number)}: ${safeText(ticket.title)}`,
    contents: {
      type: 'bubble',
      hero: {
        type: 'image',
        url: heroImage,
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover',
        action: {
          type: 'uri',
          uri: ticketUrl,
        },
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: getNotificationTitle('escalated'),
            weight: 'bold',
            size: 'xl',
          },
          {
            type: 'text',
            text: getNotificationSubtitle('escalated'),
            size: 'sm',
            color: '#666666',
            wrap: true,
            margin: 'sm',
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'lg',
            contents: [
              {
                type: 'text',
                text: 'Ticket#',
                size: 'sm',
                color: '#aaaaaa',
                flex: 3,
              },
              {
                type: 'text',
                text: safeText(ticket.ticket_number),
                size: 'sm',
                weight: 'bold',
                align: 'end',
                flex: 5,
              },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'sm',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: 'Status',
                size: 'sm',
                color: '#aaaaaa',
                flex: 1,
              },
              {
                type: 'text',
                text: getStatusText(ticket.status || 'escalated'),
                size: 'sm',
                weight: 'bold',
                color: statusColor,
                flex: 2,
              },
              {
                type: 'text',
                text: `ความสำคัญ: ${getPriorityText(ticket.priority || 'normal')}`,
                size: 'sm',
                weight: 'bold',
                color: priorityColor,
                align: 'end',
                flex: 3,
              },
            ],
          },
          {
            type: 'separator',
            margin: 'lg',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
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
                    text: safeText(ticket.title),
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
                    text: 'Escalation Reason',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 3,
                  },
                  {
                    type: 'text',
                    text: safeText(escalationReason),
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
                    text: 'Escalated by',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 3,
                  },
                  {
                    type: 'text',
                    text: safeText(escalatorName),
                    wrap: true,
                    color: '#666666',
                    size: 'sm',
                    flex: 5,
                  },
                ],
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
  buildTicketEscalatedMessage,
  buildTicketEscalatedToRequestorMessage,
  buildTicketEscalatedFlexMessage,
  buildTicketEscalatedFlexMessageSimple,
};
