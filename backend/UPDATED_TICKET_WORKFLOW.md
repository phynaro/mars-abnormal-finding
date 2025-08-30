# Updated Ticket Workflow Implementation

## Overview
This document describes the updated ticket workflow implementation based on the business requirements. The system now supports a complete L1 → L2 → L3 escalation workflow with proper status tracking and notifications.

## Database Schema Updates

### New Fields Added to Tickets Table
- `escalated_to INT` - References Users table for L3 escalation
- `escalation_reason NVARCHAR(500)` - Reason for escalation
- `rejection_reason NVARCHAR(500)` - Reason for rejection
- `status VARCHAR(50)` - Extended to support new workflow statuses

### New Status Values
1. **`open`** - Initial status when ticket is created
2. **`in_progress`** - L2 has accepted and is working on the ticket
3. **`rejected_pending_l3_review`** - L2 rejected, escalated to L3 for review
4. **`rejected_final`** - L3 confirmed rejection (final decision)
5. **`completed`** - L2 has completed the work
6. **`escalated`** - L2 escalated responsibility to L3
7. **`closed`** - Requestor has verified and closed the ticket
8. **`reopened_in_progress`** - Requestor reopened a completed ticket

## New API Endpoints

### 1. Accept Ticket
**POST** `/api/tickets/:id/accept`
- **Permission**: L2+ (Engineer)
- **Purpose**: L2 accepts a new ticket or L3 overrides L2 rejection
- **Body**: `{ "notes": "string" }`
- **Status Change**: `open` → `in_progress` or `rejected_pending_l3_review` → `in_progress`

### 2. Reject Ticket
**POST** `/api/tickets/:id/reject`
- **Permission**: L2+ (Engineer)
- **Purpose**: L2 rejects ticket (with L3 escalation option) or L3 makes final rejection
- **Body**: `{ "rejection_reason": "string", "escalate_to_l3": boolean }`
- **Status Change**: 
  - L2: `open` → `rejected_pending_l3_review` (if escalated)
  - L3: `rejected_pending_l3_review` → `rejected_final`

### 3. Complete Job
**POST** `/api/tickets/:id/complete`
- **Permission**: L2+ (Engineer)
- **Purpose**: L2 marks work as completed
- **Body**: `{ "completion_notes": "string", "actual_downtime_hours": number }`
- **Status Change**: `in_progress` → `completed`

### 4. Escalate Ticket
**POST** `/api/tickets/:id/escalate`
- **Permission**: L2+ (Engineer)
- **Purpose**: L2 escalates responsibility to L3
- **Body**: `{ "escalation_reason": "string", "escalated_to": number }`
- **Status Change**: `in_progress` → `escalated`

### 5. Close Ticket
**POST** `/api/tickets/:id/close`
- **Permission**: L1+ (Operator - Requestor only)
- **Purpose**: Requestor verifies resolution and closes ticket
- **Body**: `{ "close_reason": "string", "satisfaction_rating": number }`
- **Status Change**: `completed` → `closed`

### 6. Reopen Ticket
**POST** `/api/tickets/:id/reopen`
- **Permission**: L1+ (Operator - Requestor only)
- **Purpose**: Requestor reopens a completed ticket
- **Body**: `{ "reopen_reason": "string" }`
- **Status Change**: `completed` → `reopened_in_progress`

## Workflow Flow

### Normal Flow (L1 → L2 → L1)
1. **L1 creates ticket** → Status: `open`
2. **L2 accepts ticket** → Status: `in_progress`
3. **L2 completes job** → Status: `completed`
4. **L1 verifies and closes** → Status: `closed`

### Escalation Flow (L1 → L2 → L3 → L1)
1. **L1 creates ticket** → Status: `open`
2. **L2 rejects and escalates** → Status: `rejected_pending_l3_review`
3. **L3 reviews and accepts** → Status: `in_progress`
4. **L3 completes job** → Status: `completed`
5. **L1 verifies and closes** → Status: `closed`

### Rejection Flow
1. **L1 creates ticket** → Status: `open`
2. **L2 rejects** → Status: `rejected_pending_l3_review`
3. **L3 confirms rejection** → Status: `rejected_final`

