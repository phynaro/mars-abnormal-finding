/**
 * Calibration Due Date Notification Service
 * Sends LINE flex message notifications to assigned users about calibration
 * schedules (PMSched where PMCODE contains '-CAL') due within 7 days.
 */

const sql = require('mssql');
const dbConfig = require('../config/dbConfig');
const abnFlexService = require('./abnormalFindingFlexService');

// ===== FLEX MESSAGE BUILDER =====

function urgencyColor(daysUntilDue) {
  if (daysUntilDue <= 1) return '#DC2626'; // red  — due today or tomorrow
  if (daysUntilDue <= 3) return '#D97706'; // amber — 2–3 days
  return '#0D9488';                        // teal  — 4–7 days
}

function daysLabel(daysUntilDue) {
  if (daysUntilDue < 0) return `เกินกำหนด ${Math.abs(daysUntilDue)} วัน`;
  if (daysUntilDue === 0) return 'ครบกำหนดวันนี้';
  if (daysUntilDue === 1) return 'เหลือ 1 วัน';
  return `เหลือ ${daysUntilDue} วัน`;
}

function formatThaiDate(dateValue) {
  if (!dateValue) return '-';
  return new Date(dateValue).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function buildBubble(item) {
  const color = urgencyColor(item.DaysUntilDue);
  const calUrl = `${process.env.LIFF_URL || 'https://example.com'}/dashboard/calibration-v2`;
  const equipName = (item.EquipmentName || item.PMDESC || '-').trim();
  const desc = (item.PMDESC || '').trim();

  const bodyContents = [
    {
      type: 'text',
      text: equipName,
      weight: 'bold',
      size: 'md',
      wrap: true,
      maxLines: 2,
      color: '#111827',
    },
    {
      type: 'text',
      text: item.PMCODE || '-',
      size: 'xs',
      color: '#6B7280',
      wrap: true,
      maxLines: 1,
      margin: 'xs',
    },
    { type: 'separator', margin: 'sm' },
    {
      type: 'box',
      layout: 'baseline',
      margin: 'sm',
      contents: [
        { type: 'text', text: 'สถานะ', size: 'sm', color: '#6B7280', flex: 4 },
        {
          type: 'text',
          text: daysLabel(item.DaysUntilDue),
          size: 'sm',
          weight: 'bold',
          color,
          flex: 6,
          align: 'end',
        },
      ],
    },
    {
      type: 'box',
      layout: 'baseline',
      contents: [
        { type: 'text', text: 'วันครบกำหนด', size: 'sm', color: '#6B7280', flex: 4 },
        {
          type: 'text',
          text: formatThaiDate(item.DueDateParsed),
          size: 'sm',
          flex: 6,
          align: 'end',
          wrap: true,
        },
      ],
    },
  ];

  // Show description only when it differs from equipment name
  if (desc && desc !== equipName) {
    bodyContents.push({
      type: 'box',
      layout: 'baseline',
      contents: [
        { type: 'text', text: 'รายละเอียด', size: 'sm', color: '#6B7280', flex: 4 },
        {
          type: 'text',
          text: desc,
          size: 'sm',
          flex: 6,
          align: 'end',
          wrap: true,
          maxLines: 2,
          color: '#374151',
        },
      ],
    });
  }

  return {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: color,
      paddingAll: '12px',
      contents: [
        {
          type: 'text',
          text: '📅 แจ้งเตือน Calibration',
          color: '#FFFFFF',
          size: 'sm',
          weight: 'bold',
        },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      paddingAll: '16px',
      contents: bodyContents,
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          style: 'link',
          height: 'sm',
          action: {
            type: 'uri',
            label: 'ดูตาราง Calibration',
            uri: calUrl,
          },
        },
      ],
    },
  };
}

function buildFlexMessage(items) {
  if (!items || items.length === 0) return null;

  const capped = items.slice(0, 10);
  const soonest = capped[0];
  const label = soonest.EquipmentName || soonest.PMCODE || 'Calibration';
  const altText = `แจ้งเตือน: งาน Calibration ใกล้ครบกำหนด ${capped.length} รายการ (เร็วที่สุด: ${label})`;

  if (capped.length === 1) {
    return { type: 'flex', altText, contents: buildBubble(capped[0]) };
  }

  return {
    type: 'flex',
    altText,
    contents: { type: 'carousel', contents: capped.map(buildBubble) },
  };
}

// ===== DATA QUERY =====

// SQL Server 2008-compatible DUEDATE string → date conversion (YYYYMMDD or YYYY-MM-DD).
const DUEDATE_EXPR = `(CASE
  WHEN LEN(LTRIM(RTRIM(s.DUEDATE))) = 8
    AND ISDATE(STUFF(STUFF(s.DUEDATE, 5, 0, '-'), 8, 0, '-')) = 1
    THEN CONVERT(date, STUFF(STUFF(s.DUEDATE, 5, 0, '-'), 8, 0, '-'), 23)
  WHEN LEN(LTRIM(RTRIM(s.DUEDATE))) >= 10
    AND ISDATE(LEFT(s.DUEDATE, 10)) = 1
    THEN CONVERT(date, LEFT(s.DUEDATE, 10), 23)
  ELSE NULL
END)`;

