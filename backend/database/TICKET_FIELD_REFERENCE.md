# 📋 Ticket System Field Reference Guide

## 🎫 Main Tickets Table Fields

### **Primary Key & Identification**
| Field | Type | Required | Default | Description | Example |
|-------|------|----------|---------|-------------|---------|
| `id` | INT | ✅ | AUTO | Unique ticket identifier | `1`, `2`, `3` |
| `ticket_number` | VARCHAR(20) | ✅ | AUTO | Human-readable ticket number | `TKT-2024-001` |

### **Ticket Content**
| Field | Type | Required | Default | Description | Example |
|-------|------|----------|---------|-------------|---------|
| `title` | NVARCHAR(255) | ✅ | - | Brief summary of the issue | `"Machine Vibration Problem"` |
| `description` | NVARCHAR(MAX) | ✅ | - | Detailed description of the issue | `"Excessive vibration detected in production line machine during operation. Affects product quality."` |

### **Affected Equipment/Area**
| Field | Type | Required | Default | Description | Example |
|-------|------|----------|---------|-------------|---------|
| `machine_id` | INT | ❌ | NULL | Reference to specific machine | `5` (Machine ID 5) |
| `area_id` | INT | ❌ | NULL | Reference to specific area | `12` (Area ID 12) |
| `equipment_id` | INT | ❌ | NULL | Reference to specific equipment | `8` (Equipment ID 8) |
| `affected_point_type` | VARCHAR(50) | ✅ | - | Type of affected point | `"machine"`, `"area"`, `"equipment"` |
| `affected_point_name` | NVARCHAR(255) | ✅ | - | Name/description of affected point | `"Production Line A"`, `"Warehouse B"` |

### **Classification & Priority**
| Field | Type | Required | Default | Description | Example |
|-------|------|----------|---------|-------------|---------|
| `severity_level` | VARCHAR(20) | ✅ | `'medium'` | Impact level of the issue | `"low"`, `"medium"`, `"high"`, `"critical"` |
| `priority` | VARCHAR(20) | ✅ | `'normal'` | Urgency of resolution | `"low"`, `"normal"`, `"high"`, `"urgent"` |

### **Time Tracking**
| Field | Type | Required | Default | Description | Example |
|-------|------|----------|---------|-------------|---------|
| `estimated_downtime_hours` | DECIMAL(5,2) | ❌ | NULL | Estimated time to resolve | `4.50` (4.5 hours) |
| `actual_downtime_hours` | DECIMAL(5,2) | ❌ | NULL | Actual time taken to resolve | `3.75` (3.75 hours) |

### **Workflow Status**
| Field | Type | Required | Default | Description | Example |
|-------|------|----------|---------|-------------|---------|
| `status` | VARCHAR(50) | ✅ | `'open'` | Current workflow status | See status values below |

#### **Status Values & Meanings**
| Status | Description | Who Can Set | Next Possible Statuses |
|--------|-------------|-------------|------------------------|
| `open` | Ticket created, waiting for L2 to accept | System | `in_progress`, `rejected_pending_l3_review` |
| `in_progress` | L2 accepted, work in progress | L2/L3 | `completed`, `escalated` |
| `rejected_pending_l3_review` | L2 rejected, escalated to L3 | L2 | `in_progress`, `rejected_final` |
| `rejected_final` | L3 confirmed rejection | L3 | None (final state) |
| `completed` | Work finished, waiting for requestor | L2/L3 | `closed`, `reopened_in_progress` |
| `escalated` | L2 escalated responsibility to L3 | L2 | `in_progress` |
| `closed` | Requestor verified and closed | Requestor | None (final state) |
| `reopened_in_progress` | Requestor reopened completed ticket | Requestor | `in_progress` |

### **Assignment & Escalation**
| Field | Type | Required | Default | Description | Example |
|-------|------|----------|---------|-------------|---------|
| `reported_by` | INT | ✅ | - | User ID who created the ticket | `15` (User ID 15) |
| `assigned_to` | INT | ❌ | NULL | User ID assigned to work on ticket | `23` (User ID 23) |
| `escalated_to` | INT | ❌ | NULL | L3 User ID for escalation | `7` (User ID 7) |

