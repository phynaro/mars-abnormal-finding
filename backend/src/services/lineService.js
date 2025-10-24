/**
 * LINE Webhook Service
 * Professional service for handling LINE webhook events and general LINE operations
 * 
 * Features:
 * - Webhook event processing
 * - User interaction handling
 * - Test message functionality
 * - Signature verification
 * - Error handling and logging
 * 
 * Usage:
 * const lineService = require('./lineService');
 * await lineService.sendTestMessage(userId, message);
 * await lineService.replyToWebhook(replyToken, message);
 */

const axios = require('axios');

/**
 * Professional LINE webhook service
 * Handles LINE API interactions for webhooks and general operations
 */
class LineWebhookService {
  constructor() {
    this.channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
    this.channelSecret = process.env.LINE_CHANNEL_SECRET || '';
    this.apiBase = 'https://api.line.me/v2/bot/message';
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
   * Validates LINE user ID format
   * @param {string} lineUserId - The LINE user ID to validate
   * @returns {boolean} True if valid format
   */
  isValidLineUserId(lineUserId) {
    return typeof lineUserId === 'string' && 
           lineUserId.startsWith('U') && 
           lineUserId.length === 33;
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
        console.warn('LINE service not configured; skipping message send');
        return { success: false, skipped: true, reason: 'not_configured' };
      }

      if (!lineUserId) {
        console.warn('No LineID provided; skipping message send');
        return { success: false, skipped: true, reason: 'no_user_id' };
      }

      if (!this.isValidLineUserId(lineUserId)) {
        console.error(`Invalid LineID format: ${lineUserId}. Expected format: U followed by 32 characters.`);
        return { success: false, error: 'Invalid LineID format' };
      }

      // Process messages
      const msgArray = Array.isArray(messages) ? messages : [messages];
      const processedMessages = [];

      for (const msg of msgArray) {
        if (typeof msg === 'string') {
          processedMessages.push({ type: 'text', text: msg });
        } else if (msg.text && msg.images) {
          // Handle messages with both text and images
          processedMessages.push({ type: 'text', text: msg.text });
          processedMessages.push(...msg.images);
        } else {
          processedMessages.push(msg);
        }
      }

      // Send to LINE API
      const payload = {
        to: lineUserId,
        messages: processedMessages,
      };

      const response = await axios.post(
        `${this.apiBase}/push`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.channelAccessToken}`,
          },
          timeout: this.timeout,
        }
      );

      return { 
        success: true, 
        status: response.status,
        messageId: response.data?.messageId 
      };

    } catch (error) {
      console.error('LINE send error:', {
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
  async replyToWebhook(replyToken, messages) {
    try {
      if (!this.isConfigured()) {
        console.warn('LINE service not configured; skipping webhook reply');
        return { success: false, skipped: true, reason: 'not_configured' };
      }

      if (!replyToken) {
        console.warn('No reply token provided; skipping webhook reply');
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
      console.error('LINE webhook reply error:', {
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
   * Sends a test message to verify LINE integration
   * @param {string} lineUserId - The LINE user ID
   * @param {string} testMessage - Optional custom test message
   * @returns {Promise<Object>} Result object with success status
   */
  async sendTestMessage(lineUserId, testMessage = null) {
    const message = testMessage || 'Test message from CMMS system - LINE integration is working correctly!';
    return await this.sendToUser(lineUserId, message);
  }

  /**
   * Gets user profile information from LINE API
   * @param {string} lineUserId - The LINE user ID
   * @returns {Promise<Object>} User profile or error
   */
  async getUserProfile(lineUserId) {
    try {
      if (!this.isConfigured()) {
        return { success: false, error: 'Service not configured' };
      }

      if (!this.isValidLineUserId(lineUserId)) {
        return { success: false, error: 'Invalid LineID format' };
      }

      console.log('LINE Profile Request:', {
        url: `https://api.line.me/v2/bot/profile/${lineUserId.substring(0, 8)}...`,
        lineUserId: lineUserId.substring(0, 8) + '...'
      });

      const response = await axios.get(
        `https://api.line.me/v2/bot/profile/${lineUserId}`,
        {
          headers: {
            Authorization: `Bearer ${this.channelAccessToken}`,
          },
          timeout: this.timeout,
        }
      );

      return { 
        success: true, 
        profile: response.data 
      };

    } catch (error) {
      console.error('LINE profile fetch error:', {
        message: error?.response?.data || error.message,
        status: error?.response?.status,
        lineUserId: lineUserId?.substring(0, 8) + '...',
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
   * Verifies webhook signature for security
   * @param {string} signature - The signature from webhook headers
   * @param {string} body - The raw request body
   * @returns {boolean} True if signature is valid
   */
  verifyWebhookSignature(signature, body) {
    try {
      if (!this.channelSecret || !signature || !body) {
        console.warn('Missing signature verification parameters');
        return false;
      }

      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', this.channelSecret);
      hmac.update(body);
      const digest = hmac.digest('base64');
      
      return digest === signature;
    } catch (error) {
      console.error('Signature verification error:', error.message);
      return false;
    }
  }

  /**
   * Processes incoming webhook events
   * @param {Object} event - The webhook event object
   * @returns {Promise<Object>} Processing result
   */
  async processWebhookEvent(event) {
    try {
      if (!event || !event.type) {
        return { success: false, error: 'Invalid event object' };
      }

      switch (event.type) {
        case 'message':
          return await this.handleMessageEvent(event);
        case 'follow':
          return await this.handleFollowEvent(event);
        case 'unfollow':
          return await this.handleUnfollowEvent(event);
        case 'postback':
          return await this.handlePostbackEvent(event);
        default:
          console.log(`Unhandled event type: ${event.type}`);
          return { success: true, handled: false, eventType: event.type };
      }
    } catch (error) {
      console.error('Webhook event processing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handles message events from webhook
   * @param {Object} event - The message event
   * @returns {Promise<Object>} Handling result
   */
  async handleMessageEvent(event) {
    const { message, replyToken, source } = event;
    
    if (message.type === 'text') {
      // Handle text messages
      const response = `You sent: "${message.text}"`;
      return await this.replyToWebhook(replyToken, response);
    }
    
    return { success: true, handled: false, messageType: message.type };
  }

  /**
   * Handles follow events (when user adds the bot)
   * @param {Object} event - The follow event
   * @returns {Promise<Object>} Handling result
   */
  async handleFollowEvent(event) {
    const { replyToken } = event;
    const welcomeMessage = 'Welcome to CMMS! Thank you for adding our bot.';
    return await this.replyToWebhook(replyToken, welcomeMessage);
  }

  /**
   * Handles unfollow events (when user removes the bot)
   * @param {Object} event - The unfollow event
   * @returns {Promise<Object>} Handling result
   */
  async handleUnfollowEvent(event) {
    // No reply needed for unfollow events
    console.log('User unfollowed the bot');
    return { success: true, handled: true };
  }

  /**
   * Handles postback events (button clicks, etc.)
   * @param {Object} event - The postback event
   * @returns {Promise<Object>} Handling result
   */
  async handlePostbackEvent(event) {
    const { postback, replyToken } = event;
    const response = `Postback received: ${postback.data}`;
    return await this.replyToWebhook(replyToken, response);
  }
}

// ===== EXPORTS =====

// Create singleton instance
const service = new LineWebhookService();

module.exports = {
  // Service methods
  sendToUser: (lineUserId, messages) => service.sendToUser(lineUserId, messages),
  replyToWebhook: (replyToken, messages) => service.replyToWebhook(replyToken, messages),
  sendTestMessage: (lineUserId, testMessage) => service.sendTestMessage(lineUserId, testMessage),
  getUserProfile: (lineUserId) => service.getUserProfile(lineUserId),
  verifyWebhookSignature: (signature, body) => service.verifyWebhookSignature(signature, body),
  processWebhookEvent: (event) => service.processWebhookEvent(event),
  
  // Utility methods
  isValidLineUserId: (lineUserId) => service.isValidLineUserId(lineUserId),
  isConfigured: () => service.isConfigured(),
  
  // Export the service class for advanced usage
  LineWebhookService
};