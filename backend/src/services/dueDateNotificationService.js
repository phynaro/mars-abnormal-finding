/**
 * Due Date Notification Service
 * Sends LINE carousel notifications to assigned users about tickets due within 3 days or overdue.
 *
 * Features:
 * - Query tickets with status 'planed' or 'in_progress' assigned to users
 * - Filter: due within 3 days or already overdue (current_date - due_date > -3)
 * - Order by most late ticket first (schedule_finish ASC)
 * - Max 10 tickets per user
 * - Status label: "Overdue" for late, "Due Soon" for upcoming due
 *
 * Usage:
 * const dueDateNotificationService = require('./dueDateNotificationService');
 * await dueDateNotificationService.sendToAllUsers();
 * await dueDateNotificationService.sendToSpecificUser(userId);
 */

const sql = require('mssql');
const dbConfig = require('../config/dbConfig');
const abnFlexService = require('./abnormalFindingFlexService');
const { getCriticalLevelText } = require('../utils/criticalMapping');
const { getFrontendBaseUrl } = require('../controllers/ticketController/helpers');
const TicketState = require('./abnormalFindingFlexService').TicketState;

// ===== HELPER FUNCTIONS =====

/**
 * Get display status for due-date notification: Overdue or Due Soon
 * @param {Date|string} scheduleFinish - Ticket schedule_finish
 * @returns {string} OVERDUE or DUE_SOON
 */
const getDueDateDisplayStatus = (scheduleFinish) => {
  if (!scheduleFinish) return TicketState.DUE_SOON;
  const due = new Date(scheduleFinish);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today ? TicketState.OVERDUE : TicketState.DUE_SOON;
};

/**
 * Builds LINE carousel message from due-date tickets
 * @param {Array} tickets - Array of ticket objects (with schedule_finish)
 * @param {Object} options - Additional options
 * @returns {Object} LINE carousel message object
 */