const UPCOMING_QUERY = `
  WITH CalibDue AS (
    SELECT
      pm.ASSIGN                              AS PersonNo,
      p.PERSON_NAME                          AS AssigneeName,
      ue.LineID,
      pm.PMNO,
      pm.PMCODE,
      pm.PMDESC,
      ISNULL(eq.EQNAME, pm.PMDESC)          AS EquipmentName,
      ${DUEDATE_EXPR}                        AS DueDateParsed,
      ISNULL(s.WOStatusNo, 0)               AS SchedWOStatus,
      ISNULL(s.WONo, 0)                     AS SchedWONo,
      ISNULL(wo.WOSTATUSNO, 0)              AS LinkedWOStatus
    FROM dbo.PMSched s
    INNER JOIN dbo.PM pm
      ON  pm.PMNO = s.PMNO
      AND pm.PMCODE LIKE '%-CAL%'
      AND (pm.FREEZE  IS NULL OR LTRIM(RTRIM(pm.FREEZE))  <> 'T')
      AND (pm.FLAGDEL IS NULL OR LTRIM(RTRIM(pm.FLAGDEL)) <> 'T')
    LEFT JOIN dbo.EQ eq
      ON  eq.EQNO = pm.EQNO
      AND (eq.FLAGDEL IS NULL OR eq.FLAGDEL <> 'Y')
    LEFT JOIN dbo.WO wo
      ON  wo.WONO = s.WONo
      AND s.WONo > 0
      AND (wo.FLAGDEL IS NULL OR wo.FLAGDEL <> 'Y')
    INNER JOIN dbo.Person p
      ON  p.PERSONNO = pm.ASSIGN
      AND (p.FLAGDEL IS NULL OR p.FLAGDEL <> 'Y')
    LEFT JOIN dbo._secUsers u     ON u.PersonNo  = p.PERSONNO
    LEFT JOIN dbo.IgxUserExtension ue ON ue.UserID = u.UserID
    WHERE pm.ASSIGN IS NOT NULL
      AND pm.ASSIGN <> 0
      AND ue.LineID IS NOT NULL
  )
  SELECT
    PersonNo, AssigneeName, LineID,
    PMNO, PMCODE, PMDESC, EquipmentName,
    DueDateParsed,
    DATEDIFF(day, CAST(GETDATE() AS DATE), DueDateParsed) AS DaysUntilDue
  FROM CalibDue
  WHERE DueDateParsed IS NOT NULL
    AND DueDateParsed >= CAST(GETDATE() AS DATE)
    AND DueDateParsed <= DATEADD(day, 7, CAST(GETDATE() AS DATE))
    AND SchedWOStatus <> 9
    AND NOT (SchedWONo > 0 AND LinkedWOStatus = 9)
  ORDER BY PersonNo, DueDateParsed ASC
`;

// ===== SERVICE CLASS =====

class CalibrationDueDateNotificationService {
  async getUpcomingCalibrations() {
    const pool = await sql.connect(dbConfig);
    try {
      const result = await pool.request().query(UPCOMING_QUERY);
      return result.recordset || [];
    } finally {
      await pool.close();
    }
  }

  async sendToAllUsers() {
    console.log('📅 Starting calibration due-date notification batch...');

    let rows;
    try {
      rows = await this.getUpcomingCalibrations();
    } catch (err) {
      console.error('❌ Error querying calibration schedules:', err);
      return { success: false, error: err.message };
    }

    if (rows.length === 0) {
      console.log('⚠️  No calibration items due within 7 days with LINE-linked assignees');
      return { success: true, totalUsers: 0, sent: 0, failed: 0, skipped: 0 };
    }

    // Group rows by PersonNo (each person gets one carousel)
    const byUser = {};
    for (const row of rows) {
      if (!byUser[row.PersonNo]) {
        byUser[row.PersonNo] = { lineId: row.LineID, name: row.AssigneeName, items: [] };
      }
      byUser[row.PersonNo].items.push(row);
    }

    console.log(`📊 Found ${Object.keys(byUser).length} users with upcoming calibrations (${rows.length} total items)`);

    const results = await Promise.all(
      Object.values(byUser).map(async ({ lineId, name, items }) => {
        try {
          const message = buildFlexMessage(items);
          if (!message) return { success: false, skipped: true, reason: 'build_failed' };

          const result = await abnFlexService.sendToUser(lineId, [message]);
          return { ...result, itemCount: items.length };
        } catch (err) {
          console.error(`❌ Error sending calibration notification to ${name}:`, err.message);
          return { success: false, error: err.message };
        }
      })
    );

    const summary = {
      success: true,
      totalUsers: Object.keys(byUser).length,
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success && !r.skipped).length,
      skipped: results.filter((r) => r.skipped).length,
      results,
    };

    console.log('✅ Calibration due-date notification batch completed:', summary);
    return summary;
  }
}

const service = new CalibrationDueDateNotificationService();

module.exports = {
  sendToAllUsers: () => service.sendToAllUsers(),
  getUpcomingCalibrations: () => service.getUpcomingCalibrations(),
  CalibrationDueDateNotificationService,
};
