/**
 * EMS calibration notifications — registry-scoped (IgxEQExtension).
 * Rules: 30-day pre-due (once), daily overdue to assignee, 14-day escalation to plant managers.
 */

const sql = require('mssql');
const { Resend } = require('resend');
const dbConfig = require('../../config/dbConfig');
const { getCedarPool } = require('../../config/getCedarPool');
const abnFlexService = require('../abnormalFindingFlexService');
const {
  emsEquipmentFromJoin,
  openCalApplySql,
  plantFromTagExpr,
} = require('../../helpers/emsQueryHelpers');
const {
  EMS_NOTIFICATION_RULES,
  EMS_PRE_DUE_DAYS,
  EMS_ESCALATION_OVERDUE_DAYS,
} = require('../../constants/emsConstants');

let resend = null;
if (process.env.RESEND_API_TOKEN) {
  try {
    resend = new Resend(process.env.RESEND_API_TOKEN);
  } catch (err) {
    console.warn('EMS notifications: Resend init failed:', err.message);
  }
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'notifications@trazor.cloud';

function emsEquipmentUrl(tagNo) {
  const base = (process.env.LIFF_URL || process.env.FRONTEND_URL || 'https://example.com').replace(/\/$/, '');
  return `${base}/ems/equipment/${encodeURIComponent(tagNo)}`;
}

function formatThaiDate(dateValue) {
  if (!dateValue) return '-';
  return new Date(dateValue).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function daysLabel(daysUntilDue, daysOverdue) {
  if (daysOverdue > 0) return `เกินกำหนด ${daysOverdue} วัน`;
  if (daysUntilDue === 0) return 'ครบกำหนดวันนี้';
  if (daysUntilDue === 30) return 'เหลือ 30 วัน';
  if (daysUntilDue === 1) return 'เหลือ 1 วัน';
  return `เหลือ ${daysUntilDue} วัน`;
}

function headerColor(rule, item) {
  if (rule === EMS_NOTIFICATION_RULES.ESCALATION_14) return '#7C3AED';
  if (item.DaysOverdue > 0) return '#DC2626';
  return '#0D9488';
}

function headerTitle(rule) {
  switch (rule) {
    case EMS_NOTIFICATION_RULES.PRE_DUE_30:
      return '📅 EMS: แจ้งเตือนล่วงหน้า 30 วัน';
    case EMS_NOTIFICATION_RULES.OVERDUE_DAILY:
      return '⚠️ EMS: Calibration เกินกำหนด';
    case EMS_NOTIFICATION_RULES.ESCALATION_14:
      return '🚨 EMS: Escalation เกินกำหนด 14 วัน';
    default:
      return '📅 EMS Calibration';
  }
}

function buildBubble(item, rule) {
  const color = headerColor(rule, item);
  const tagNo = item.TagNo || '-';
  const desc = (item.Description || tagNo).trim();

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
          text: headerTitle(rule),
          color: '#FFFFFF',
          size: 'sm',
          weight: 'bold',
          wrap: true,
        },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      paddingAll: '16px',
      contents: [
        {
          type: 'text',
          text: tagNo,
          weight: 'bold',
          size: 'md',
          wrap: true,
          color: '#111827',
        },
        {
          type: 'text',
          text: desc,
          size: 'xs',
          color: '#6B7280',
          wrap: true,
          maxLines: 2,
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
              text: daysLabel(item.DaysUntilDue, item.DaysOverdue),
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
        {
          type: 'box',
          layout: 'baseline',
          contents: [
            { type: 'text', text: 'พื้นที่', size: 'sm', color: '#6B7280', flex: 4 },
            {
              type: 'text',
              text: item.Area || '-',
              size: 'sm',
              flex: 6,
              align: 'end',
              wrap: true,
            },
          ],
        },
      ],
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
            label: 'ดูรายละเอียดอุปกรณ์',
            uri: emsEquipmentUrl(tagNo),
          },
        },
      ],
    },
  };
}

