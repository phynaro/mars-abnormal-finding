/**
 * Finished Ticket Review Notification Service
 * Sends LINE carousel notifications to requesters (created_by) to review their tickets with status = 'finished'
 *
 * Features:
 * - Query tickets with status 'finished', group by requester (created_by)
 * - Build LINE carousel messages with up to 10 tickets per requester
 * - Send notifications to requesters via LINE
 * - Batch processing for all requesters with LineID
 *
 * Usage:
 * const service = require('./finishedTicketReviewNotificationService');
 * await service.sendToAllUsers();
 */

const sql = require('mssql');
const dbConfig = require('../config/dbConfig');
const abnFlexService = require('./abnormalFindingFlexService');
const { getCriticalLevelText } = require('../utils/criticalMapping');
const { getFrontendBaseUrl } = require('../controllers/ticketController/helpers');

const TicketState = abnFlexService.TicketState;

// ===== HELPER FUNCTIONS =====

/**
 * Builds LINE carousel message from finished tickets (for requester review)
 * @param {Array} tickets - Array of ticket objects
 * @param {Object} options - Additional options
 * @returns {Object} LINE carousel message object
 */
const buildCarouselFromFinishedTickets = (tickets, options = {}) => {
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

    const extraKVs = [
      { label: 'Critical Level', value: getCriticalLevelText(ticket.pucriticalno) }
    ];

    if (ticket.ticket_class_th || ticket.ticket_class_en) {
      extraKVs.push({
        label: 'Ticket Class',
        value: ticket.ticket_class_th || ticket.ticket_class_en
      });
    }

    if (ticket.actual_finish_at) {
      extraKVs.push({
        label: 'Finished At',
        value: new Date(ticket.actual_finish_at).toLocaleString('th-TH')
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
      TicketState.FINISHED,
      payload,
      { language, includeViewDetailsButton: true, includeHeroImage: true }
    ).contents;
  });

  return {
    type: 'flex',
    altText: `คุณมีเคสที่เสร็จสิ้นรอการตรวจสอบ ${tickets.length} รายการ`,
    contents: {
      type: 'carousel',
      contents: bubbles
    }
  };
};

// ===== MAIN SERVICE CLASS =====

class FinishedTicketReviewNotificationService {
  /**
   * Get finished tickets for a specific requester (created_by)
   * @param {number} userId - User ID (Person.PERSONNO, requester)
   * @returns {Promise<Array>} Array of ticket objects
   */
  async getFinishedTicketsForRequester(userId) {
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
            t.actual_finish_at,
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
          WHERE t.created_by = @userId
            AND t.status = 'finished'
          ORDER BY COALESCE(t.actual_finish_at, t.updated_at) DESC
        `);

      return result.recordset || [];
    } catch (error) {
      console.error('Error getting finished tickets for requester:', error);
      return [];
    }
  }

  /**
   * Get all requesters with finished tickets and their LINE IDs
   * @returns {Promise<Array>} Array of user objects with finished tickets
   */
  async getAllRequestersWithFinishedTickets() {
    try {
      const pool = await sql.connect(dbConfig);

      const result = await pool.request().query(`
        SELECT DISTINCT
          p.PERSONNO,
          p.PERSON_NAME,
          ue.LineID
        FROM IgxTickets t
        INNER JOIN Person p ON t.created_by = p.PERSONNO
        LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
        LEFT JOIN IgxUserExtension ue ON u.UserID = ue.UserID
        WHERE t.created_by IS NOT NULL
          AND t.status = 'finished'
          AND p.FLAGDEL != 'Y'
          AND ue.LineID IS NOT NULL
      `);

      const requestersWithTickets = await Promise.all(
        (result.recordset || []).map(async (user) => {
          const tickets = await this.getFinishedTicketsForRequester(user.PERSONNO);
          return {
            ...user,
            tickets
          };
        })
      );

      return requestersWithTickets.filter((r) => r.tickets.length > 0);
    } catch (error) {
      console.error('Error getting requesters with finished tickets:', error);
      return [];
    }
  }

  /**
   * Send finished-ticket review notification to a specific requester
   * @param {number} userId - Requester user ID
   * @param {string} lineId - LINE user ID
   * @param {Array} tickets - Optional tickets array (if not provided, will query)
   * @returns {Promise<Object>} Result object
   */
  async sendFinishedTicketReviewNotification(userId, lineId, tickets = null) {
    try {
      if (!tickets) {
        tickets = await this.getFinishedTicketsForRequester(userId);
      }

      if (tickets.length === 0) {
        return {
          success: false,
          skipped: true,
          reason: 'no_finished_tickets'
        };
      }

      const carouselMessage = buildCarouselFromFinishedTickets(tickets);

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
      console.error('Error sending finished ticket review notification:', error);
      return {
        success: false,
        error: error.message,
        userId
      };
    }
  }

  /**
   * Send finished-ticket review notifications to all requesters
   * @param {Object} options - Options for notification
   * @returns {Promise<Object>} Summary result
   */
  async sendToAllUsers(options = {}) {
    try {
      console.log('📬 Starting batch finished ticket review notification...');

      const requestersWithTickets = await this.getAllRequestersWithFinishedTickets();

      if (requestersWithTickets.length === 0) {
        console.log('⚠️  No requesters with finished tickets found');
        return {
          success: true,
          totalUsers: 0,
          sent: 0,
          failed: 0,
          skipped: 0
        };
      }

      console.log(`📊 Found ${requestersWithTickets.length} requesters with finished tickets`);

      const results = await Promise.all(
        requestersWithTickets.map(async (user) =>
          this.sendFinishedTicketReviewNotification(user.PERSONNO, user.LineID, user.tickets)
        )
      );

      const summary = {
        success: true,
        totalUsers: requestersWithTickets.length,
        sent: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success && !r.skipped).length,
        skipped: results.filter((r) => r.skipped).length,
        results
      };

      console.log('✅ Batch finished ticket review notification completed:', summary);

      return summary;
    } catch (error) {
      console.error('Error in sendToAllUsers:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// ===== EXPORTS =====

const service = new FinishedTicketReviewNotificationService();

module.exports = {
  sendToAllUsers: (options) => service.sendToAllUsers(options),
  getFinishedTicketsForRequester: (userId) => service.getFinishedTicketsForRequester(userId),
  getAllRequestersWithFinishedTickets: () => service.getAllRequestersWithFinishedTickets(),
  FinishedTicketReviewNotificationService
};