### **Reasons & Notes**
| Field | Type | Required | Default | Description | Example |
|-------|------|----------|---------|-------------|---------|
| `escalation_reason` | NVARCHAR(500) | ❌ | NULL | Why ticket was escalated | `"Need L3 expertise for complex electrical issue"` |
| `rejection_reason` | NVARCHAR(500) | ❌ | NULL | Why ticket was rejected | `"Cannot handle this type of repair with current tools"` |

### **Timestamps**
| Field | Type | Required | Default | Description | Example |
|-------|------|----------|---------|-------------|---------|
| `created_at` | DATETIME2 | ✅ | `GETDATE()` | When ticket was created | `2024-01-15 09:30:00` |
| `updated_at` | DATETIME2 | ✅ | `GETDATE()` | When ticket was last updated | `2024-01-15 14:45:00` |
| `resolved_at` | DATETIME2 | ❌ | NULL | When work was completed | `2024-01-15 16:20:00` |
| `closed_at` | DATETIME2 | ❌ | NULL | When ticket was closed | `2024-01-16 08:15:00` |

## 🖼️ Ticket Images Table Fields

| Field | Type | Required | Default | Description | Example |
|-------|------|----------|---------|-------------|---------|
| `id` | INT | ✅ | AUTO | Unique image identifier | `1`, `2`, `3` |
| `ticket_id` | INT | ✅ | - | Reference to ticket | `5` (Ticket ID 5) |
| `image_type` | VARCHAR(20) | ✅ | - | Type of image | `"before"`, `"after"`, `"other"` |
| `image_url` | NVARCHAR(500) | ✅ | - | File path/URL | `"/uploads/tickets/5/image_123.jpg"` |
| `image_name` | NVARCHAR(255) | ❌ | NULL | Original filename | `"machine_vibration_before.jpg"` |
| `uploaded_at` | DATETIME2 | ✅ | `GETDATE()` | When image was uploaded | `2024-01-15 10:15:00` |
| `uploaded_by` | INT | ✅ | - | User ID who uploaded | `15` (User ID 15) |

## 💬 Ticket Comments Table Fields

| Field | Type | Required | Default | Description | Example |
|-------|------|----------|---------|-------------|---------|
| `id` | INT | ✅ | AUTO | Unique comment identifier | `1`, `2`, `3` |
| `ticket_id` | INT | ✅ | - | Reference to ticket | `5` (Ticket ID 5) |
| `user_id` | INT | ✅ | - | User ID who made comment | `23` (User ID 23) |
| `comment` | NVARCHAR(MAX) | ✅ | - | Comment text | `"Started investigation. Found loose bolts on motor mount."` |
| `created_at` | DATETIME2 | ✅ | `GETDATE()` | When comment was created | `2024-01-15 11:30:00` |

## 📊 Ticket Status History Table Fields

| Field | Type | Required | Default | Description | Example |
|-------|------|----------|---------|-------------|---------|
| `id` | INT | ✅ | AUTO | Unique history record identifier | `1`, `2`, `3` |
| `ticket_id` | INT | ✅ | - | Reference to ticket | `5` (Ticket ID 5) |
| `old_status` | VARCHAR(20) | ❌ | NULL | Previous status | `"open"` |
| `new_status` | VARCHAR(20) | ✅ | - | New status | `"in_progress"` |
| `changed_by` | INT | ✅ | - | User ID who made change | `23` (User ID 23) |
| `changed_at` | DATETIME2 | ✅ | `GETDATE()` | When change was made | `2024-01-15 11:30:00` |
| `notes` | NVARCHAR(500) | ❌ | NULL | Additional notes | `"Ticket accepted and work started"` |

## 👥 Ticket Assignments Table Fields

