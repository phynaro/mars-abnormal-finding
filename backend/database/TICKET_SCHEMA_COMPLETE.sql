-- =====================================================
-- COMPLETE TICKET SYSTEM SCHEMA
-- Mars Abnormal Finding System - CMMS Database
-- =====================================================
-- This file contains the complete schema for the ticket system
-- including all tables, columns, constraints, and indexes
-- =====================================================

-- =====================================================
-- MAIN TICKETS TABLE
-- =====================================================
-- Stores all ticket information and workflow status
-- =====================================================
CREATE TABLE Tickets (
    -- Primary Key
    id INT IDENTITY(1,1) PRIMARY KEY,
    
    -- Ticket Identification
    ticket_number VARCHAR(20) UNIQUE NOT NULL,  -- Auto-generated unique number
    
    -- Ticket Content
    title NVARCHAR(255) NOT NULL,              -- Ticket title/summary
    description NVARCHAR(MAX) NOT NULL,        -- Detailed description
    
    -- Affected Equipment/Area
    machine_id INT,                            -- Reference to machine (optional)
    area_id INT,                               -- Reference to area (optional)
    equipment_id INT,                          -- Reference to equipment (optional)
    affected_point_type VARCHAR(50) NOT NULL,  -- 'machine', 'area', 'equipment'
    affected_point_name NVARCHAR(255) NOT NULL, -- Name of affected point
    
    -- Classification
    severity_level VARCHAR(20) NOT NULL DEFAULT 'medium',  -- 'low', 'medium', 'high', 'critical'
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',        -- 'low', 'normal', 'high', 'urgent'
    
    -- Time Tracking
    estimated_downtime_hours DECIMAL(5,2),     -- Estimated time to resolve
    actual_downtime_hours DECIMAL(5,2),        -- Actual time taken
    
    -- Workflow Status
    status VARCHAR(50) NOT NULL DEFAULT 'open', -- Current workflow status
    -- Status values: 'open', 'in_progress', 'rejected_pending_l3_review', 
    -- 'rejected_final', 'completed', 'escalated', 'closed', 'reopened_in_progress'
    
    -- Assignment & Escalation
    reported_by INT NOT NULL,                  -- User who created the ticket
    assigned_to INT,                           -- User assigned to work on ticket
    escalated_to INT,                          -- L3 user for escalation
    
    -- Reasons & Notes
    escalation_reason NVARCHAR(500),           -- Why ticket was escalated
    rejection_reason NVARCHAR(500),            -- Why ticket was rejected
    
    -- Timestamps
    created_at DATETIME2 DEFAULT GETDATE(),    -- When ticket was created
    updated_at DATETIME2 DEFAULT GETDATE(),    -- When ticket was last updated
    resolved_at DATETIME2,                     -- When work was completed
    closed_at DATETIME2,                       -- When ticket was closed
    
    -- Foreign Key Constraints
    FOREIGN KEY (reported_by) REFERENCES Users(UserID),
    FOREIGN KEY (assigned_to) REFERENCES Users(UserID),
    FOREIGN KEY (escalated_to) REFERENCES Users(UserID)
);

-- =====================================================
-- TICKET IMAGES TABLE
-- =====================================================
-- Stores images attached to tickets (before/after photos, etc.)
-- =====================================================
CREATE TABLE TicketImages (
    id INT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL,                    -- Reference to ticket
    image_type VARCHAR(20) NOT NULL,           -- 'before', 'after', 'other'
    image_url NVARCHAR(500) NOT NULL,         -- File path/URL
    image_name NVARCHAR(255),                 -- Original filename
    uploaded_at DATETIME2 DEFAULT GETDATE(),   -- When image was uploaded
    uploaded_by INT NOT NULL,                  -- User who uploaded image
    
    -- Foreign Key Constraints
    FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES Users(UserID)
);

-- =====================================================
-- TICKET COMMENTS TABLE
-- =====================================================
-- Stores comments/updates on tickets
-- =====================================================
CREATE TABLE TicketComments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL,                    -- Reference to ticket
    user_id INT NOT NULL,                      -- User who made comment
    comment NVARCHAR(MAX) NOT NULL,            -- Comment text
    created_at DATETIME2 DEFAULT GETDATE(),    -- When comment was created
    
    -- Foreign Key Constraints
    FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(UserID)
);

