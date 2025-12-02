/**
 * Abnormal Finding Flex Message Service
 * Professional LINE notification service for ticket management system
 * 
 * Features:
 * - Unified flex message system for all ticket states
 * - Consistent design and branding
 * - Multi-language support (Thai/English)
 * - Image handling with hero image support
 * - Error handling and validation
 * 
 * Usage:
 * const flexService = require('./abnormalFindingFlexService');
 * const message = flexService.buildTicketFlexMessage(TicketState.CREATED, payload);
 * await flexService.sendToUser(lineUserId, message);
 */

const axios = require('axios');

// ===== CONSTANTS =====

/**
 * Ticket states enumeration
 * Maps to the ticket workflow states in the system
 */
const TicketState = Object.freeze({
  CREATED: "CREATED",
  ACCEPTED: "ACCEPTED",
  PLANED: "PLANED",
  IN_PROGRESS: "IN_PROGRESS", 
  REJECT_TO_MANAGER: "REJECT_TO_MANAGER",
  REJECT_FINAL: "REJECT_FINAL",
  Finished: "FINISHED",
  REVIEWED: "REVIEWED",
  REASSIGNED: "REASSIGNED",
  ESCALATED: "ESCALATED",
  CLOSED: "CLOSED",
  REOPENED: "REOPENED",
});

/**
 * Color scheme for ticket states
 * Uses professional color palette for better UX
 */
const STATE_COLORS = Object.freeze({
  [TicketState.OPEN]: "#0EA5E9",          // Professional blue
  [TicketState.ACCEPTED]: "#22C55E",           // Success green
  [TicketState.PLANED]: "#3B82F6",             // Planning blue
  [TicketState.IN_PROGRESS]: "#F59E0B",        // Work in progress amber
  [TicketState.REJECT_TO_MANAGER]: "#F59E0B",  // Warning amber
  [TicketState.REJECT_FINAL]: "#EF4444",       // Error red
  [TicketState.Finished]: "#10B981",          // Emerald green
  [TicketState.REVIEWED]: "#8B5CF6",           // Purple
  [TicketState.REASSIGNED]: "#A855F7",         // Violet
  [TicketState.ESCALATED]: "#FB7185",          // Rose
  [TicketState.CLOSED]: "#64748B",             // Slate gray
  [TicketState.REOPENED]: "#F97316",           // Orange
});

/**
 * Thai language labels for ticket states
 * Provides localized user experience
 */
const STATE_LABELS_TH = Object.freeze({
  [TicketState.OPEN]: "สร้างเคสใหม่",
  [TicketState.ACCEPTED]: "รับงาน",
  [TicketState.PLANED]: "วางแผนและกำหนดตารางเวลา",
  [TicketState.IN_PROGRESS]: "เริ่มดำเนินการ",
  [TicketState.REJECT_TO_MANAGER]: "ปฏิเสธ รอการอนุมัติจากหัวหน้างาน",
  [TicketState.REJECT_FINAL]: "ปฏิเสธขั้นสุดท้าย",
  [TicketState.Finished]: "เสร็จสิ้น",
  [TicketState.REVIEWED]: "ตรวจสอบแล้ว รอการปิด",
  [TicketState.REASSIGNED]: "มอบหมาย",
  [TicketState.ESCALATED]: "ส่งต่อให้หัวหน้างาน",
  [TicketState.CLOSED]: "ปิดเคส",
  [TicketState.REOPENED]: "เปิดเคสใหม่",
});

/**
 * English language labels for ticket states
 * Fallback for international users
 */
const STATE_LABELS_EN = Object.freeze({
  [TicketState.OPEN]: "New Ticket Created",
  [TicketState.ACCEPTED]: "Ticket Accepted",
  [TicketState.PLANED]: "Planned and Scheduled",
  [TicketState.IN_PROGRESS]: "Work In Progress",
  [TicketState.REJECT_TO_MANAGER]: "Rejected - Pending Manager Review",
  [TicketState.REJECT_FINAL]: "Rejected - Final Decision",
  [TicketState.Finished]: "Work Finished",
  [TicketState.REVIEWED]: "Reviewed - Pending Closure",
  [TicketState.REASSIGNED]: "Reassigned",
  [TicketState.ESCALATED]: "Escalated to Manager",
  [TicketState.CLOSED]: "Ticket Closed",
  [TicketState.REOPENED]: "Ticket Reopened",
});

// ===== HELPER FUNCTIONS =====

/**
 * Creates a key-value row component for flex message
 * @param {string} label - The label text
 * @param {string} value - The value text
 * @returns {Object} Flex message component
 */
