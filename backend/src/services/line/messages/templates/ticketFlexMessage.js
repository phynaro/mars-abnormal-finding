const {
  safeText,
  selectHeroImage,
  getStatusColor,
  getPriorityColor,
  getNotificationTitle,
  getNotificationSubtitle,
  getStatusText,
  getPriorityText,
} = require('../../utils');

function buildTicketFlexMessage(ticket, messageType = 'created', images = [], additionalData = {}, options = {}) {
  const baseUrl = options.baseUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
  const ticketUrl = `${baseUrl}/tickets/${ticket.id}`;

  const heroImage = selectHeroImage(images, {
    allowLocalImages: options.allowLocalImages,
    backendUrl: options.backendUrl,
    frontendUrl: baseUrl,
    fallbackUrl: options.fallbackHeroUrl,
  });

  const statusColor = getStatusColor(ticket.status || 'open');
  const priorityColor = getPriorityColor(ticket.priority || 'normal');

  return {
    type: 'flex',
    altText: `Ticket ${safeText(ticket.ticket_number)}: ${safeText(ticket.title)}`,
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
            text: getNotificationTitle(messageType),
            weight: 'bold',
            size: 'xl',
          },
          {
            type: 'text',
            text: getNotificationSubtitle(messageType),
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
                text: getStatusText(ticket.status || 'open'),
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
                    text: 'Report by',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 3,
                  },
                  {
                    type: 'text',
                    text: safeText(additionalData.reporterName),
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
  buildTicketFlexMessage,
};
