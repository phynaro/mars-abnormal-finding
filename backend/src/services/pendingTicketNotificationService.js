/**
 * Pending Ticket Notification Service
 * Sends LINE carousel notifications to users about their pending tickets
 * 
 * Features:
 * - Query tickets with status 'in_progress' or 'escalated' assigned to users
 * - Build LINE carousel messages with up to 10 tickets
 * - Send notifications to users via LINE
 * - Batch processing for all users
 * 
 * Usage:
 * const notificationService = require('./pendingTicketNotificationService');
 * await notificationService.sendToAllUsers();
 * await notificationService.sendToSpecificUser(userId);
 */

const sql = require('mssql');
const dbConfig = require('../config/dbConfig');
const abnFlexService = require('./abnormalFindingFlexService');
const { getCriticalLevelText } = require('../utils/criticalMapping');
const { getFrontendBaseUrl } = require('../controllers/ticketController/helpers');

// ===== HELPER FUNCTIONS =====

/**
 * Maps database status to flex service status
 * @param {string} status - Ticket status from database
 * @returns {string} Status for flex service
 */
const mapTicketStatus = (status) => {
  const statusMap = {
    'in_progress': 'IN_PROGRESS',
    'escalated': 'ESCALATED'
  };
  return statusMap[status] || status;
};

/**
 * Builds LINE carousel message from tickets
 * @param {Array} tickets - Array of ticket objects
 * @param {Object} options - Additional options
 * @returns {Object} LINE carousel message object
 */
const buildCarouselFromTickets = (tickets, options = {}) => {
  const { language = 'th' } = options;

  if (!tickets || tickets.length === 0) {
    return null;
  }

  // Build individual bubbles for each ticket (max 10)
  const bubbles = tickets.slice(0, 10).map(ticket => {
    // Build hero image URL from ticket's first 'before' image
    let heroImageUrl = null;
    if (ticket.image_url) {
      const baseUrl = getFrontendBaseUrl();
      heroImageUrl = `${baseUrl}${ticket.image_url}`;
    }

    const extraKVs = [
      { label: 'Critical Level', value: getCriticalLevelText(ticket.pucriticalno) }
    ];
    
    // Add ticket class if present
    if (ticket.ticket_class_th || ticket.ticket_class_en) {
      extraKVs.push({
        label: 'Ticket Class',
        value: ticket.ticket_class_th || ticket.ticket_class_en
      });
    }
    
    // Add scheduled finish if present
    if (ticket.schedule_finish) {
      extraKVs.push({
        label: 'Scheduled Finish',
        value: new Date(ticket.schedule_finish).toLocaleString('th-TH')
      });
    }
    
    const payload = {
      caseNo: ticket.ticket_number || '-',
      assetName: ticket.equipment_name || ticket.pudescription || 'Unknown Asset',
      problem: ticket.title || '-',
      comment: ticket.description || '-',
      heroImageUrl: heroImageUrl,
      detailUrl: `${process.env.LIFF_URL || 'https://example.com'}/tickets/${ticket.id}`,
      extraKVs: extraKVs
    };

    return abnFlexService.buildTicketFlexMessage(
      mapTicketStatus(ticket.status),
      payload,
      { language, includeViewDetailsButton: true, includeHeroImage: true }
    ).contents;
  });

  // Return carousel message
  return {
    type: "flex",
    altText: `คุณมีงานงานรอดำเนินการ ${tickets.length} รายการ`,
    contents: {
      type: "carousel",
      contents: bubbles
    }
  };
};

// ===== MAIN SERVICE CLASS =====