const createKeyValueRow = (label, value) => ({
  type: "box",
  layout: "baseline",
  contents: [
    { 
      type: "text", 
      text: String(label || "-"), 
      size: "sm", 
      color: "#6B7280", 
      flex: 5, 
      align: "start" 
    },
    { 
      type: "text", 
      text: String(value ?? "-"), 
      size: "sm", 
      flex: 7, 
      align: "end", 
      wrap: true 
    }
  ]
});

/**
 * Validates LINE user ID format
 * @param {string} lineUserId - The LINE user ID to validate
 * @returns {boolean} True if valid format
 */
const isValidLineUserId = (lineUserId) => {
  return typeof lineUserId === 'string' && 
         lineUserId.startsWith('U') && 
         lineUserId.length === 33;
};

/**
 * Gets the appropriate label for a ticket state
 * @param {string} state - The ticket state
 * @param {string} language - Language preference ('th' or 'en')
 * @returns {string} Localized label
 */
const getStateLabel = (state, language = 'th') => {
  const labels = language === 'en' ? STATE_LABELS_EN : STATE_LABELS_TH;
  return labels[state] || state;
};

// ===== MAIN FLEX MESSAGE BUILDER =====

/**
 * Builds a professional flex message for ticket notifications
 * @param {string} state - The ticket state
 * @param {Object} payload - Ticket data payload
 * @param {Object} options - Additional options
 * @returns {Object} LINE flex message object
 */
function buildTicketFlexMessage(state, payload, options = {}) {
  const {
    language = 'th',
    includeHeroImage = true,
    includeCallButton = false,
    includeViewDetailsButton = true
  } = options;

  const statusColor = STATE_COLORS[state] || "#6B7280";
  const statusLabel = getStateLabel(state, language);

  const contents = {
    type: "bubble",
    // Add hero image if provided and enabled
    ...(includeHeroImage && payload.heroImageUrl ? {
      hero: {
        type: "image",
        url: payload.heroImageUrl,
        size: "full",
        aspectRatio: "20:13",
        aspectMode: "cover"
      }
    } : {}),
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "16px",
      contents: [
        // Status indicator
        {
          type: "text",
          text: statusLabel,
          size: "sm",
          weight: "bold",
          color: statusColor
        },
        // Ticket number
        {
          type: "text",
          text: String(payload.caseNo || "-"),
          size: "xl",
          weight: "bold"
        },
        // Asset/Equipment name
        {
          type: "text",
          text: String(payload.assetName || "-"),
          size: "sm",
          color: "#9CA3AF"
        },
        { type: "separator", margin: "md" },

        // Key-value information
        {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            createKeyValueRow("Problem", payload.problem),
            //createKeyValueRow("Action by", payload.actionBy),
            ...(payload.extraKVs || []).map(({ label, value }) => 
              createKeyValueRow(label, value)
            )
          ]
        },

        { type: "separator", margin: "md" },

        // Comment section
        ...(payload.comment
          ? [
              { type: "text", text: "Comment", size: "sm", color: "#6B7280" },
              {
                type: "text",
                text: String(payload.comment),
                size: "sm",
                wrap: true,
                color: "#374151"
              }
            ]
          : []),

        // Call button (optional)
        ...(includeCallButton && payload.callUri
          ? [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#F3F4F6",
                cornerRadius: "6px",
                paddingAll: "12px",
                margin: "md",
                action: {
                  type: "uri",
                  label: "Call",
                  uri: payload.callUri
                },
                contents: [
                  {
                    type: "text",
                    text: "Call",
                    size: "sm",
                    align: "center",
                    color: "#374151",
                    weight: "bold"
                  }
                ]
              }
            ]
          : []),

        // View details button
        ...(includeViewDetailsButton
          ? [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#000099",
                cornerRadius: "6px",
                paddingAll: "12px",
                margin: "md",
                action: {
                  type: "uri",
                  label: "View details",
                  uri: payload.detailUrl || "https://example.com"
                },
                contents: [
                  {
                    type: "text",
                    text: "View details",
                    size: "sm",
                    align: "center",
                    color: "#FFFFFF",
                    weight: "bold"
                  }
                ]
              }
            ]
          : [])
      ]
    }
  };

  return {
    type: "flex",
    altText: `[${statusLabel}] ${payload.caseNo || ""}`.trim(),
    contents
  };
}

// ===== LINE SERVICE CLASS =====

/**
 * Professional LINE notification service
 * Handles all LINE API interactions with proper error handling
 */
class TicketNotificationService {
  constructor() {
    this.channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
    //this.apiBase = 'https://api.line.me/v2/bot/message';
    this.apiBase = 'https://default82d7037e747a42f887d16122afc26d.ec.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/4f2b5416fca24dc38c5205a2b077d8e9/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=96wuyaCkrDLJxXhRun-l5qyVH3nqyYYKkHLaQSK4m0c';
    this.timeout = 10000; // 10 seconds
  }

