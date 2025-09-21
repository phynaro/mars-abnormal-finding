const { getAccessibleImages } = require('../utils');

function buildTicketPreAssignedMessage(ticket, reporterName) {
  return `📌 Ticket Pre-Assigned\n#${ticket.ticket_number}\n${ticket.title}\nReported By: ${reporterName}\nPriority: ${ticket.priority}\nSeverity: ${ticket.severity_level}\nYou have been pre-assigned to this ticket`;
}

function buildTicketPreAssignedWithImagesMessage(ticket, reporterName, images = [], options = {}) {
  const baseMessage = buildTicketPreAssignedMessage(ticket, reporterName);

  if (!images || images.length === 0) {
    return baseMessage;
  }

  const accessibleImages = getAccessibleImages(images, options.allowLocalImages);

  if (accessibleImages.length === 0) {
    return baseMessage;
  }

  return {
    text: baseMessage,
    images: accessibleImages.map((img) => ({
      type: 'image',
      originalContentUrl: img.url,
      previewImageUrl: img.url,
    })),
  };
}

module.exports = {
  buildTicketPreAssignedMessage,
  buildTicketPreAssignedWithImagesMessage,
};