class PendingTicketNotificationService {
  /**
   * Get pending tickets for a specific user
   * @param {number} userId - User ID (Person.PERSONNO)
   * @returns {Promise<Array>} Array of ticket objects
   */
  async getPendingTicketsForUser(userId) {
    try {
      const pool = await sql.connect(dbConfig);

      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
          SELECT 
            t.id,
            t.ticket_number,
            t.title,
            t.description,
            t.status,
            t.priority,
            t.created_at,
            t.updated_at,
            t.schedule_finish,
            t.pucriticalno,
            pe.pudescription,
            eq.EQNAME as equipment_name,
            img.image_url,
            tc.name_en as ticket_class_en,
            tc.name_th as ticket_class_th
          FROM IgxTickets t
          LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
          LEFT JOIN IgxPUExtension pe ON pu.PUNO = pe.puno
          LEFT JOIN EQ eq ON t.equipment_id = eq.EQNO AND eq.FLAGDEL = 'F'
          LEFT JOIN IgxTicketClass tc ON t.ticketClass = tc.id
          LEFT JOIN (
            SELECT 
              ticket_id,
              image_url,
              image_name,
              ROW_NUMBER() OVER (PARTITION BY ticket_id ORDER BY uploaded_at ASC) as rn
            FROM IgxTicketImages
            WHERE image_type = 'before'
          ) img ON img.ticket_id = t.id AND img.rn = 1
          WHERE t.assigned_to = @userId
            AND t.status IN ('in_progress', 'escalated')
          ORDER BY t.schedule_finish ASC, t.created_at DESC
        `);

      return result.recordset || [];
    } catch (error) {
      console.error('Error getting pending tickets for user:', error);
      return [];
    }
  }

  /**
   * Get all users with pending tickets and their LINE IDs
   * @returns {Promise<Array>} Array of user objects with pending tickets
   */
  async getAllUsersWithPendingTickets() {
    try {
      const pool = await sql.connect(dbConfig);

      const result = await pool.request().query(`
        SELECT DISTINCT
          p.PERSONNO,
          p.PERSON_NAME,
          ue.LineID
        FROM IgxTickets t
        INNER JOIN Person p ON t.assigned_to = p.PERSONNO
        LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
        LEFT JOIN IgxUserExtension ue ON u.UserID = ue.UserID
        WHERE t.assigned_to IS NOT NULL
          AND t.status IN ('in_progress', 'escalated')
          AND p.FLAGDEL != 'Y'
          AND ue.LineID IS NOT NULL
      `);

      // For each user, get their pending tickets
      const usersWithTickets = await Promise.all(
        (result.recordset || []).map(async (user) => {
          const tickets = await this.getPendingTicketsForUser(user.PERSONNO);
          return {
            ...user,
            tickets
          };
        })
      );

      // Filter out users with no tickets
      return usersWithTickets.filter(user => user.tickets.length > 0);
    } catch (error) {
      console.error('Error getting users with pending tickets:', error);
      return [];
    }
  }

  /**
   * Send pending ticket notification to a specific user
   * @param {number} userId - User ID
   * @param {string} lineId - LINE user ID
   * @param {Array} tickets - Optional tickets array (if not provided, will query)
   * @returns {Promise<Object>} Result object
   */
  async sendPendingTicketNotification(userId, lineId, tickets = null) {
    try {
      // Get tickets if not provided
      if (!tickets) {
        tickets = await this.getPendingTicketsForUser(userId);
      }

      if (tickets.length === 0) {
        return {
          success: false,
          skipped: true,
          reason: 'no_pending_tickets'
        };
      }

      // Build carousel message
      const carouselMessage = buildCarouselFromTickets(tickets);

      if (!carouselMessage) {
        return {
          success: false,
          skipped: true,
          reason: 'failed_to_build_carousel'
        };
      }

      // Send via LINE
      const result = await abnFlexService.sendToUser(lineId, [carouselMessage]);

      return {
        ...result,
        userId,
        lineId,
        ticketCount: tickets.length
      };
    } catch (error) {
      console.error('Error sending pending ticket notification:', error);
      return {
        success: false,
        error: error.message,
        userId
      };
    }
  }

  /**
   * Send pending ticket notifications to all users
   * @param {Object} options - Options for notification
   * @returns {Promise<Object>} Summary result
   */
  async sendToAllUsers(options = {}) {
    try {
      console.log('📬 Starting batch pending ticket notification...');

      const usersWithTickets = await this.getAllUsersWithPendingTickets();

      if (usersWithTickets.length === 0) {
        console.log('⚠️  No users with pending tickets found');
        return {
          success: true,
          totalUsers: 0,
          sent: 0,
          failed: 0,
          skipped: 0
        };
      }

      console.log(`📊 Found ${usersWithTickets.length} users with pending tickets`);

      const results = await Promise.all(
        usersWithTickets.map(async (user) => {
          return await this.sendPendingTicketNotification(
            user.PERSONNO,
            user.LineID,
            user.tickets
          );
        })
      );

      const summary = {
        success: true,
        totalUsers: usersWithTickets.length,
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success && !r.skipped).length,
        skipped: results.filter(r => r.skipped).length,
        results
      };

      console.log('✅ Batch notification completed:', summary);

      return summary;
    } catch (error) {
      console.error('Error in sendToAllUsers:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send pending ticket notification to a specific user (on-demand)
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Result object
   */
  async sendToSpecificUser(userId) {
    try {
      // Get user's LINE ID
      const pool = await sql.connect(dbConfig);

      const userResult = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
          SELECT p.PERSONNO, p.PERSON_NAME, ue.LineID
          FROM Person p
          LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
          LEFT JOIN IgxUserExtension ue ON u.UserID = ue.UserID
          WHERE p.PERSONNO = @userId
            AND p.FLAGDEL != 'Y'
        `);

      if (userResult.recordset.length === 0) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      const user = userResult.recordset[0];

      if (!user.LineID) {
        return {
          success: false,
          skipped: true,
          reason: 'no_line_id'
        };
      }

      // Send notification
      return await this.sendPendingTicketNotification(userId, user.LineID);
    } catch (error) {
      console.error('Error in sendToSpecificUser:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// ===== EXPORTS =====

// Create singleton instance
const service = new PendingTicketNotificationService();

module.exports = {
  // Main methods
  sendToAllUsers: (options) => service.sendToAllUsers(options),
  sendToSpecificUser: (userId) => service.sendToSpecificUser(userId),
  getPendingTicketsForUser: (userId) => service.getPendingTicketsForUser(userId),
  getAllUsersWithPendingTickets: () => service.getAllUsersWithPendingTickets(),
  
  // Export service class for advanced usage
  PendingTicketNotificationService
};

