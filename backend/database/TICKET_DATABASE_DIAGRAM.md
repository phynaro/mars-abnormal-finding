# 🗄️ Ticket System Database Diagram

## 📊 Complete Table Structure

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    TICKETS                                        │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │ Primary Table - Stores all ticket information and workflow status         │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐           │
│  │ id (PK)    │ ticket_num  │ title       │ description │ machine_id  │           │
│  │ INT        │ VARCHAR(20) │ NVARCHAR    │ NVARCHAR    │ INT         │           │
│  │ IDENTITY   │ UNIQUE      │ (255)       │ (MAX)       │ NULLABLE    │           │
│  └─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘           │
│                                                                                     │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐           │
│  │ area_id    │ equipment_id│ affected_  │ affected_   │ severity_   │           │
│  │ INT        │ INT         │ point_type │ point_name  │ level       │           │
│  │ NULLABLE   │ NULLABLE    │ VARCHAR(50)│ NVARCHAR    │ VARCHAR(20) │           │
│  └─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘           │
│                                                                                     │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐           │
│  │ status     │ priority    │ estimated_ │ actual_     │ reported_by │           │
│  │ VARCHAR(50)│ VARCHAR(20) │ downtime   │ downtime    │ INT         │           │
│  │ DEFAULT    │ DEFAULT     │ DECIMAL    │ DECIMAL     │ NOT NULL    │           │
│  │ 'open'     │ 'normal'    │ (5,2)      │ (5,2)      │ FK→Users    │           │
│  └─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘           │
│                                                                                     │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐           │
│  │ assigned_to│ escalated_to│ escalation_│ rejection_  │ created_at  │           │
│  │ INT        │ INT         │ reason     │ reason      │ DATETIME2   │           │
│  │ NULLABLE   │ NULLABLE    │ NVARCHAR   │ NVARCHAR    │ DEFAULT     │           │
│  │ FK→Users   │ FK→Users    │ (500)      │ (500)       │ GETDATE()   │           │
│  └─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘           │
│                                                                                     │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐                         │
│  │ updated_at │ resolved_at │ closed_at   │             │                         │
│  │ DATETIME2  │ DATETIME2   │ DATETIME2   │             │                         │
│  │ DEFAULT    │ NULLABLE    │ NULLABLE    │             │                         │
│  │ GETDATE()  │             │             │             │                         │
│  └─────────────┴─────────────┴─────────────┴─────────────┘                         │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1:N
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                TICKET IMAGES                                      │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐           │
│  │ id (PK)    │ ticket_id   │ image_type  │ image_url   │ image_name  │           │
│  │ INT        │ INT         │ VARCHAR(20) │ NVARCHAR    │ NVARCHAR    │           │
│  │ IDENTITY   │ NOT NULL    │ NOT NULL    │ (500)       │ (255)       │           │
│  │            │ FK→Tickets  │ 'before'    │ NOT NULL    │ NULLABLE    │           │
│  │            │ CASCADE     │ 'after'     │             │             │           │
│  │            │             │ 'other'     │             │             │           │
│  └─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘           │
│                                                                                     │
│  ┌─────────────┬─────────────┐                                                     │
│  │ uploaded_at│ uploaded_by │                                                     │
│  │ DATETIME2  │ INT         │                                                     │
│  │ DEFAULT    │ NOT NULL    │                                                     │
│  │ GETDATE()  │ FK→Users    │                                                     │
│  └─────────────┴─────────────┘                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                TICKET COMMENTS                                    │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐           │
│  │ id (PK)    │ ticket_id   │ user_id     │ comment     │ created_at  │           │
│  │ INT        │ INT         │ INT         │ NVARCHAR    │ DATETIME2   │           │
│  │ IDENTITY   │ NOT NULL    │ NOT NULL    │ (MAX)       │ DEFAULT     │           │
│  │            │ FK→Tickets  │ FK→Users    │ NOT NULL    │ GETDATE()   │           │
│  │            │ CASCADE     │             │             │             │           │
│  └─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘           │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              TICKET STATUS HISTORY                                │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐           │
│  │ id (PK)    │ ticket_id   │ old_status  │ new_status  │ changed_by  │           │
│  │ INT        │ INT         │ VARCHAR(20) │ VARCHAR(20) │ INT         │           │
│  │ IDENTITY   │ NOT NULL    │ NULLABLE    │ NOT NULL    │ NOT NULL    │           │
│  │            │ FK→Tickets  │             │             │ FK→Users    │           │
│  │            │ CASCADE     │             │             │             │           │
│  └─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘           │
│                                                                                     │
│  ┌─────────────┬─────────────┐                                                     │
│  │ changed_at │ notes       │                                                     │
│  │ DATETIME2  │ NVARCHAR    │                                                     │
│  │ DEFAULT    │ (500)       │                                                     │
│  │ GETDATE()  │ NULLABLE    │                                                     │
│  └─────────────┴─────────────┘                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              TICKET ASSIGNMENTS                                   │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐           │
│  │ id (PK)    │ ticket_id   │ assigned_to │ assigned_by │ assigned_at │           │
│  │ INT        │ INT         │ INT         │ INT         │ DATETIME2   │           │
│  │ IDENTITY   │ NOT NULL    │ NOT NULL    │ NOT NULL    │ DEFAULT     │           │
│  │            │ FK→Tickets  │ FK→Users    │ FK→Users    │ GETDATE()   │           │
│  │            │ CASCADE     │             │             │             │           │
│  └─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘           │
│                                                                                     │
│  ┌─────────────┐                                                                   │
│  │ notes       │                                                                   │
│  │ NVARCHAR    │                                                                   │
│  │ (500)       │                                                                   │
│  │ NULLABLE    │                                                                   │
│  └─────────────┘                                                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 🔗 Foreign Key Relationships

