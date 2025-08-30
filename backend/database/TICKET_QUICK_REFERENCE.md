# 🚀 Ticket System Quick Reference

## 📋 Table Summary

| Table | Purpose | Key Fields | Records |
|-------|---------|------------|---------|
| **Tickets** | Main ticket data | `id`, `ticket_number`, `status` | 23 |
| **TicketImages** | Attached images | `ticket_id`, `image_url` | - |
| **TicketComments** | User comments | `ticket_id`, `comment` | - |
| **TicketStatusHistory** | Status changes | `ticket_id`, `new_status` | - |
| **TicketAssignments** | Assignment history | `ticket_id`, `assigned_to` | - |

## 🔄 Status Quick Reference

| Status | Meaning | Next Statuses |
|--------|---------|---------------|
| `open` | New ticket | `in_progress`, `rejected_pending_l3_review` |
| `in_progress` | Work started | `completed`, `escalated` |
| `completed` | Work finished | `closed`, `reopened_in_progress` |
| `closed` | Ticket closed | None |
| `rejected_pending_l3_review` | L2 rejected, L3 review | `in_progress`, `rejected_final` |
| `rejected_final` | L3 confirmed rejection | None |
| `escalated` | L2 escalated to L3 | `in_progress` |
| `reopened_in_progress` | Requestor reopened | `in_progress` |

## 🔑 Key Fields Quick Reference

### **Tickets Table**
```sql
-- Essential fields
id, ticket_number, title, description, status, priority, severity_level

-- User references
reported_by, assigned_to, escalated_to

-- Equipment references
machine_id, area_id, equipment_id, affected_point_type, affected_point_name

-- Time tracking
created_at, updated_at, resolved_at, closed_at, estimated_downtime_hours, actual_downtime_hours

-- Workflow fields
escalation_reason, rejection_reason
```

### **Supporting Tables**
```sql
-- TicketImages
ticket_id, image_type, image_url, uploaded_by

-- TicketComments  
ticket_id, user_id, comment, created_at

-- TicketStatusHistory
ticket_id, old_status, new_status, changed_by, changed_at, notes

-- TicketAssignments
ticket_id, assigned_to, assigned_by, assigned_at, notes
```

## 🚦 Common Status Transitions

### **Normal Flow**
```
open → in_progress → completed → closed
```

### **Escalation Flow**
```
open → rejected_pending_l3_review → in_progress → completed → closed
```

### **Reopening Flow**
```
completed → reopened_in_progress → in_progress → completed → closed
```

## 🔍 Quick Queries

### **Find Open Tickets**
```sql
SELECT * FROM Tickets WHERE status = 'open';
```

### **Find My Assigned Tickets**
```sql
SELECT * FROM Tickets WHERE assigned_to = @user_id;
```

### **Find High Priority Tickets**
```sql
SELECT * FROM Tickets WHERE priority = 'high' AND status != 'closed';
```

### **Find Tickets by Machine**
```sql
SELECT * FROM Tickets WHERE machine_id = @machine_id;
```

### **Find Ticket History**
```sql
SELECT * FROM TicketStatusHistory WHERE ticket_id = @ticket_id ORDER BY changed_at;
```

## 📊 Field Types Quick Reference

| Field Type | Size | Example | Notes |
|------------|------|---------|-------|
| `VARCHAR(20)` | 20 chars | `"high"`, `"normal"` | Status, priority, severity |
| `VARCHAR(50)` | 50 chars | `"machine"`, `"area"` | Affected point type |
| `NVARCHAR(255)` | 255 chars | `"Machine Vibration"` | Title, names |
| `NVARCHAR(500)` | 500 chars | `"Need L3 expertise"` | Reasons, notes |
| `NVARCHAR(MAX)` | Unlimited | Long descriptions | Description, comments |
| `DECIMAL(5,2)` | 5.2 digits | `4.50`, `12.75` | Hours (0.00 to 999.99) |
| `DATETIME2` | Timestamp | `2024-01-15 09:30:00` | All date fields |

## ⚡ Performance Tips

### **Use Indexed Fields for Filtering**
```sql
-- ✅ Fast - uses index
WHERE status = 'open'
WHERE priority = 'high'
WHERE reported_by = 15
WHERE created_at >= '2024-01-01'

-- ❌ Slow - no index
WHERE title LIKE '%vibration%'
WHERE description LIKE '%problem%'
```

### **Join Order for Performance**
```sql
-- ✅ Good - start with main table
SELECT t.*, u.FirstName, u.LastName
FROM Tickets t
JOIN Users u ON t.reported_by = u.UserID

-- ❌ Avoid - starts with Users table
SELECT t.*, u.FirstName, u.LastName  
FROM Users u
JOIN Tickets t ON u.UserID = t.reported_by
```

## 🚨 Common Issues & Solutions

### **Foreign Key Errors**
```sql
-- ❌ Error: Users table uses UserID, not id
FOREIGN KEY (reported_by) REFERENCES Users(id)

-- ✅ Correct: Users table uses UserID
FOREIGN KEY (reported_by) REFERENCES Users(UserID)
```

### **Status Field Length**
```sql
-- ❌ Error: Status field is VARCHAR(50), not VARCHAR(20)
ALTER TABLE Tickets ALTER COLUMN status VARCHAR(20);

-- ✅ Correct: Status field is VARCHAR(50)
ALTER TABLE Tickets ALTER COLUMN status VARCHAR(50);
```

### **Cascade Delete**
```sql
-- ✅ All related records are automatically deleted
DELETE FROM Tickets WHERE id = 5;
-- This will also delete:
-- - TicketImages where ticket_id = 5
-- - TicketComments where ticket_id = 5  
-- - TicketStatusHistory where ticket_id = 5
-- - TicketAssignments where ticket_id = 5
```

## 📱 API Endpoints Quick Reference

| Method | Endpoint | Purpose | Permission |
|--------|----------|---------|------------|
| `POST` | `/tickets` | Create ticket | L1+ |
| `GET` | `/tickets` | List tickets | L1+ |
| `GET` | `/tickets/:id` | Get ticket details | L1+ |
| `PUT` | `/tickets/:id` | Update ticket | L2+ |
| `POST` | `/tickets/:id/accept` | Accept ticket | L2+ |
| `POST` | `/tickets/:id/reject` | Reject ticket | L2+ |
| `POST` | `/tickets/:id/complete` | Complete job | L2+ |
| `POST` | `/tickets/:id/escalate` | Escalate ticket | L2+ |
| `POST` | `/tickets/:id/close` | Close ticket | L1+ (own only) |
| `POST` | `/tickets/:id/reopen` | Reopen ticket | L1+ (own only) |

## 🔧 Database Connection Info

- **Server**: 192.168.0.25\SQLEXPRESS
- **Database**: CMMS
- **User**: sa
- **Tables**: 5 ticket-related tables
- **Total Tickets**: 23
- **Status**: All tickets currently 'open'

## 📚 Related Documentation

- **Complete Schema**: `TICKET_SCHEMA_COMPLETE.sql`
- **Visual Diagram**: `TICKET_DATABASE_DIAGRAM.md`
- **Field Reference**: `TICKET_FIELD_REFERENCE.md`
- **Workflow Guide**: `../UPDATED_TICKET_WORKFLOW.md`