| Field | Type | Required | Default | Description | Example |
|-------|------|----------|---------|-------------|---------|
| `id` | INT | ✅ | AUTO | Unique assignment record identifier | `1`, `2`, `3` |
| `ticket_id` | INT | ✅ | - | Reference to ticket | `5` (Ticket ID 5) |
| `assigned_to` | INT | ✅ | - | User ID assigned to ticket | `23` (User ID 23) |
| `assigned_by` | INT | ✅ | - | User ID who made assignment | `15` (User ID 15) |
| `assigned_at` | DATETIME2 | ✅ | `GETDATE()` | When assignment was made | `2024-01-15 11:30:00` |
| `notes` | NVARCHAR(500) | ❌ | NULL | Assignment notes | `"Assigned to maintenance team A"` |

## 🔍 Common Query Examples

### **Find Tickets by Status**
```sql
SELECT * FROM Tickets WHERE status = 'open';
SELECT * FROM Tickets WHERE status IN ('in_progress', 'escalated');
```

### **Find Tickets by User**
```sql
-- Tickets reported by specific user
SELECT * FROM Tickets WHERE reported_by = 15;

-- Tickets assigned to specific user
SELECT * FROM Tickets WHERE assigned_to = 23;

-- Tickets escalated to specific user
SELECT * FROM Tickets WHERE escalated_to = 7;
```

### **Find Tickets by Equipment**
```sql
-- Tickets affecting specific machine
SELECT * FROM Tickets WHERE machine_id = 5;

-- Tickets affecting specific area
SELECT * FROM Tickets WHERE area_id = 12;

-- Tickets by affected point type
SELECT * FROM Tickets WHERE affected_point_type = 'machine';
```

### **Find Tickets by Time**
```sql
-- Tickets created today
SELECT * FROM Tickets WHERE CAST(created_at AS DATE) = CAST(GETDATE() AS DATE);

-- Tickets updated in last 24 hours
SELECT * FROM Tickets WHERE updated_at >= DATEADD(HOUR, -24, GETDATE());

-- High priority tickets older than 2 hours
SELECT * FROM Tickets 
WHERE priority = 'high' 
AND created_at <= DATEADD(HOUR, -2, GETDATE())
AND status = 'open';
```

### **Find Tickets with Images**
```sql
SELECT t.*, COUNT(ti.id) as image_count
FROM Tickets t
LEFT JOIN TicketImages ti ON t.id = ti.ticket_id
GROUP BY t.id, t.ticket_number, t.title, t.status
HAVING COUNT(ti.id) > 0;
```

### **Find Ticket History**
```sql
SELECT t.ticket_number, t.title, tsh.old_status, tsh.new_status, 
       tsh.changed_at, u.FirstName + ' ' + u.LastName as changed_by_name
FROM Tickets t
JOIN TicketStatusHistory tsh ON t.id = tsh.ticket_id
JOIN Users u ON tsh.changed_by = u.UserID
WHERE t.id = 5
ORDER BY tsh.changed_at;
```

## ⚠️ Important Notes

### **Data Types**
- **VARCHAR vs NVARCHAR**: Use NVARCHAR for text that may contain international characters
- **DECIMAL(5,2)**: Allows values from 0.00 to 999.99 (5 total digits, 2 decimal places)
- **DATETIME2**: More precise than DATETIME, recommended for new applications

### **Constraints**
- **CASCADE DELETE**: When a ticket is deleted, all related records (images, comments, history, assignments) are automatically deleted
- **Foreign Keys**: All user references point to `Users.UserID` (not `Users.id`)
- **Unique Constraints**: `ticket_number` must be unique across all tickets

### **Performance Considerations**
- **Indexes**: Strategic indexes are created on commonly queried fields
- **Status Queries**: Use the status index for efficient status-based filtering
- **Date Queries**: Use the created_at/updated_at indexes for date range queries
- **User Queries**: Use the user-related indexes for user-based filtering

### **Workflow Rules**
- **Status Transitions**: Not all status changes are allowed (see workflow documentation)
- **Permission Levels**: Different user roles can only perform certain actions
- **Required Fields**: Some fields become required based on current status
- **Audit Trail**: All status changes are automatically logged in TicketStatusHistory