### Primary Relationships
```
Tickets.reported_by → Users.UserID
Tickets.assigned_to → Users.UserID  
Tickets.escalated_to → Users.UserID
TicketImages.ticket_id → Tickets.id (CASCADE DELETE)
TicketComments.ticket_id → Tickets.id (CASCADE DELETE)
TicketStatusHistory.ticket_id → Tickets.id (CASCADE DELETE)
TicketAssignments.ticket_id → Tickets.id (CASCADE DELETE)
TicketImages.uploaded_by → Users.UserID
TicketComments.user_id → Users.UserID
TicketStatusHistory.changed_by → Users.UserID
TicketAssignments.assigned_to → Users.UserID
TicketAssignments.assigned_by → Users.UserID
```

### Cascade Delete Rules
- **Tickets** → **TicketImages**: CASCADE (delete images when ticket deleted)
- **Tickets** → **TicketComments**: CASCADE (delete comments when ticket deleted)
- **Tickets** → **TicketStatusHistory**: CASCADE (delete history when ticket deleted)
- **Tickets** → **TicketAssignments**: CASCADE (delete assignments when ticket deleted)

## 📈 Performance Indexes

### Tickets Table Indexes
- `IX_Tickets_Status` - Status filtering
- `IX_Tickets_Priority` - Priority filtering  
- `IX_Tickets_SeverityLevel` - Severity filtering
- `IX_Tickets_ReportedBy` - Reporter filtering
- `IX_Tickets_AssignedTo` - Assignee filtering
- `IX_Tickets_EscalatedTo` - Escalation filtering
- `IX_Tickets_CreatedAt` - Date range queries
- `IX_Tickets_UpdatedAt` - Last update queries
- `IX_Tickets_MachineId` - Machine-specific queries
- `IX_Tickets_AreaId` - Area-specific queries
- `IX_Tickets_EquipmentId` - Equipment-specific queries

### Supporting Table Indexes
- **TicketImages**: `ticket_id`, `image_type`, `uploaded_by`, `uploaded_at`
- **TicketComments**: `ticket_id`, `user_id`, `created_at`
- **TicketStatusHistory**: `ticket_id`, `changed_by`, `changed_at`, `new_status`
- **TicketAssignments**: `ticket_id`, `assigned_to`, `assigned_by`, `assigned_at`

## 🎯 Key Design Features

### 1. **Workflow Status Tracking**
- Complete audit trail of all status changes
- Support for complex escalation workflows
- Reason tracking for rejections and escalations

### 2. **Flexible Equipment Reference**
- Can reference machines, areas, or equipment
- Generic affected point system for flexibility
- Optional foreign key relationships

### 3. **Comprehensive History**
- Assignment history tracking
- Status change logging
- Comment and image attachments
- Full audit trail for compliance

### 4. **Performance Optimization**
- Strategic indexing on commonly queried fields
- Separate tables for different data types
- Efficient foreign key relationships

## 🔄 Workflow Status Flow

```
open → in_progress → completed → closed
  ↓         ↓           ↓
rejected   escalated  reopened_in_progress
pending    ↓
L3 review  L3 handles ticket
  ↓
rejected_final
```

## 📝 Notes

- **Status field**: Extended to VARCHAR(50) to support new workflow statuses
- **New fields**: Added `escalated_to`, `escalation_reason`, `rejection_reason` for L3 workflow
- **Cascade deletes**: Ensures data integrity when tickets are removed
- **Index strategy**: Optimized for common query patterns in ticket management