function buildFlexMessage(items, rule) {
  if (!items?.length) return null;
  const capped = items.slice(0, 10);
  const altTag = capped[0].TagNo || 'EMS';
  const altText = `EMS Calibration: ${capped.length} รายการ (${altTag})`;

  if (capped.length === 1) {
    return { type: 'flex', altText, contents: buildBubble(capped[0], rule) };
  }

  return {
    type: 'flex',
    altText,
    contents: { type: 'carousel', contents: capped.map((i) => buildBubble(i, rule)) },
  };
}

function buildEmailHtml(items, rule, recipientName) {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.TagNo}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.Description || '-'}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${formatThaiDate(item.DueDateParsed)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${daysLabel(item.DaysUntilDue, item.DaysOverdue)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;"><a href="${emsEquipmentUrl(item.TagNo)}">View</a></td>
      </tr>`
    )
    .join('');

  return `
    <p>สวัสดี ${recipientName || ''},</p>
    <p>${headerTitle(rule).replace(/[📅⚠️🚨]/g, '').trim()}</p>
    <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:14px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:8px;text-align:left;">Tag No.</th>
          <th style="padding:8px;text-align:left;">Description</th>
          <th style="padding:8px;text-align:left;">Due Date</th>
          <th style="padding:8px;text-align:left;">Status</th>
          <th style="padding:8px;text-align:left;">Link</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

const REGISTRY_OPEN_CAL_SELECT = `
  SELECT
    ext.tag_no AS TagNo,
    LTRIM(RTRIM(ext.location)) AS Area,
    ${plantFromTagExpr('ext.tag_no')} AS PlantCode,
    ISNULL(eq.EQNAME, ext.tag_no) AS Description,
    cal.PMSchNo,
    cal.dueDateParsed AS DueDateParsed,
    cal.assigneeId AS AssigneeId,
    cal.WONo,
    cal.WOCODE AS WoCode,
    DATEDIFF(day, CAST(GETDATE() AS DATE), cal.dueDateParsed) AS DaysUntilDue,
    DATEDIFF(day, cal.dueDateParsed, CAST(GETDATE() AS DATE)) AS DaysOverdue
  ${emsEquipmentFromJoin()}
  ${openCalApplySql()}
`;

function openCalWhere() {
  return `
    cal.DUEDATE IS NOT NULL
    AND cal.dueDateParsed IS NOT NULL
    AND NOT (cal.schedWOStatusNo = 9 OR (cal.WONo > 0 AND cal.woStatusNo IN (7, 9)))
  `;
}

async function fetchPreDue30() {
  const pool = await getCedarPool();
  const result = await pool.request().query(`
    ${REGISTRY_OPEN_CAL_SELECT}
    WHERE ${openCalWhere()}
      AND DATEDIFF(day, CAST(GETDATE() AS DATE), cal.dueDateParsed) = ${EMS_PRE_DUE_DAYS}
      AND cal.assigneeId IS NOT NULL
      AND cal.assigneeId <> 0
  `);
  return result.recordset || [];
}

async function fetchOverdue() {
  const pool = await getCedarPool();
  const result = await pool.request().query(`
    ${REGISTRY_OPEN_CAL_SELECT}
    WHERE ${openCalWhere()}
      AND cal.dueDateParsed < CAST(GETDATE() AS DATE)
      AND cal.assigneeId IS NOT NULL
      AND cal.assigneeId <> 0
  `);
  return result.recordset || [];
}

async function fetchEscalation14() {
  const pool = await getCedarPool();
  const result = await pool.request().query(`
    ${REGISTRY_OPEN_CAL_SELECT}
    WHERE ${openCalWhere()}
      AND DATEDIFF(day, cal.dueDateParsed, CAST(GETDATE() AS DATE)) >= ${EMS_ESCALATION_OVERDUE_DAYS}
  `);
  return result.recordset || [];
}

async function wasAlreadySent(pool, pmSchNo, rule, recipientPersonNo, dailyOnly) {
  const req = pool.request()
    .input('pmSchNo', sql.NVarChar(50), String(pmSchNo))
    .input('rule', sql.NVarChar(50), rule)
    .input('recipient', sql.NVarChar(50), String(recipientPersonNo));

  const dateClause = dailyOnly
    ? 'AND CAST(sent_at AS DATE) = CAST(GETDATE() AS DATE)'
    : '';

  const result = await req.query(`
    SELECT TOP 1 1 AS found
    FROM dbo.IgxEmsNotificationLog
    WHERE pm_sch_no = @pmSchNo
      AND notification_rule = @rule
      AND recipient_person_no = @recipient
      ${dateClause}
  `);
  return (result.recordset || []).length > 0;
}

async function logSent(pool, pmSchNo, rule, recipientPersonNo) {
  await pool.request()
    .input('pmSchNo', sql.NVarChar(50), String(pmSchNo))
    .input('rule', sql.NVarChar(50), rule)
    .input('recipient', sql.NVarChar(50), String(recipientPersonNo))
    .query(`
      INSERT INTO dbo.IgxEmsNotificationLog (pm_sch_no, notification_rule, recipient_person_no)
      VALUES (@pmSchNo, @rule, @recipient)
    `);
}

async function getPersonContact(personNo) {
  const pool = await sql.connect(dbConfig);
  try {
    const result = await pool.request()
      .input('personNo', sql.Int, parseInt(personNo, 10))
      .query(`
        SELECT
          p.PERSONNO AS PersonNo,
          ISNULL(p.FIRSTNAME, '') + ' ' + ISNULL(p.LASTNAME, '') AS PersonName,
          LTRIM(RTRIM(p.EMAIL)) AS Email,
          ue.LineID
        FROM dbo.Person p
        LEFT JOIN dbo._secUsers u ON u.PersonNo = p.PERSONNO
        LEFT JOIN dbo.IgxUserExtension ue ON ue.UserID = u.UserID
        WHERE p.PERSONNO = @personNo
          AND (p.FLAGDEL IS NULL OR p.FLAGDEL <> 'Y')
      `);
    return result.recordset[0] || null;
  } finally {
    await pool.close();
  }
}

async function getPlantManagersForScope(plantCode, area) {
  const pool = await sql.connect(dbConfig);
  try {
    const result = await pool.request()
      .input('plant', sql.NVarChar(20), plantCode || null)
      .input('area', sql.NVarChar(100), area || null)
      .query(`
        SELECT
          m.person_no AS PersonNo,
          m.plant,
          m.area,
          ISNULL(p.FIRSTNAME, '') + ' ' + ISNULL(p.LASTNAME, '') AS PersonName,
          LTRIM(RTRIM(p.EMAIL)) AS Email,
          ue.LineID
        FROM dbo.IgxEmsManagerArea m
        LEFT JOIN dbo.Person p ON CAST(p.PERSONNO AS NVARCHAR(50)) = m.person_no
        LEFT JOIN dbo._secUsers u ON u.PersonNo = p.PERSONNO
        LEFT JOIN dbo.IgxUserExtension ue ON ue.UserID = u.UserID
        WHERE (
          m.plant IS NULL
          OR UPPER(LTRIM(RTRIM(m.plant))) = UPPER(LTRIM(RTRIM(@plant)))
        )
        AND (
          m.area IS NULL
          OR LTRIM(RTRIM(m.area)) = ''
          OR LTRIM(RTRIM(m.area)) = LTRIM(RTRIM(@area))
        )
      `);
    return result.recordset || [];
  } finally {
    await pool.close();
  }
}

async function filterPendingItems(items, rule, personKey, logPool) {
  const dailyOnly = rule !== EMS_NOTIFICATION_RULES.PRE_DUE_30;
  const pending = [];
  for (const item of items) {
    const already = await wasAlreadySent(logPool, item.PMSchNo, rule, personKey, dailyOnly);
    if (!already) pending.push(item);
  }
  return pending;
}

async function sendToRecipient({ contact, items, rule, logPool }) {
  if (!contact || !items.length) {
    return { success: false, skipped: true, reason: 'no_contact_or_items' };
  }

  const personKey = String(contact.PersonNo || contact.person_no);
  const pending = await filterPendingItems(items, rule, personKey, logPool);
  if (!pending.length) {
    return { success: true, skipped: true, reason: 'already_sent' };
  }

  const results = { line: null, email: null };
  const name = (contact.PersonName || '').trim() || personKey;

  if (contact.LineID) {
    try {
      const message = buildFlexMessage(pending, rule);
      if (message) {
        results.line = await abnFlexService.sendToUser(contact.LineID, [message]);
      }
    } catch (err) {
      results.line = { success: false, error: err.message };
    }
  }

  if (resend && contact.Email) {
    try {
      const subject = headerTitle(rule).replace(/[📅⚠️🚨]/g, '').trim();
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: contact.Email,
        subject: `[EMS] ${subject}`,
        html: buildEmailHtml(pending, rule, name),
      });
      results.email = error ? { success: false, error: error.message } : { success: true, id: data?.id };
    } catch (err) {
      results.email = { success: false, error: err.message };
    }
  }

  const anySent = (contact.LineID && results.line?.success) || (contact.Email && results.email?.success);

  if (anySent) {
    for (const item of pending) {
      await logSent(logPool, item.PMSchNo, rule, personKey);
    }
  }

  return {
    success: anySent,
    skipped: !anySent && !contact.LineID && !contact.Email,
    results,
    itemCount: pending.length,
  };
}