-- =====================================================
-- TICKET STATUS HISTORY TABLE
-- =====================================================
-- Tracks all status changes for audit trail
-- =====================================================
CREATE TABLE TicketStatusHistory (
    id INT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL,                    -- Reference to ticket
    old_status VARCHAR(20),                    -- Previous status (can be NULL for new tickets)
    new_status VARCHAR(20) NOT NULL,           -- New status
    changed_by INT NOT NULL,                   -- User who made the change
    changed_at DATETIME2 DEFAULT GETDATE(),    -- When change was made
    notes NVARCHAR(500),                       -- Additional notes about the change
    
    -- Foreign Key Constraints
    FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES Users(UserID)
);

-- =====================================================
-- TICKET ASSIGNMENTS TABLE
-- =====================================================
-- Tracks assignment history and changes
-- =====================================================
CREATE TABLE TicketAssignments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL,                    -- Reference to ticket
    assigned_to INT NOT NULL,                  -- User assigned to ticket
    assigned_by INT NOT NULL,                  -- User who made the assignment
    assigned_at DATETIME2 DEFAULT GETDATE(),   -- When assignment was made
    notes NVARCHAR(500),                       -- Assignment notes
    
    -- Foreign Key Constraints
    FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES Users(UserID),
    FOREIGN KEY (assigned_by) REFERENCES Users(UserID)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Tickets table indexes
CREATE INDEX IX_Tickets_Status ON Tickets(status);
CREATE INDEX IX_Tickets_Priority ON Tickets(priority);
CREATE INDEX IX_Tickets_SeverityLevel ON Tickets(severity_level);
CREATE INDEX IX_Tickets_ReportedBy ON Tickets(reported_by);
CREATE INDEX IX_Tickets_AssignedTo ON Tickets(assigned_to);
CREATE INDEX IX_Tickets_EscalatedTo ON Tickets(escalated_to);
CREATE INDEX IX_Tickets_CreatedAt ON Tickets(created_at);
CREATE INDEX IX_Tickets_UpdatedAt ON Tickets(updated_at);
CREATE INDEX IX_Tickets_MachineId ON Tickets(machine_id);
CREATE INDEX IX_Tickets_AreaId ON Tickets(area_id);
CREATE INDEX IX_Tickets_EquipmentId ON Tickets(equipment_id);

-- TicketImages table indexes
CREATE INDEX IX_TicketImages_TicketId ON TicketImages(ticket_id);
CREATE INDEX IX_TicketImages_ImageType ON TicketImages(image_type);
CREATE INDEX IX_TicketImages_UploadedBy ON TicketImages(uploaded_by);
CREATE INDEX IX_TicketImages_UploadedAt ON TicketImages(uploaded_at);

-- TicketComments table indexes
CREATE INDEX IX_TicketComments_TicketId ON TicketComments(ticket_id);
CREATE INDEX IX_TicketComments_UserId ON TicketComments(user_id);
CREATE INDEX IX_TicketComments_CreatedAt ON TicketComments(created_at);

-- TicketStatusHistory table indexes
CREATE INDEX IX_TicketStatusHistory_TicketId ON TicketStatusHistory(ticket_id);
CREATE INDEX IX_TicketStatusHistory_ChangedBy ON TicketStatusHistory(changed_by);
CREATE INDEX IX_TicketStatusHistory_ChangedAt ON TicketStatusHistory(changed_at);
CREATE INDEX IX_TicketStatusHistory_NewStatus ON TicketStatusHistory(new_status);

-- TicketAssignments table indexes
CREATE INDEX IX_TicketAssignments_TicketId ON TicketAssignments(ticket_id);
CREATE INDEX IX_TicketAssignments_AssignedTo ON TicketAssignments(assigned_to);
CREATE INDEX IX_TicketAssignments_AssignedBy ON TicketAssignments(assigned_by);
CREATE INDEX IX_TicketAssignments_AssignedAt ON TicketAssignments(assigned_at);

-- =====================================================
-- SAMPLE DATA (OPTIONAL)
-- =====================================================
-- Uncomment and modify as needed for testing

/*
INSERT INTO Tickets (
    ticket_number, title, description, 
    affected_point_type, affected_point_name, 
    severity_level, priority, reported_by
) VALUES (
    'TKT-2024-001', 
    'Machine Vibration Issue', 
    'Excessive vibration detected in production line machine during operation',
    'machine', 
    'Production Line A', 
    'high', 
    'normal', 
    1
);
*/

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================
