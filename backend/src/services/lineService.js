const axios = require('axios');
const messageBuilders = require('./line/messages');
const {
  buildImageMessages,
  isImageAccessible,
  getAccessibleImages,
  debugImageAccessibility,
  selectHeroImage,
  getStatusColor,
  getPriorityColor,
  getNotificationTitle,
  getNotificationSubtitle,
  getStatusText,
  getPriorityText,
} = require('./line/utils');

class LineService {
  constructor() {
    this.channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
    this.apiBase = 'https://api.line.me/v2/bot/message';
    this.allowLocalImages = process.env.LINE_ALLOW_LOCAL_IMAGES === 'true';
    this.imageHostingService = process.env.LINE_IMAGE_HOSTING_SERVICE || 'none';
  }

  isConfigured() {
    return !!this.channelAccessToken;
  }

  getFlexMessageOptions(overrides = {}) {
    return {
      allowLocalImages: this.allowLocalImages,
      backendUrl: process.env.BACKEND_URL,
      frontendUrl: process.env.FRONTEND_URL,
      baseUrl: process.env.FRONTEND_URL,
      ...overrides,
    };
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

      if (typeof lineUserId !== 'string' || !lineUserId.startsWith('U') || lineUserId.length !== 33) {
        console.error(`Invalid LineID format: ${lineUserId}. Expected format: U followed by 32 characters.`);
        return { success: false, error: 'Invalid LineID format' };
      }

      const msgArray = Array.isArray(messages) ? messages : [messages];

      const processedMessages = [];
      for (const msg of msgArray) {
        if (typeof msg === 'string') {
          processedMessages.push({ type: 'text', text: msg });
        } else if (msg.text && msg.images) {
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
        },
      );

      return { success: true, status: res.status };
    } catch (error) {
      console.error('LINE push error:', {
        message: error?.response?.data || error.message,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        lineUserId,
        messages: JSON.stringify(messages, null, 2),
      });
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

  buildTicketCreatedMessage(ticket, reporterName) {
    return messageBuilders.buildTicketCreatedMessage(ticket, reporterName);
  }

  buildTicketCreatedFlexMessage(ticket, reporterName, images = []) {
    return messageBuilders.buildTicketCreatedFlexMessage(
      ticket,
      reporterName,
      images,
      this.getFlexMessageOptions(),
    );
  }

  buildAssignmentMessage(ticket) {
    return messageBuilders.buildAssignmentMessage(ticket);
  }

  buildTicketAssignedFlexMessage(ticket, assigneeName, images = []) {
    return messageBuilders.buildTicketAssignedFlexMessage(
      ticket,
      assigneeName,
      images,
      this.getFlexMessageOptions(),
    );
  }

  buildTicketStatusUpdateMessage(ticket, oldStatus, newStatus, changedByName) {
    return messageBuilders.buildTicketStatusUpdateMessage(ticket, oldStatus, newStatus, changedByName);
  }

  buildTicketStatusUpdateFlexMessage(ticket, oldStatus, newStatus, changedByName, images = []) {
    return messageBuilders.buildTicketStatusUpdateFlexMessage(
      ticket,
      oldStatus,
      newStatus,
      changedByName,
      images,
      this.getFlexMessageOptions(),
    );
  }

  buildTicketPreAssignedMessage(ticket, reporterName) {
    return messageBuilders.buildTicketPreAssignedMessage(ticket, reporterName);
  }

  buildTicketPreAssignedWithImagesMessage(ticket, reporterName, images = []) {
    return messageBuilders.buildTicketPreAssignedWithImagesMessage(
      ticket,
      reporterName,
      images,
      this.getFlexMessageOptions(),
    );
  }

  buildTicketAcceptedMessage(ticket, acceptorName) {
    return messageBuilders.buildTicketAcceptedMessage(ticket, acceptorName);
  }

  buildTicketAcceptedFlexMessage(ticket, acceptorName, images = []) {
    return messageBuilders.buildTicketAcceptedFlexMessage(
      ticket,
      acceptorName,
      images,
      this.getFlexMessageOptions(),
    );
  }

  buildTicketAcceptedFlexMessageSimple(ticket, acceptorName) {
    return messageBuilders.buildTicketAcceptedFlexMessageSimple(
      ticket,
      acceptorName,
      this.getFlexMessageOptions(),
    );
  }

  buildTicketRejectedMessage(ticket, rejectorName, rejectionReason, status) {
    return messageBuilders.buildTicketRejectedMessage(ticket, rejectorName, rejectionReason, status);
  }

  buildTicketRejectedFlexMessage(ticket, rejectorName, rejectionReason, status, images = []) {
    return messageBuilders.buildTicketRejectedFlexMessage(
      ticket,
      rejectorName,
      rejectionReason,
      status,
      images,
      this.getFlexMessageOptions(),
    );
  }

  buildTicketRejectedFlexMessageSimple(ticket, rejectorName, rejectionReason) {
    return messageBuilders.buildTicketRejectedFlexMessageSimple(
      ticket,
      rejectorName,
      rejectionReason,
      this.getFlexMessageOptions(),
    );
  }

  buildJobCompletedMessage(ticket, completerName, completionNotes, downtimeAvoidance, costAvoidance) {
    return messageBuilders.buildJobCompletedMessage(
      ticket,
      completerName,
      completionNotes,
      downtimeAvoidance,
      costAvoidance,
    );
  }

  buildJobCompletedFlexMessage(ticket, completerName, completionNotes, downtimeAvoidance, costAvoidance, images = []) {
    return messageBuilders.buildJobCompletedFlexMessage(
      ticket,
      completerName,
      completionNotes,
      downtimeAvoidance,
      costAvoidance,
      images,
      this.getFlexMessageOptions(),
    );
  }

  buildJobCompletedFlexMessageWithHero(ticket, completerName, downtimeAvoidance, costAvoidance, images = []) {
    return messageBuilders.buildJobCompletedFlexMessageWithHero(
      ticket,
      completerName,
      downtimeAvoidance,
      costAvoidance,
      images,
      this.getFlexMessageOptions(),
    );
  }

  buildTicketEscalatedMessage(ticket, escalatorName, escalationReason) {
    return messageBuilders.buildTicketEscalatedMessage(ticket, escalatorName, escalationReason);
  }

  buildTicketEscalatedToRequestorMessage(ticket, escalatorName, escalationReason) {
    return messageBuilders.buildTicketEscalatedToRequestorMessage(ticket, escalatorName, escalationReason);
  }

  buildTicketEscalatedFlexMessage(ticket, escalatorName, escalationReason, images = []) {
    return messageBuilders.buildTicketEscalatedFlexMessage(
      ticket,
      escalatorName,
      escalationReason,
      images,
      this.getFlexMessageOptions(),
    );
  }

  buildTicketEscalatedFlexMessageSimple(ticket, escalatorName, escalationReason, images = []) {
    return messageBuilders.buildTicketEscalatedFlexMessageSimple(
      ticket,
      escalatorName,
      escalationReason,
      images,
      this.getFlexMessageOptions(),
    );
  }

  buildTicketClosedMessage(ticket, closerName, closeReason, satisfactionRating) {
    return messageBuilders.buildTicketClosedMessage(ticket, closerName, closeReason, satisfactionRating);
  }

  buildTicketClosedFlexMessage(ticket, closerName, closeReason, satisfactionRating, images = []) {
    return messageBuilders.buildTicketClosedFlexMessage(
      ticket,
      closerName,
      closeReason,
      satisfactionRating,
      images,
      this.getFlexMessageOptions(),
    );
  }

  buildTicketClosedFlexMessageSimple(ticket, closerName, satisfactionRating) {
    return messageBuilders.buildTicketClosedFlexMessageSimple(
      ticket,
      closerName,
      satisfactionRating,
      this.getFlexMessageOptions(),
    );
  }

  buildTicketReopenedMessage(ticket, reopenerName, reopenReason) {
    return messageBuilders.buildTicketReopenedMessage(ticket, reopenerName, reopenReason);
  }

  buildTicketReopenedFlexMessage(ticket, reopenerName, reopenReason, images = []) {
    return messageBuilders.buildTicketReopenedFlexMessage(
      ticket,
      reopenerName,
      reopenReason,
      images,
      this.getFlexMessageOptions(),
    );
  }

  buildTicketReassignedMessage(ticket, reassignerName, reassignmentReason) {
    return messageBuilders.buildTicketReassignedMessage(ticket, reassignerName, reassignmentReason);
  }

  buildTicketReassignedFlexMessage(ticket, reassignerName, reassignmentReason, images = []) {
    return messageBuilders.buildTicketReassignedFlexMessage(
      ticket,
      reassignerName,
      reassignmentReason,
      images,
      this.getFlexMessageOptions(),
    );
  }

  buildImageMessages(images) {
    return buildImageMessages(images);
  }

  isImageAccessible(url) {
    return isImageAccessible(url);
  }

  getAccessibleImages(images) {
    return getAccessibleImages(images, this.allowLocalImages);
  }

  debugImageAccessibility(images) {
    return debugImageAccessibility(images, {
      allowLocalImages: this.allowLocalImages,
      imageHostingService: this.imageHostingService,
    });
  }

  selectHeroImage(images) {
    return selectHeroImage(images, this.getFlexMessageOptions());
  }

  getStatusColor(status) {
    return getStatusColor(status);
  }

  getPriorityColor(priority) {
    return getPriorityColor(priority);
  }

  getNotificationTitle(messageType) {
    return getNotificationTitle(messageType);
  }

  getNotificationSubtitle(messageType) {
    return getNotificationSubtitle(messageType);
  }

  getStatusText(status) {
    return getStatusText(status);
  }

  getPriorityText(priority) {
    return getPriorityText(priority);
  }
}

module.exports = new LineService();
