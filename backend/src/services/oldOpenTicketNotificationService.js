/**
 * Old Open Ticket Notification Service
 * Sends LINE notifications to L2 and L3 approvers for tickets with status='open' created more than 24 hours ago
 * 
 * Features:
 * - Query tickets with status 'open' and created_at < 24 hours ago
 * - Get L2 and L3 approvers for each ticket using getNotificationApproversWithLineId
 * - Send LINE carousel notifications to approvers (one carousel per approver with all their tickets)
 * - Deduplicate notifications per user
 * 
 * Usage:
 * const notificationService = require('./oldOpenTicketNotificationService');
 * await notificationService.sendNotifications();
 */

const sql = require('mssql');
const dbConfig = require('../config/dbConfig');
const abnFlexService = require('./abnormalFindingFlexService');
const { getCriticalLevelText } = require('../utils/criticalMapping');
const { getFrontendBaseUrl, getNotificationApproversWithLineId } = require('../controllers/ticketController/helpers');

class OldOpenTicketNotificationService {
  /**
   * Build a LINE carousel message from an array of tickets
   * Each ticket becomes a bubble (max 10)
   */
  buildCarouselFromTickets(tickets, options = {}) {
    const { language = 'th' } = options;

    if (!tickets || tickets.length === 0) {
      return null;
    }

    const bubbles = tickets.slice(0, 10).map((ticket) => {
      // Build hero image URL from ticket's first 'before' image (already joined as image_url)
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

      // Open duration if present
      if (typeof ticket.hours_open === 'number') {
        const hoursOpen = ticket.hours_open;
        const hoursText = hoursOpen >= 24
          ? `${Math.floor(hoursOpen / 24)} วัน ${hoursOpen % 24} ชั่วโมง`
          : `${hoursOpen} ชั่วโมง`;
        extraKVs.push({ label: 'Open Duration', value: `${hoursText} (เกิน 24 ชั่วโมง)` });
      }

      const payload = {
        caseNo: ticket.ticket_number || '-',
        assetName: ticket.equipment_name || ticket.pudescription || 'Unknown Asset',
        problem: ticket.title || '-',
        comment: ticket.description || '-',
        heroImageUrl: heroImageUrl,
        detailUrl: `${process.env.LIFF_URL || getFrontendBaseUrl()}/tickets/${ticket.id}`,
        extraKVs: extraKVs,
      };

      // For "old open" we present as CREATED state
      return abnFlexService.buildTicketFlexMessage(
        abnFlexService.TicketState.CREATED,
        payload,
        { language, includeViewDetailsButton: true, includeHeroImage: true }
      ).contents;
    });

    return {
      type: 'flex',
      altText: `มีเคสที่เปิดค้างเกิน 24 ชั่วโมง ${tickets.length} รายการ`,
      contents: {
        type: 'carousel',
        contents: bubbles,
      },
    };
  }
  /**
   * Get old open tickets (created more than 24 hours ago)
   * @returns {Promise<Array>} Array of ticket objects
   */
  async getOldOpenTickets() {
    try {
      const pool = await sql.connect(dbConfig);

      const result = await pool.request().query(`
        SELECT 
          t.id,
          t.ticket_number,
          t.title,
          t.description,
          t.status,
          t.priority,
          t.created_at,
          t.puno,
          t.pucriticalno,
          pe.pudescription,
          eq.EQNAME as equipment_name,
          img.image_url,
          tc.name_en as ticket_class_en,
          tc.name_th as ticket_class_th,
          DATEDIFF(hour, t.created_at, GETDATE()) as hours_open
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
        WHERE t.status = 'open'
          AND t.created_at < DATEADD(hour, -24, GETDATE())
        ORDER BY t.created_at ASC
      `);

      return result.recordset || [];
    } catch (error) {
      console.error('Error getting old open tickets:', error);
      return [];
    }
  }

  /**
   * Send notification for a single ticket to L2/L3 approvers
   * @param {Object} ticket - Ticket object
   * @param {Array} approvers - Array of approver objects with LineID
   * @returns {Promise<Object>} Result object
   */
  async sendNotificationForTicket(ticket, approvers) {
    try {
      if (!approvers || approvers.length === 0) {
        return {
          success: false,
          skipped: true,
          reason: 'no_l3_approvers',
          ticketId: ticket.id,
          ticketNumber: ticket.ticket_number
        };
      }

      // Filter approvers with LineID
      const lineApprovers = approvers.filter(approver => approver.LineID);

      if (lineApprovers.length === 0) {
        return {
          success: false,
          skipped: true,
          reason: 'no_line_ids',
          ticketId: ticket.id,
          ticketNumber: ticket.ticket_number
        };
      }

      // Build hero image URL
      let heroImageUrl = null;
      if (ticket.image_url) {
        const baseUrl = getFrontendBaseUrl();
        heroImageUrl = `${baseUrl}${ticket.image_url}`;
      }

      // Build extra key-value pairs
      const extraKVs = [
        { label: 'Critical Level', value: getCriticalLevelText(ticket.pucriticalno) }
      ];
      
      if (ticket.ticket_class_th || ticket.ticket_class_en) {
        extraKVs.push({
          label: 'Ticket Class',
          value: ticket.ticket_class_th || ticket.ticket_class_en
        });
      }

      const hoursOpen = ticket.hours_open || 0;
      const hoursText = hoursOpen >= 24 
        ? `${Math.floor(hoursOpen / 24)} วัน ${hoursOpen % 24} ชั่วโมง`
        : `${hoursOpen} ชั่วโมง`;
      
      extraKVs.push({
        label: 'Open Duration',
        value: `${hoursText} (เกิน 24 ชั่วโมง)`
      });

      // Build LINE flex message payload
      const linePayload = {
        caseNo: ticket.ticket_number || '-',
        assetName: ticket.equipment_name || ticket.pudescription || 'Unknown Asset',
        problem: ticket.title || '-',
        comment: `กรุณาตรวจสอบและดำเนินการ\n\n${ticket.description || '-'}`,
        heroImageUrl: heroImageUrl,
        detailUrl: `${process.env.LIFF_URL || getFrontendBaseUrl()}/tickets/${ticket.id}`,
        extraKVs: extraKVs
      };

      // Build flex message
      const flexMessage = abnFlexService.buildTicketFlexMessage(
        abnFlexService.TicketState.CREATED,
        linePayload,
        { language: 'th', includeViewDetailsButton: true, includeHeroImage: !!heroImageUrl }
      );

      // Send notifications to all L3 approvers
      const sendPromises = lineApprovers.map(approver => 
        abnFlexService.sendToUser(approver.LineID, [flexMessage])
      );

      const results = await Promise.all(sendPromises);
      const successful = results.filter(r => r.success).length;

      return {
        success: successful > 0,
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        totalApprovers: lineApprovers.length,
        successful: successful,
        failed: lineApprovers.length - successful
      };
    } catch (error) {
      console.error(`Error sending notification for ticket ${ticket.id}:`, error);
      return {
        success: false,
        error: error.message,
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number
      };
    }
  }