### Reopening Flow
1. **Ticket completed** → Status: `completed`
2. **L1 not satisfied** → Status: `reopened_in_progress`
3. **L2 accepts reopened ticket** → Status: `in_progress`
4. **Continue normal flow...**

## Permission Matrix

| Action | L1 (Operator) | L2 (Engineer) | L3 (Manager) |
|--------|---------------|---------------|--------------|
| Create Ticket | ✅ | ✅ | ✅ |
| Accept Ticket | ❌ | ✅ | ✅ |
| Reject Ticket | ❌ | ✅ | ✅ |
| Complete Job | ❌ | ✅ | ✅ |
| Escalate Ticket | ❌ | ✅ | ✅ |
| Close Ticket | ✅ (own only) | ❌ | ❌ |
| Reopen Ticket | ✅ (own only) | ❌ | ❌ |
| Delete Ticket | ❌ | ❌ | ✅ |

## Notification System

### Email Notifications
- **Ticket Accepted**: Sent to requestor when L2/L3 accepts
- **Ticket Rejected**: Sent to requestor with rejection reason
- **Job Completed**: Sent to requestor when work is finished
- **Ticket Escalated**: Sent to L3 and requestor
- **Ticket Closed**: Sent to assignee with satisfaction rating
- **Ticket Reopened**: Sent to assignee

### LINE Notifications
- All email notifications also sent via LINE push messages
- Uses existing LINE service infrastructure

## Database Migration

To update existing databases, run the `update_ticket_workflow.sql` script:

```sql
-- Add new columns
ALTER TABLE Tickets ADD escalated_to INT;
ALTER TABLE Tickets ADD escalation_reason NVARCHAR(500);
ALTER TABLE Tickets ADD rejection_reason NVARCHAR(500);

-- Update status field length
ALTER TABLE Tickets ALTER COLUMN status VARCHAR(50);

-- Update existing status values
UPDATE Tickets SET status = 'in_progress' WHERE status = 'assigned';
UPDATE Tickets SET status = 'completed' WHERE status = 'resolved';
```

## Testing

### Test Endpoints
Use the existing test endpoint to verify email functionality:
**POST** `/api/tickets/test-email`

### Sample Test Data
```json
{
  "id": 999,
  "ticket_number": "TKT-TEST-001",
  "title": "Test Ticket for Email Notification",
  "description": "This is a test ticket to verify email notifications are working.",
  "affected_point_type": "machine",
  "affected_point_name": "Test Machine A",
  "priority": "high",
  "severity_level": "critical",
  "estimated_downtime_hours": 4
}
```

## Error Handling

All new endpoints include comprehensive error handling:
- **404**: Ticket not found
- **403**: Insufficient permissions
- **400**: Invalid request data
- **500**: Server errors

## Status History Tracking

All status changes are automatically logged in `TicketStatusHistory` table with:
- Old and new status
- User who made the change
- Timestamp
- Notes/context

## Future Enhancements

1. **Workflow Analytics**: Track time spent in each status
2. **SLA Monitoring**: Alert when tickets exceed time limits
3. **Automated Escalation**: Auto-escalate based on time thresholds
4. **Workflow Templates**: Predefined workflows for common scenarios
5. **Approval Chains**: Multi-level approval processes

The system is now ready to handle the complete workflow with all new statuses and escalation capabilities.

## Implementation Notes

### Database Changes Applied
✅ **Successfully implemented on CMMS database (192.168.0.25\SQLEXPRESS)**

### Important Implementation Details
1. **Foreign Key Reference**: The `escalated_to` field correctly references `Users(UserID)` (not `Users(id)`)
2. **Status Field**: Extended from VARCHAR(20) to VARCHAR(50) to accommodate new workflow statuses
3. **Index Strategy**: Created separate indexes for performance optimization
4. **Data Preservation**: All existing ticket data was preserved during the migration

### Known Status Values in System
- **Current**: All 23 tickets are in 'open' status
- **Previous**: No tickets had 'assigned' or 'resolved' status, so no data migration was needed
- **Ready for**: New workflow statuses: `in_progress`, `rejected_pending_l3_review`, `completed`, `escalated`, `closed`, `reopened_in_progress`

### Testing Recommendations
1. **Start with test tickets** to verify workflow transitions
2. **Test email notifications** for each status change
3. **Verify permission controls** work correctly for each role level
4. **Check status history logging** is working properly
