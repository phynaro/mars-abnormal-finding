const axios = require('axios');

class LineService {
  constructor() {
    this.channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
    this.apiBase = 'https://api.line.me/v2/bot/message';
    this.allowLocalImages = process.env.LINE_ALLOW_LOCAL_IMAGES === 'true';
    this.imageHostingService = process.env.LINE_IMAGE_HOSTING_SERVICE || 'none'; // 'none', 'imgur', 'cloudinary', etc.
  }

  isConfigured() {
    return !!this.channelAccessToken;
  }

  async pushToUser(lineUserId, messages) {
    try {
      if (!this.isConfigured()) {
        console.warn('LINE_CHANNEL_ACCESS_TOKEN not set; skipping LINE push');
        return { success: false, skipped: true };
      }
      if (!lineUserId) {
        console.warn('No LineID provided; skipping LINE push');
        return { success: false, skipped: true };
      }

      // Normalize to array of messages
      let msgArray = Array.isArray(messages) ? messages : [messages];

      // Handle special case where messages might be objects with text and images
      const processedMessages = [];
      for (const msg of msgArray) {
        if (typeof msg === 'string') {
          processedMessages.push({ type: 'text', text: msg });
        } else if (msg.text && msg.images) {
          // Handle mixed message with text and images
          processedMessages.push({ type: 'text', text: msg.text });
          processedMessages.push(...msg.images);
        } else {
          processedMessages.push(msg);
        }
      }

      const payload = {
        to: lineUserId,
        messages: processedMessages,
      };

      const res = await axios.post(
        `${this.apiBase}/push`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.channelAccessToken}`,
          },
          timeout: 10000,
        }
      );

      return { success: true, status: res.status };
    } catch (error) {
      console.error('LINE push error:', error?.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  async replyToToken(replyToken, messages) {
    try {
      if (!this.isConfigured()) {
        console.warn('LINE_CHANNEL_ACCESS_TOKEN not set; skipping LINE reply');
        return { success: false, skipped: true };
      }
      const msgArray = Array.isArray(messages) ? messages : [messages];
      const payload = {
        replyToken,
        messages: msgArray.map((m) => (typeof m === 'string' ? { type: 'text', text: m } : m)),
      };
      const res = await axios.post(`${this.apiBase}/reply`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.channelAccessToken}`,
        },
        timeout: 10000,
      });
      return { success: true, status: res.status };
    } catch (error) {
      console.error('LINE reply error:', error?.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  // Convenience message builders
  buildTicketCreatedMessage(ticket, reporterName) {
    return `🚨 New Ticket Created\n#${ticket.ticket_number}\n${ticket.title}\nSeverity: ${ticket.severity_level}\nPriority: ${ticket.priority}\nBy: ${reporterName}`;
  }

  buildAssignmentMessage(ticket) {
    return `📌 Ticket Assigned\n#${ticket.ticket_number}\n${ticket.title}\nSeverity: ${ticket.severity_level}\nPriority: ${ticket.priority}`;
  }

  buildStatusUpdateMessage(ticket, oldStatus, newStatus, changedByName) {
    return `🔄 Ticket Status Updated\n#${ticket.ticket_number}\n${ticket.title}\n${oldStatus || 'N/A'} → ${newStatus}\nBy: ${changedByName}`;
  }

  buildTicketPreAssignedMessage(ticket, reporterName) {
    return `📌 Ticket Pre-Assigned\n#${ticket.ticket_number}\n${ticket.title}\nReported By: ${reporterName}\nPriority: ${ticket.priority}\nSeverity: ${ticket.severity_level}\nYou have been pre-assigned to this ticket`;
  }

  buildTicketPreAssignedWithImagesMessage(ticket, reporterName, images) {
    const baseMessage = this.buildTicketPreAssignedMessage(ticket, reporterName);
    
    if (images && images.length > 0) {
      let accessibleImages = images;
      
      // If local images are not allowed, filter them out
      if (!this.allowLocalImages) {
        accessibleImages = images.filter(img => {
          const url = img.url.toLowerCase();
          return !url.includes('localhost') && !url.includes('127.0.0.1') && !url.includes('192.168.') && !url.includes('10.') && !url.includes('172.');
        });
      }
      
      if (accessibleImages.length > 0) {
        return {
          text: baseMessage,
          images: accessibleImages.map(img => ({
            type: 'image',
            originalContentUrl: img.url,
            previewImageUrl: img.url
          }))
        };
      }
    }
    
    return baseMessage;
  }

  buildTicketAcceptedMessage(ticket, acceptorName) {
    return `✅ Ticket Accepted\n#${ticket.ticket_number}\n${ticket.title}\nAccepted By: ${acceptorName}\nStatus: Work in Progress`;
  }

  buildTicketRejectedMessage(ticket, rejectorName, rejectionReason, status) {
    return `❌ Ticket Rejected\n#${ticket.ticket_number}\n${ticket.title}\nRejected By: ${rejectorName}\nReason: ${rejectionReason}\nStatus: ${status}`;
  }

  buildJobCompletedMessage(ticket, completerName, completionNotes, actualDowntime) {
    return `✅ Job Completed\n#${ticket.ticket_number}\n${ticket.title}\nCompleted By: ${completerName}\nActual Downtime: ${actualDowntime || 'Not specified'} hours${completionNotes ? `\nNotes: ${completionNotes}` : ''}`;
  }

  buildTicketEscalatedMessage(ticket, escalatorName, escalationReason) {
    return `🚨 Ticket Escalated\n#${ticket.ticket_number}\n${ticket.title}\nEscalated By: ${escalatorName}\nReason: ${escalationReason}`;
  }

  buildTicketEscalatedToRequestorMessage(ticket, escalatorName, escalationReason) {
    return `🚨 Ticket Escalated\n#${ticket.ticket_number}\n${ticket.title}\nEscalated By: ${escalatorName}\nReason: ${escalationReason}\nEscalated to L3 for review`;
  }

  buildTicketClosedMessage(ticket, closerName, closeReason, satisfactionRating) {
    return `✅ Ticket Closed\n#${ticket.ticket_number}\n${ticket.title}\nClosed By: ${closerName}${closeReason ? `\nReason: ${closeReason}` : ''}${satisfactionRating ? `\nSatisfaction: ${satisfactionRating}/5` : ''}`;
  }

  buildTicketReopenedMessage(ticket, reopenerName, reopenReason) {
    return `🔄 Ticket Reopened\n#${ticket.ticket_number}\n${ticket.title}\nReopened By: ${reopenerName}${reopenReason ? `\nReason: ${reopenReason}` : ''}`;
  }

  buildTicketPreAssignedMessage(ticket, reporterName) {
    return `📌 Ticket Pre-Assigned\n#${ticket.ticket_number}\n${ticket.title}\nReported By: ${reporterName}\nPriority: ${ticket.priority}\nSeverity: ${ticket.severity_level}\nYou have been pre-assigned to this ticket`;
  }

  buildTicketReassignedMessage(ticket, reassignerName, reassignmentReason) {
    return `🔄 Ticket Reassigned\n#${ticket.ticket_number}\n${ticket.title}\nReassigned By: ${reassignerName}${reassignmentReason ? `\nReason: ${reassignmentReason}` : ''}\nReassigned by L3 management`;
  }

  /**
   * Helper function to get ticket images for LINE notifications
   * @param {Array} images - Array of image objects with url and filename
   * @returns {Array} Array of LINE image message objects
   */
  buildImageMessages(images) {
    if (!images || images.length === 0) {
      return [];
    }
    
    return images.map(img => ({
      type: 'image',
      originalContentUrl: img.url,
      previewImageUrl: img.url
    }));
  }

  /**
   * Check if an image URL is accessible from external servers (like LINE)
   * @param {string} url - Image URL to check
   * @returns {boolean} - True if accessible, false if local/private
   */
  isImageAccessible(url) {
    if (!url) return false;
    
    const lowerUrl = url.toLowerCase();
    const localPatterns = [
      'localhost', '127.0.0.1', '192.168.', '10.', '172.',
      '::1', 'fe80:', 'fc00:', 'fd00:' // IPv6 local addresses
    ];
    
    return !localPatterns.some(pattern => lowerUrl.includes(pattern));
  }

  /**
   * Get accessible images for LINE notifications
   * @param {Array} images - Array of image objects
   * @returns {Array} Array of accessible images
   */
  getAccessibleImages(images) {
    if (!images || images.length === 0) return [];
    
    if (this.allowLocalImages) {
      return images; // Allow all images if configured
    }
    
    return images.filter(img => this.isImageAccessible(img.url));
  }

  /**
   * Debug method to check image accessibility
   * @param {Array} images - Array of image objects
   * @returns {Object} Debug information about images
   */
  debugImageAccessibility(images) {
    if (!images || images.length === 0) {
      return { total: 0, accessible: 0, local: 0, details: [] };
    }
    
    const details = images.map(img => ({
      url: img.url,
      filename: img.filename,
      accessible: this.isImageAccessible(img.url),
      reason: this.isImageAccessible(img.url) ? 'Public URL' : 'Local/Private URL'
    }));
    
    const accessible = details.filter(d => d.accessible).length;
    const local = details.filter(d => !d.accessible).length;
    
    return {
      total: images.length,
      accessible,
      local,
      details,
      config: {
        allowLocalImages: this.allowLocalImages,
        imageHostingService: this.imageHostingService
      }
    };
  }
}

module.exports = new LineService();