  /**
   * Send notifications for all old open tickets as per-approver carousels
   * @param {Object} options - Options for notification
   * @returns {Promise<Object>} Summary result
   */
  async sendNotifications(options = {}) {
    try {
      console.log('📬 Starting old open ticket notification process...');

      // Get old open tickets
      const tickets = await this.getOldOpenTickets();

      if (tickets.length === 0) {
        console.log('⚠️  No old open tickets found (status=open, created > 24h ago)');
        return {
          success: true,
          totalTickets: 0,
          notificationsSent: 0,
          notificationsFailed: 0,
          skipped: 0
        };
      }

      console.log(`📊 Found ${tickets.length} old open tickets`);

      const pool = await sql.connect(dbConfig);

      // Build map: approver.PersonNo -> { PERSONNO, PERSON_NAME, LineID, tickets: [] }
      const approverToTickets = new Map();

      for (const ticket of tickets) {
        try {
          // Get both L2 and L3 approvers for this ticket
          const [l2Approvers, l3Approvers] = await Promise.all([
            getNotificationApproversWithLineId(pool, ticket.puno, 2, null),
            getNotificationApproversWithLineId(pool, ticket.puno, 3, null)
          ]);

          // Combine L2 and L3 approvers, then filter for LineID
          const allApprovers = [...(l2Approvers || []), ...(l3Approvers || [])];
          const lineApprovers = allApprovers.filter(a => a.LineID);

          // Add ticket to each approver's list (deduplication handled by Map)
          for (const a of lineApprovers) {
            const key = a.PERSONNO;
            if (!approverToTickets.has(key)) {
              approverToTickets.set(key, { PERSONNO: a.PERSONNO, PERSON_NAME: a.PERSON_NAME, LineID: a.LineID, tickets: [] });
            }
            // Avoid adding duplicate tickets to the same approver
            const existingTickets = approverToTickets.get(key).tickets;
            if (!existingTickets.find(t => t.id === ticket.id)) {
              approverToTickets.get(key).tickets.push(ticket);
            }
          }
        } catch (error) {
          console.error(`  ❌ Error mapping approvers for ticket ${ticket.ticket_number}:`, error);
        }
      }

      if (approverToTickets.size === 0) {
        console.log('⚠️  No L2/L3 approvers with LineID found for any ticket');
        return {
          success: true,
          totalTickets: tickets.length,
          notificationsSent: 0,
          notificationsFailed: 0,
          skipped: tickets.length
        };
      }

      // Send one carousel per approver
      const sendResults = [];
      for (const [, info] of approverToTickets) {
        const carousel = this.buildCarouselFromTickets(info.tickets, { language: 'th' });
        if (!carousel) {
          sendResults.push({ PERSONNO: info.PERSONNO, success: false, skipped: true, reason: 'no_carousel' });
          continue;
        }
        try {
          const result = await abnFlexService.sendToUser(info.LineID, [carousel]);
          sendResults.push({ PERSONNO: info.PERSONNO, success: !!result.success, ticketCount: info.tickets.length });
        } catch (error) {
          console.error(`  ❌ Error sending to approver ${info.PERSONNO}:`, error);
          sendResults.push({ PERSONNO: info.PERSONNO, success: false, error: error.message });
        }
      }

      const summary = {
        success: true,
        totalTickets: tickets.length,
        totalApprovers: approverToTickets.size,
        sent: sendResults.filter(r => r.success).length,
        failed: sendResults.filter(r => r.success === false && !r.skipped).length,
        skipped: sendResults.filter(r => r.skipped).length,
        results: sendResults,
      };

      console.log('✅ Old open ticket notification process completed:', summary);

      return summary;
    } catch (error) {
      console.error('Error in sendNotifications:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// ===== EXPORTS =====

// Create singleton instance
const service = new OldOpenTicketNotificationService();

module.exports = {
  // Main method
  sendNotifications: (options) => service.sendNotifications(options),
  getOldOpenTickets: () => service.getOldOpenTickets(),
  
  // Export service class for advanced usage
  OldOpenTicketNotificationService
};

