const sql = require('mssql');
const dbConfig = require('../config/dbConfig');
const abnFlexService = require('./abnormalFindingFlexService');
const { getCriticalLevelText } = require('../utils/criticalMapping');
const {
  addStatusChangeComment,
  getFrontendBaseUrl,
  getNotificationApproversWithLineId,
  insertStatusHistory,
} = require('../controllers/ticketController/helpers');

const AUTO_ESCALATION_NOTE = 'Automatically escalated to L4 after 7 days without requester review';

class ReviewEscalationNotificationService {
  buildCarouselFromTickets(tickets, options = {}) {
    const { language = 'th' } = options;

    if (!tickets || tickets.length === 0) {
      return null;
    }

    const bubbles = tickets.slice(0, 10).map((ticket) => {
      let heroImageUrl = null;
      if (ticket.image_url) {
        heroImageUrl = `${getFrontendBaseUrl()}${ticket.image_url}`;
      }

      const extraKVs = [
        { label: 'Critical Level', value: getCriticalLevelText(ticket.pucriticalno) },
        { label: 'Status', value: 'REVIEW ESCALATED' },
        { label: 'Escalation Rule', value: 'No requester review for 7 days' },
      ];

      if (ticket.ticket_class_th || ticket.ticket_class_en) {
        extraKVs.push({
          label: 'Ticket Class',
          value: ticket.ticket_class_th || ticket.ticket_class_en,
        });
      }

      if (ticket.finished_at) {
        extraKVs.push({
          label: 'Finished At',
          value: new Date(ticket.finished_at).toLocaleString('th-TH'),
        });
      }

      return abnFlexService.buildTicketFlexMessage(
        abnFlexService.TicketState.ESCALATED,
        {
          caseNo: ticket.ticket_number || '-',
          assetName: ticket.equipment_name || ticket.pudescription || 'Unknown Asset',
          problem: ticket.title || '-',
          comment: ticket.description || '-',
          heroImageUrl,
          detailUrl: `${process.env.LIFF_URL || getFrontendBaseUrl()}/tickets/${ticket.id}`,
          extraKVs,
        },
        { language, includeViewDetailsButton: true, includeHeroImage: !!heroImageUrl }
      ).contents;
    });

    return {
      type: 'flex',
      altText: `มีเคสที่หมดเวลารอตรวจรับและถูกส่งต่อให้ L4 ${tickets.length} รายการ`,
      contents: {
        type: 'carousel',
        contents: bubbles,
      },
    };
  }

  async getExpiredFinishedTickets() {
    try {
      const pool = await sql.connect(dbConfig);
      const result = await pool.request().query(`
        SELECT
          t.id,
          t.ticket_number,
          t.title,
          t.description,
          t.status,
          t.created_by,
          t.assigned_to,
          t.finished_by,
          t.finished_at,
          t.actual_finish_at,
          t.updated_at,
          t.puno,
          t.pucriticalno,
          pe.pudescription,
          eq.EQNAME as equipment_name,
          tc.name_en as ticket_class_en,
          tc.name_th as ticket_class_th,
          img.image_url
        FROM IgxTickets t
        LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
        LEFT JOIN IgxPUExtension pe ON pu.PUNO = pe.puno
        LEFT JOIN EQ eq ON t.equipment_id = eq.EQNO AND eq.FLAGDEL = 'F'
        LEFT JOIN IgxTicketClass tc ON t.ticketClass = tc.id
        LEFT JOIN (
          SELECT
            ticket_id,
            image_url,
            ROW_NUMBER() OVER (PARTITION BY ticket_id ORDER BY uploaded_at ASC) as rn
          FROM IgxTicketImages
          WHERE image_type = 'after'
        ) img ON img.ticket_id = t.id AND img.rn = 1
        WHERE t.status = 'finished'
          AND COALESCE(t.finished_at, t.actual_finish_at, t.updated_at) < DATEADD(day, -7, GETDATE())
        ORDER BY COALESCE(t.finished_at, t.actual_finish_at, t.updated_at) ASC
      `);

      return result.recordset || [];
    } catch (error) {
      console.error('Error getting review-escalation candidates:', error);
      return [];
    }
  }