const buildCarouselFromDueDateTickets = (tickets, options = {}) => {
  const { language = 'th' } = options;

  if (!tickets || tickets.length === 0) {
    return null;
  }

  const bubbles = tickets.slice(0, 10).map((ticket) => {
    let heroImageUrl = null;
    if (ticket.image_url) {
      const baseUrl = getFrontendBaseUrl();
      heroImageUrl = `${baseUrl}${ticket.image_url}`;
    }

    const dueStatus = getDueDateDisplayStatus(ticket.schedule_finish);

    const extraKVs = [
      { label: 'Critical Level', value: getCriticalLevelText(ticket.pucriticalno) },
      {
        label: 'Due Date',
        value: ticket.schedule_finish
          ? new Date(ticket.schedule_finish).toLocaleString('th-TH')
          : '-'
      }
    ];

    if (ticket.ticket_class_th || ticket.ticket_class_en) {
      extraKVs.push({
        label: 'Ticket Class',
        value: ticket.ticket_class_th || ticket.ticket_class_en
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
      dueStatus,
      payload,
      { language: 'th', includeViewDetailsButton: true, includeHeroImage: true }
    ).contents;
  });

  return {
    type: 'flex',
    altText: `คุณมีงานใกล้ครบกำหนดหรือเกินกำหนด ${tickets.length} รายการ`,
    contents: {
      type: 'carousel',
      contents: bubbles
    }
  };
};

// ===== MAIN SERVICE CLASS =====

class DueDateNotificationService {
  /**
   * Get due-date tickets for a specific user (due within 3 days or overdue, max 10, order by most late)
   * Condition: current_date - due_date > -3  =>  due_date <= current_date + 3
   * @param {number} userId - User ID (Person.PERSONNO)
   * @returns {Promise<Array>} Array of ticket objects
   */
  async getDueDateTicketsForUser(userId) {
    try {
      const pool = await sql.connect(dbConfig);

      const result = await pool
        .request()
        .input('userId', sql.Int, userId)
        .query(`
          SELECT TOP 10
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
            SELECT ticket_id, image_url, ROW_NUMBER() OVER (PARTITION BY ticket_id ORDER BY uploaded_at ASC) as rn
            FROM IgxTicketImages
            WHERE image_type = 'before'
          ) img ON img.ticket_id = t.id AND img.rn = 1
          WHERE t.assigned_to = @userId
            AND t.status IN ('planed', 'in_progress')
            AND t.schedule_finish IS NOT NULL
            AND CAST(t.schedule_finish AS DATE) <= DATEADD(day, 3, CAST(GETDATE() AS DATE))
          ORDER BY t.schedule_finish ASC, t.created_at DESC
        `);

      return result.recordset || [];
    } catch (error) {
      console.error('Error getting due-date tickets for user:', error);
      return [];
    }
  }

  /**
   * Get all users with due-date tickets and their LINE IDs
   * @returns {Promise<Array>} Array of user objects with tickets
   */
  async getAllUsersWithDueDateTickets() {
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
          AND t.status IN ('planed', 'in_progress')
          AND t.schedule_finish IS NOT NULL
          AND CAST(t.schedule_finish AS DATE) <= DATEADD(day, 3, CAST(GETDATE() AS DATE))
          AND p.FLAGDEL != 'Y'
          AND ue.LineID IS NOT NULL
      `);

      const usersWithTickets = await Promise.all(
        (result.recordset || []).map(async (user) => {
          const tickets = await this.getDueDateTicketsForUser(user.PERSONNO);
          return {
            ...user,
            tickets
          };
        })
      );

      return usersWithTickets.filter((user) => user.tickets.length > 0);
    } catch (error) {
      console.error('Error getting users with due-date tickets:', error);
      return [];
    }
  }

  /**
   * Send due-date notification to a specific user
   * @param {number} userId - User ID
   * @param {string} lineId - LINE user ID
   * @param {Array} tickets - Optional tickets array (if not provided, will query)
   * @returns {Promise<Object>} Result object
   */
  async sendDueDateNotification(userId, lineId, tickets = null) {
    try {
      if (!tickets) {
        tickets = await this.getDueDateTicketsForUser(userId);
      }

      if (tickets.length === 0) {
        return {
          success: false,
          skipped: true,
          reason: 'no_due_date_tickets'
        };
      }

      const carouselMessage = buildCarouselFromDueDateTickets(tickets);

      if (!carouselMessage) {
        return {
          success: false,
          skipped: true,
          reason: 'failed_to_build_carousel'
        };
      }

      const result = await abnFlexService.sendToUser(lineId, [carouselMessage]);

      return {
        ...result,
        userId,
        lineId,
        ticketCount: tickets.length
      };
    } catch (error) {
      console.error('Error sending due-date notification:', error);
      return {
        success: false,
        error: error.message,
        userId
      };
    }
  }

  /**
   * Send due-date notifications to all users
   * @param {Object} options - Options for notification
   * @returns {Promise<Object>} Summary result
   */
  async sendToAllUsers(options = {}) {
    try {
      console.log('📬 Starting batch due-date notification...');

      const usersWithTickets = await this.getAllUsersWithDueDateTickets();

      if (usersWithTickets.length === 0) {
        console.log('⚠️  No users with due-date tickets found');
        return {
          success: true,
          totalUsers: 0,
          sent: 0,
          failed: 0,
          skipped: 0
        };
      }

      console.log(`📊 Found ${usersWithTickets.length} users with due-date tickets`);

      const results = await Promise.all(
        usersWithTickets.map(async (user) => {
          return await this.sendDueDateNotification(
            user.PERSONNO,
            user.LineID,
            user.tickets
          );
        })
      );

      const summary = {
        success: true,
        totalUsers: usersWithTickets.length,
        sent: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success && !r.skipped).length,
        skipped: results.filter((r) => r.skipped).length,
        results
      };

      console.log('✅ Batch due-date notification completed:', summary);

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
   * Send due-date notification to a specific user (on-demand)
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Result object
   */
  async sendToSpecificUser(userId) {
    try {
      const pool = await sql.connect(dbConfig);

      const userResult = await pool
        .request()
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

      return await this.sendDueDateNotification(userId, user.LineID);
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

const service = new DueDateNotificationService();

module.exports = {
  sendToAllUsers: (options) => service.sendToAllUsers(options),
  sendToSpecificUser: (userId) => service.sendToSpecificUser(userId),
  getDueDateTicketsForUser: (userId) => service.getDueDateTicketsForUser(userId),
  getAllUsersWithDueDateTickets: () => service.getAllUsersWithDueDateTickets(),

  getDueDateDisplayStatus,
  DueDateNotificationService
};
