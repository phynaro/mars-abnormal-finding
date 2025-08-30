-- Ticket System Database Tables for Mars Abnormal Finding System

-- Table for storing tickets (abnormal findings)
CREATE TABLE Tickets (
    id INT IDENTITY(1,1) PRIMARY KEY,
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    title NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NOT NULL,
    machine_id INT,
    area_id INT,
    equipment_id INT,
    affected_point_type VARCHAR(50) NOT NULL, -- 'machine', 'area', 'equipment'
    affected_point_name NVARCHAR(255) NOT NULL,
    severity_level VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    status VARCHAR(50) NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'rejected_pending_l3_review', 'rejected_final', 'completed', 'escalated', 'closed', 'reopened_in_progress'
    priority VARCHAR(20) NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    estimated_downtime_hours DECIMAL(5,2),
    actual_downtime_hours DECIMAL(5,2),
    reported_by INT NOT NULL,
    assigned_to INT,
    escalated_to INT, -- New field for L3 escalation
    escalation_reason NVARCHAR(500), -- Reason for escalation
    rejection_reason NVARCHAR(500), -- Reason for rejection
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    resolved_at DATETIME2,
    closed_at DATETIME2,
    FOREIGN KEY (reported_by) REFERENCES Users(id),
    FOREIGN KEY (assigned_to) REFERENCES Users(id),
    FOREIGN KEY (escalated_to) REFERENCES Users(id)
);

-- Table for storing ticket images
CREATE TABLE TicketImages (
    id INT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL,
    image_type VARCHAR(20) NOT NULL, -- 'before', 'after', 'other'
    image_url NVARCHAR(500) NOT NULL,
    image_name NVARCHAR(255),
    uploaded_at DATETIME2 DEFAULT GETDATE(),
    uploaded_by INT NOT NULL,
    FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES Users(id)
);

-- Table for storing ticket comments/updates
CREATE TABLE TicketComments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL,
    user_id INT NOT NULL,
    comment NVARCHAR(MAX) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id)
);

-- Table for storing ticket status history
CREATE TABLE TicketStatusHistory (
    id INT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by INT NOT NULL,
    changed_at DATETIME2 DEFAULT GETDATE(),
    notes NVARCHAR(500),
    FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES Users(id)
);

-- Table for storing ticket assignments
CREATE TABLE TicketAssignments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL,
    assigned_to INT NOT NULL,
    assigned_by INT NOT NULL,
    assigned_at DATETIME2 DEFAULT GETDATE(),
    notes NVARCHAR(500),
    FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES Users(id),
    FOREIGN KEY (assigned_by) REFERENCES Users(id)
);

-- Create indexes for better performance
CREATE INDEX IX_Tickets_Status ON Tickets(status);
CREATE INDEX IX_Tickets_Priority ON Tickets(priority);
CREATE INDEX IX_Tickets_ReportedBy ON Tickets(reported_by);
CREATE INDEX IX_Tickets_AssignedTo ON Tickets(assigned_to);
CREATE INDEX IX_Tickets_CreatedAt ON Tickets(created_at);
CREATE INDEX IX_TicketImages_TicketId ON TicketImages(ticket_id);
CREATE INDEX IX_TicketComments_TicketId ON TicketComments(ticket_id);
CREATE INDEX IX_TicketStatusHistory_TicketId ON TicketStatusHistory(ticket_id);

-- Insert sample data for testing (optional)
-- INSERT INTO Tickets (ticket_number, title, description, affected_point_type, affected_point_name, severity_level, reported_by)
-- VALUES ('TKT-2024-001', 'Machine Vibration Issue', 'Excessive vibration detected in production line machine', 'machine', 'Production Line A', 'high', 1);
