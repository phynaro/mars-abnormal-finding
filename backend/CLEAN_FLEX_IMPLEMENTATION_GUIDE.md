# 🎯 Clean Flex Message Implementation Guide

This guide shows how to replace existing LINE notifications with the new clean `abnormalFindingFlexService`.

## ✅ New Service Benefits

1. **Simple & Clean**: One function call instead of complex builders
2. **Consistent Design**: Follows your `flexmessge-design.md` specification
3. **Easy to Use**: Matches the exact pattern from your design doc
4. **Minimal Changes**: Only need to update notification calls in ticket controller
5. **Type Safe**: Clear enums for states and structured payload

## 🚀 Quick Start

```javascript
const abnFlexService = require('../services/abnormalFindingFlexService');

// Build and send message in one go
const flexMsg = abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.ACCEPTED, {
  caseNo: "TKT-20250921-001",
  assetName: "DJ - Receiving", 
  problem: "Motor overheating",
  actionBy: "Karun C.",
  comment: "งานได้รับการยอมรับแล้ว"
});

await abnFlexService.pushToUser(lineUserId, flexMsg);
```

## 📋 Available States

| State | Thai Label | Color | Use Case |
|-------|------------|-------|----------|
| `CREATED` | สร้างเคสใหม่ | Blue | New ticket created |
| `ACCEPTED` | รับงาน | Green | Ticket accepted by L2 |
| `REJECT_TO_MANAGER` | ปฏิเสธโดย L2 | Amber | L2 rejection (to L3 review) |
| `REJECT_FINAL` | ปฏิเสธขั้นสุดท้าย | Red | Final rejection by L3 |
| `COMPLETED` | เสร็จสิ้น | Emerald | Job completed |
| `REASSIGNED` | มอบหมายใหม่ | Violet | Ticket reassigned |
| `ESCALATED` | ส่งต่อ L3 | Rose | Escalated to L3 |
| `CLOSED` | ปิดเคส | Slate | Ticket closed |
| `REOPENED` | เปิดเคสใหม่ | Orange | Ticket reopened |

## 🔄 Migration Examples

### 1. Accept Ticket Notification

**Before:**
```javascript
const flexMsg = lineService.buildTicketAcceptedFlexMessage(
    ticketData, 
    acceptorName, 
    // ticketImages
);
await lineService.pushToUser(reporter.LineID, flexMsg);
```

**After:**
```javascript
const flexMsg = abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.ACCEPTED, {
    caseNo: ticketData.ticket_number,
    assetName: ticketData.PUNAME || ticketData.machine_number || "Unknown Asset",
    problem: ticketData.title || "No description",
    actionBy: acceptorName,
    comment: \`งานได้รับการยอมรับแล้ว โดย \${acceptorName}\`,
    detailUrl: \`\${process.env.FRONTEND_URL}/tickets/\${ticketData.id}\`
});
await abnFlexService.pushToUser(reporter.LineID, flexMsg);
```

### 2. Complete Job Notification

**Before:**
```javascript
const flexMsg = lineService.buildJobCompletedFlexMessage(
    ticketData, 
    completerName, 
    completion_notes, 
    downtime_avoidance_hours,
    cost_avoidance,
    ticketImages
);
await lineService.pushToUser(reporter.LineID, flexMsg);
```

**After:**
```javascript
const flexMsg = abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.COMPLETED, {
    caseNo: ticketData.ticket_number,
    assetName: ticketData.PUNAME || "Unknown Asset",
    problem: ticketData.title,
    actionBy: completerName,
    comment: completion_notes || "งานเสร็จสมบูรณ์แล้ว",
    extraKVs: [
        { label: "Cost Avoidance", value: cost_avoidance ? \`\${cost_avoidance:,} บาท\` : "-" },
        { label: "Downtime Avoidance", value: downtime_avoidance_hours ? \`\${downtime_avoidance_hours} ชั่วโมง\` : "-" }
    ],
    detailUrl: \`\${process.env.FRONTEND_URL}/tickets/\${ticketData.id}\`
});
await abnFlexService.pushToUser(reporter.LineID, flexMsg);
```

