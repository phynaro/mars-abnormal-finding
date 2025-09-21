/* flex-abn-minimal.js
 * Builder สำหรับ Abnormal Finding Flex Message (Minimal style)
 * - ไม่มีพื้นหลัง header
 * - แสดง status สี
 * - CaseNo ตัวใหญ่ + Asset เป็น subtitle
 * - Body: key ซ้าย, value ขวา
 * - Comment block ชิดซ้าย
 * - ปุ่ม Call + View details theme เทาอ่อน
 */

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

const kvRow = (label, value) => ({
  type: "box",
  layout: "baseline",
  contents: [
    { type: "text", text: label, size: "sm", color: "#6B7280", flex: 5, align: "start" },
    { type: "text", text: value ?? "-", size: "sm", flex: 7, align: "end", wrap: true }
  ]
});

function buildAbnFlexMinimal(state, payload) {
  const statusColor = stateColorMap[state] || "#6B7280";

  const contents = {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "16px",
      contents: [
        // สถานะ
        {
          type: "text",
          text: payload.statusLabel || state,
          size: "sm",
          weight: "bold",
          color: statusColor
        },
        // Case No
        {
          type: "text",
          text: payload.caseNo || "-",
          size: "xl",
          weight: "bold"
        },
        // Asset
        {
          type: "text",
          text: payload.assetName || "-",
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
                text: payload.comment,
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
    altText: `[${payload.statusLabel || state}] ${payload.caseNo || ""}`.trim(),
    contents
  };
}

module.exports = {
  AbnCaseState,
  stateColorMap,
  buildAbnFlexMinimal
};

--how to use--
const { buildAbnFlexMinimal, AbnCaseState } = require('./flex-abn-minimal');

const msg = buildAbnFlexMinimal(AbnCaseState.REJECT_FINAL, {
  caseNo: "AB-2025090101",
  statusLabel: "Reject Final",
  assetName: "Boiler Feed Pump",
  problem: "test",
  actionBy: "Jirawuth",
  comment: "just test the flex message",
  callUri: "tel:+6612345678",
  detailUrl: "https://example.com"
});

// ส่ง msg ด้วย LINE SDK reply/push ได้เลย