  async escalateTicket(pool, ticket) {
    const changedBy = ticket.finished_by || ticket.assigned_to || ticket.created_by;

    const updateResult = await pool.request()
      .input('id', sql.Int, ticket.id)
      .input('status', sql.VarChar(50), 'review_escalated')
      .query(`
        UPDATE IgxTickets
        SET status = @status,
            updated_at = GETDATE()
        WHERE id = @id
          AND status = 'finished'
      `);

    if (!updateResult.rowsAffected[0]) {
      return false;
    }

    await insertStatusHistory(pool, {
      ticketId: ticket.id,
      oldStatus: 'finished',
      newStatus: 'review_escalated',
      changedBy,
      notes: AUTO_ESCALATION_NOTE,
    });

    await addStatusChangeComment(
      pool,
      ticket.id,
      changedBy,
      'finished',
      'review_escalated',
      AUTO_ESCALATION_NOTE
    );

    return true;
  }

  async sendNotifications(options = {}) {
    try {
      console.log('📬 Starting review escalation notification process...');

      const tickets = await this.getExpiredFinishedTickets();
      if (tickets.length === 0) {
        console.log('⚠️  No expired finished tickets found');
        return {
          success: true,
          totalTickets: 0,
          escalated: 0,
          sent: 0,
          failed: 0,
          skipped: 0,
        };
      }

      const pool = await sql.connect(dbConfig);
      const approverToTickets = new Map();
      let escalated = 0;
      let skipped = 0;

      for (const ticket of tickets) {
        try {
          const didEscalate = await this.escalateTicket(pool, ticket);
          if (!didEscalate) {
            skipped += 1;
            continue;
          }

          escalated += 1;

          const approvers = await getNotificationApproversWithLineId(pool, ticket.puno, 4, null);
          const lineApprovers = (approvers || []).filter((approver) => approver.LineID);

          for (const approver of lineApprovers) {
            const key = approver.PERSONNO;
            if (!approverToTickets.has(key)) {
              approverToTickets.set(key, {
                PERSONNO: approver.PERSONNO,
                PERSON_NAME: approver.PERSON_NAME,
                LineID: approver.LineID,
                tickets: [],
              });
            }

            const existingTickets = approverToTickets.get(key).tickets;
            if (!existingTickets.find((mappedTicket) => mappedTicket.id === ticket.id)) {
              existingTickets.push({ ...ticket, status: 'review_escalated' });
            }
          }
        } catch (ticketError) {
          skipped += 1;
          console.error(`❌ Error processing review escalation for ticket ${ticket.ticket_number}:`, ticketError);
        }
      }

      if (approverToTickets.size === 0) {
        console.log('⚠️  No L4 approvers with LineID found for escalated review tickets');
        return {
          success: true,
          totalTickets: tickets.length,
          escalated,
          totalApprovers: 0,
          sent: 0,
          failed: 0,
          skipped: skipped + escalated,
        };
      }

      const sendResults = [];
      for (const [, approverInfo] of approverToTickets) {
        const carousel = this.buildCarouselFromTickets(approverInfo.tickets, options);
        if (!carousel) {
          sendResults.push({
            PERSONNO: approverInfo.PERSONNO,
            success: false,
            skipped: true,
            reason: 'no_carousel',
          });
          continue;
        }

        try {
          const result = await abnFlexService.sendToUser(approverInfo.LineID, [carousel]);
          sendResults.push({
            PERSONNO: approverInfo.PERSONNO,
            success: !!result.success,
            ticketCount: approverInfo.tickets.length,
          });
        } catch (sendError) {
          console.error(`❌ Error sending review escalation to approver ${approverInfo.PERSONNO}:`, sendError);
          sendResults.push({
            PERSONNO: approverInfo.PERSONNO,
            success: false,
            error: sendError.message,
          });
        }
      }

      const summary = {
        success: true,
        totalTickets: tickets.length,
        escalated,
        totalApprovers: approverToTickets.size,
        sent: sendResults.filter((result) => result.success).length,
        failed: sendResults.filter((result) => result.success === false && !result.skipped).length,
        skipped: skipped + sendResults.filter((result) => result.skipped).length,
        results: sendResults,
      };

      console.log('✅ Review escalation notification process completed:', summary);
      return summary;
    } catch (error) {
      console.error('Error in review escalation notification process:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

const service = new ReviewEscalationNotificationService();

module.exports = {
  sendNotifications: (options) => service.sendNotifications(options),
  getExpiredFinishedTickets: () => service.getExpiredFinishedTickets(),
  ReviewEscalationNotificationService,
};