  /**
   * Checks if the service is properly configured
   * @returns {boolean} True if configured
   */
  isConfigured() {
    return !!this.channelAccessToken;
  }

  /**
   * Sends a message to a LINE user
   * @param {string} lineUserId - The LINE user ID
   * @param {Object|Array|string} messages - Message(s) to send
   * @returns {Promise<Object>} Result object with success status
   */
  async sendToUser(lineUserId, messages) {
    try {
      // Validation
      if (!this.isConfigured()) {
        console.warn('LINE_CHANNEL_ACCESS_TOKEN not configured; skipping LINE notification');
        return { success: false, skipped: true, reason: 'not_configured' };
      }

      if (!lineUserId) {
        console.warn('No LineID provided; skipping LINE notification');
        return { success: false, skipped: true, reason: 'no_user_id' };
      }

      if (!isValidLineUserId(lineUserId)) {
        console.error(`Invalid LineID format: ${lineUserId}. Expected format: U followed by 32 characters.`);
        return { success: false, error: 'Invalid LineID format' };
      }

      // Process messages
      const msgArray = Array.isArray(messages) ? messages : [messages];
      const processedMessages = msgArray.map((m) => 
        typeof m === 'string' ? { type: 'text', text: m } : m
      );

      // Send to LINE API
      const payload = {
        line_payload: {
          to: lineUserId,
          messages: processedMessages,
        },
        access_token: this.channelAccessToken,
      };

      console.log('payload :', payload);

      const response = await axios.post(
     //   `${this.apiBase}/push`,
     `${this.apiBase}`,payload
        // payload,
        // {
        //   headers: {
        //     'Content-Type': 'application/json',
        //     Authorization: `Bearer ${this.channelAccessToken}`,
        //   },
        //   timeout: this.timeout,
        // }
      );

      return { 
        success: true, 
        status: response.status,
        messageId: response.data?.messageId 
      };

    } catch (error) {
      console.error('LINE notification error:', {
        message: error?.response?.data || error.message,
        status: error?.response?.status,
        lineUserId: lineUserId?.substring(0, 8) + '...', // Mask for privacy
        timestamp: new Date().toISOString()
      });
      
      return { 
        success: false, 
        error: error.message,
        status: error?.response?.status 
      };
    }
  }

  /**
   * Replies to a LINE webhook event
   * @param {string} replyToken - The reply token from webhook
   * @param {Object|Array|string} messages - Message(s) to send
   * @returns {Promise<Object>} Result object with success status
   */
  async replyToEvent(replyToken, messages) {
    try {
      if (!this.isConfigured()) {
        console.warn('LINE_CHANNEL_ACCESS_TOKEN not configured; skipping LINE reply');
        return { success: false, skipped: true, reason: 'not_configured' };
      }

      if (!replyToken) {
        console.warn('No reply token provided; skipping LINE reply');
        return { success: false, skipped: true, reason: 'no_reply_token' };
      }

      const msgArray = Array.isArray(messages) ? messages : [messages];
      const payload = {
        replyToken,
        messages: msgArray.map((m) => 
          typeof m === 'string' ? { type: 'text', text: m } : m
        ),
      };
      
      const response = await axios.post(`${this.apiBase}/reply`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.channelAccessToken}`,
        },
        timeout: this.timeout,
      });
      
      return { 
        success: true, 
        status: response.status,
        messageId: response.data?.messageId 
      };

    } catch (error) {
      console.error('LINE reply error:', {
        message: error?.response?.data || error.message,
        status: error?.response?.status,
        replyToken: replyToken?.substring(0, 8) + '...', // Mask for privacy
        timestamp: new Date().toISOString()
      });
      
      return { 
        success: false, 
        error: error.message,
        status: error?.response?.status 
      };
    }
  }

  /**
   * Builds a ticket flex message (delegates to main builder)
   * @param {string} state - The ticket state
   * @param {Object} payload - Ticket data payload
   * @param {Object} options - Additional options
   * @returns {Object} LINE flex message object
   */
  buildTicketFlexMessage(state, payload, options = {}) {
    return buildTicketFlexMessage(state, payload, options);
  }
}

// ===== EXPORTS =====

// Create singleton instance
const service = new TicketNotificationService();

module.exports = {
  // Service methods
  sendToUser: (lineUserId, messages) => service.sendToUser(lineUserId, messages),
  replyToEvent: (replyToken, messages) => service.replyToEvent(replyToken, messages),
  buildTicketFlexMessage: (state, payload, options) => service.buildTicketFlexMessage(state, payload, options),
  
  // Constants for use in controllers
  TicketState,
  STATE_COLORS,
  STATE_LABELS_TH,
  STATE_LABELS_EN,
  
  // Utility functions
  isValidLineUserId,
  getStateLabel,
  
  // Export the service class for advanced usage
  TicketNotificationService
};