/**
 * Abnormal Finding Flex Message Service
 * Clean implementation based on flexmessge-design.md
 * 
 * Usage:
 * const flexService = require('./abnormalFindingFlexService');
 * const msg = flexService.buildAbnFlexMinimal(flexService.AbnCaseState.CREATED, payload);
 * await flexService.pushToUser(lineUserId, msg);
 */

const axios = require('axios');

// ===== CONSTANTS =====

const AbnCaseState = Object.freeze({
  CREATED: "CREATED",
  ACCEPTED: "ACCEPTED",
  REJECT_TO_MANAGER: "REJECT_TO_MANAGER",
  REJECT_FINAL: "REJECT_FINAL",
  COMPLETED: "COMPLETED",
  REASSIGNED: "REASSIGNED",
  ESCALATED: "ESCALATED",
  CLOSED: "CLOSED",
  REOPENED: "REOPENED",
});

// 🎨 สีของแต่ละสถานะ
const stateColorMap = Object.freeze({
  [AbnCaseState.CREATED]: "#0EA5E9",          // blue
  [AbnCaseState.ACCEPTED]: "#22C55E",         // green
  [AbnCaseState.REJECT_TO_MANAGER]: "#F59E0B",// amber
  [AbnCaseState.REJECT_FINAL]: "#EF4444",     // red
  [AbnCaseState.COMPLETED]: "#10B981",        // emerald
  [AbnCaseState.REASSIGNED]: "#A855F7",       // violet
  [AbnCaseState.ESCALATED]: "#FB7185",        // rose
  [AbnCaseState.CLOSED]: "#64748B",           // slate
  [AbnCaseState.REOPENED]: "#F97316",         // orange
});

// Thai status labels
const stateLabels = Object.freeze({
  [AbnCaseState.CREATED]: "สร้างเคสใหม่",
  [AbnCaseState.ACCEPTED]: "รับงาน",
  [AbnCaseState.REJECT_TO_MANAGER]: "ปฏิเสธ รอการอนุมัติจากหัวหน้างาน",
  [AbnCaseState.REJECT_FINAL]: "ปฏิเสธขั้นสุดท้าย",
  [AbnCaseState.COMPLETED]: "เสร็จสิ้น",
  [AbnCaseState.REASSIGNED]: "มอบหมายใหม่",
  [AbnCaseState.ESCALATED]: "ส่งต่อให้หัวหน้างาน",
  [AbnCaseState.CLOSED]: "ปิดเคส",
  [AbnCaseState.REOPENED]: "เปิดเคสใหม่",
});

// ===== HELPER FUNCTIONS =====

const kvRow = (label, value) => ({
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

// ===== MAIN FLEX MESSAGE BUILDER =====

function buildAbnFlexMinimal(state, payload) {
  const statusColor = stateColorMap[state] || "#6B7280";
  const statusLabel = stateLabels[state] || state;

  const contents = {
    type: "bubble",
    // Add hero image if provided
    ...(payload.heroImageUrl ? {
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
        // สถานะ
        {
          type: "text",
          text: statusLabel,
          size: "sm",
          weight: "bold",
          color: statusColor
        },
        // Case No
        {
          type: "text",
          text: String(payload.caseNo || "-"),
          size: "xl",
          weight: "bold"
        },
        // Asset
        {
          type: "text",
          text: String(payload.assetName || "-"),
          size: "sm",
          color: "#9CA3AF"
        },
        { type: "separator", margin: "md" },

        // Body key-value
        {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            kvRow("Problem", payload.problem),
            kvRow("Action by", payload.actionBy),
            ...(payload.extraKVs || []).map(({ label, value }) => kvRow(label, value))
          ]
        },

        { type: "separator", margin: "md" },

        // Comment
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

        // Call button
        ...(payload.callUri
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
        {
          type: "box",
          layout: "vertical",
          backgroundColor: "#F3F4F6",
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
              color: "#374151",
              weight: "bold"
            }
          ]
        }
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

class AbnormalFindingFlexService {
  constructor() {
    this.channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
    this.apiBase = 'https://api.line.me/v2/bot/message';
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

      if (typeof lineUserId !== 'string' || !lineUserId.startsWith('U') || lineUserId.length !== 33) {
        console.error(`Invalid LineID format: ${lineUserId}. Expected format: U followed by 32 characters.`);
        return { success: false, error: 'Invalid LineID format' };
      }
      console.log('LINE push messages:', messages);
      // Ensure messages is an array
      const msgArray = Array.isArray(messages) ? messages : [messages];
      
      // Process messages - convert strings to text messages
      const processedMessages = msgArray.map((m) => 
        typeof m === 'string' ? { type: 'text', text: m } : m
      );

      const payload = {
        to: lineUserId,
        messages: processedMessages,
      };
      //console.log('LINE push payload:', payload);
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
      console.error('LINE push error:', error?.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  async replyToUser(replyToken, messages) {
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

  // Main builder method - follows the design doc exactly
  buildAbnFlexMinimal(state, payload) {
    return buildAbnFlexMinimal(state, payload);
  }
}

// ===== EXPORTS =====

// Create a singleton instance
const service = new AbnormalFindingFlexService();

module.exports = {
  // Export the service methods
  buildAbnFlexMinimal: (state, payload) => service.buildAbnFlexMinimal(state, payload),
  pushToUser: (lineUserId, messages) => service.pushToUser(lineUserId, messages),
  replyToUser: (replyToken, messages) => service.replyToUser(replyToken, messages),
  
  // Export constants for use in ticket controller
  AbnCaseState,
  stateColorMap,
  stateLabels,
  
  // Export the service class if needed
  AbnormalFindingFlexService
};