async function processAssigneeRule(rows, rule) {
  const byAssignee = {};
  for (const row of rows) {
    const key = String(row.AssigneeId);
    if (!byAssignee[key]) byAssignee[key] = [];
    byAssignee[key].push(row);
  }

  const logPool = await sql.connect(dbConfig);
  const summary = { rule, sent: 0, failed: 0, skipped: 0 };

  try {
    for (const [assigneeId, items] of Object.entries(byAssignee)) {
      const contact = await getPersonContact(assigneeId);
      const result = await sendToRecipient({ contact, items, rule, logPool });
      if (result.skipped) summary.skipped += 1;
      else if (result.success) summary.sent += 1;
      else summary.failed += 1;
    }
  } finally {
    await logPool.close();
  }

  return summary;
}

async function processEscalationRule(rows) {
  const logPool = await sql.connect(dbConfig);
  const summary = { rule: EMS_NOTIFICATION_RULES.ESCALATION_14, sent: 0, failed: 0, skipped: 0 };
  const managerCache = new Map();

  try {
    for (const row of rows) {
      const cacheKey = `${row.PlantCode}|${row.Area || ''}`;
      let managers = managerCache.get(cacheKey);
      if (!managers) {
        managers = await getPlantManagersForScope(row.PlantCode, row.Area);
        managerCache.set(cacheKey, managers);
      }

      for (const manager of managers) {
        const contact = {
          PersonNo: manager.PersonNo,
          PersonName: manager.PersonName,
          Email: manager.Email,
          LineID: manager.LineID,
        };
        const result = await sendToRecipient({
          contact,
          items: [row],
          rule: EMS_NOTIFICATION_RULES.ESCALATION_14,
          logPool,
        });
        if (result.skipped) summary.skipped += 1;
        else if (result.success) summary.sent += 1;
        else summary.failed += 1;
      }
    }
  } finally {
    await logPool.close();
  }

  return summary;
}

async function processAll() {
  console.log('📅 Starting EMS calibration notification batch...');

  const [preDue, overdue, escalation] = await Promise.all([
    fetchPreDue30(),
    fetchOverdue(),
    fetchEscalation14(),
  ]);

  console.log(`📊 EMS candidates: pre_due_30=${preDue.length}, overdue=${overdue.length}, escalation_14=${escalation.length}`);

  const results = await Promise.all([
    processAssigneeRule(preDue, EMS_NOTIFICATION_RULES.PRE_DUE_30),
    processAssigneeRule(overdue, EMS_NOTIFICATION_RULES.OVERDUE_DAILY),
    processEscalationRule(escalation),
  ]);

  const summary = {
    success: true,
    preDue30: results[0],
    overdueDaily: results[1],
    escalation14: results[2],
  };

  console.log('✅ EMS calibration notification batch completed:', summary);
  return summary;
}

module.exports = {
  processAll,
  fetchPreDue30,
  fetchOverdue,
  fetchEscalation14,
  buildFlexMessage,
  EMS_NOTIFICATION_RULES,
};