### 3. Escalate Ticket Notification

**Before:**
```javascript
const flexMsg = lineService.buildTicketEscalatedFlexMessageSimple(
    ticketData, 
    escalatorName, 
    escalation_reason,
    images
);
await lineService.pushToUser(escalatedTo.LineID, flexMsg);
```

**After:**
```javascript
const flexMsg = abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.ESCALATED, {
    caseNo: ticketData.ticket_number,
    assetName: ticketData.PUNAME || "Unknown Asset",
    problem: ticketData.title,
    actionBy: escalatorName,
    comment: escalation_reason || "งานถูกส่งต่อให้ L3 พิจารณา",
    detailUrl: \`\${process.env.FRONTEND_URL}/tickets/\${ticketData.id}\`
});
await abnFlexService.pushToUser(escalatedTo.LineID, flexMsg);
```

### 4. New Ticket Creation Notification

**Before:**
```javascript
const flexMsg = lineService.buildTicketCreatedFlexMessage(ticket, ticket.reporter_name, ticketImages, { allowLocalImages });
await lineService.pushToUser(user.LineID, flexMsg);
```

**After:**
```javascript
const flexMsg = abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.CREATED, {
    caseNo: ticket.ticket_number,
    assetName: ticket.PUNAME || ticket.machine_number || "Unknown Asset",
    problem: ticket.title || "No description",
    actionBy: ticket.reporter_name,
    comment: "เคสใหม่ รอการยอมรับจาก L2",
    extraKVs: [
        { label: "Priority", value: ticket.priority || "normal" },
        { label: "Severity", value: ticket.severity_level || "medium" }
    ],
    detailUrl: \`\${process.env.FRONTEND_URL}/tickets/\${ticket.id}\`
});
await abnFlexService.pushToUser(user.LineID, flexMsg);
```

## 🎨 Payload Structure

```typescript
interface FlexPayload {
  caseNo: string;           // Ticket number (required)
  assetName?: string;       // Asset/machine name
  problem?: string;         // Problem description
  actionBy?: string;        // Person who performed action
  comment?: string;         // Additional comment
  callUri?: string;         // Phone number (tel:+66812345678)
  detailUrl?: string;       // Link to ticket details
  extraKVs?: Array<{        // Additional key-value pairs
    label: string;
    value: string;
  }>;
}
```

## 📝 Implementation Checklist

- [ ] Add import: `const abnFlexService = require('../services/abnormalFindingFlexService');`
- [ ] Replace `buildTicketCreatedFlexMessage` calls → `AbnCaseState.CREATED`
- [ ] Replace `buildTicketAcceptedFlexMessage` calls → `AbnCaseState.ACCEPTED`
- [ ] Replace `buildJobCompletedFlexMessage` calls → `AbnCaseState.COMPLETED`
- [ ] Replace `buildTicketEscalatedFlexMessage` calls → `AbnCaseState.ESCALATED`
- [ ] Replace `buildTicketClosedFlexMessage` calls → `AbnCaseState.CLOSED`
- [ ] Replace `buildTicketReassignedFlexMessage` calls → `AbnCaseState.REASSIGNED`
- [ ] Replace `buildTicketRejectedFlexMessage` calls → `AbnCaseState.REJECT_FINAL` or `AbnCaseState.REJECT_TO_MANAGER`
- [ ] Replace `buildTicketReopenedFlexMessage` calls → `AbnCaseState.REOPENED`
- [ ] Test each notification type
- [ ] Remove old `lineService` import (optional)

## 🧪 Testing

Run the test scripts to verify everything works:

```bash
# Test message building
node test_clean_flex_service.js

# Test live LINE messages  
node test_live_flex_message.js
```

## 🎯 Next Steps

1. ✅ **Service Created** - New clean service is ready
2. ✅ **One Example Updated** - Accept ticket notification updated
3. 🔄 **Migrate Remaining Notifications** - Update other notification calls
4. 🧹 **Cleanup** - Remove old complex service imports (optional)

This approach gives you a clean, maintainable, and easy-to-use LINE notification system that follows your exact design specifications!
