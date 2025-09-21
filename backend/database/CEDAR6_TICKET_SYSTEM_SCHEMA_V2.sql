-- =====================================================
-- CEDAR6 TICKET SYSTEM SCHEMA V2
-- Updated for Plant-Area-Line-Machine hierarchy
-- =====================================================

-- Drop existing tables if they exist (for clean migration)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TicketApproval]') AND type in (N'U'))
    DROP TABLE [dbo].[TicketApproval];

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Machine]') AND type in (N'U'))
    DROP TABLE [dbo].[Machine];

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Line]') AND type in (N'U'))
    DROP TABLE [dbo].[Line];

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Plant]') AND type in (N'U'))
    DROP TABLE [dbo].[Plant];

-- =====================================================
-- PLANT TABLE
-- =====================================================
CREATE TABLE Plant (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(500),
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g., "PLANT"
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- =====================================================
-- LINE TABLE
-- =====================================================
CREATE TABLE Line (
    id INT IDENTITY(1,1) PRIMARY KEY,
    plant_id INT NOT NULL,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(500),
    code VARCHAR(50) NOT NULL, -- e.g., "AREA"
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (plant_id) REFERENCES Plant(id) ON DELETE CASCADE
);

-- =====================================================
-- MACHINE TABLE
-- =====================================================
CREATE TABLE Machine (
    id INT IDENTITY(1,1) PRIMARY KEY,
    line_id INT NOT NULL,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(500),
    code VARCHAR(50) NOT NULL, -- e.g., "MACHINE"
    machine_number INT NOT NULL, -- e.g., "NUMBER"
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (line_id) REFERENCES Line(id) ON DELETE CASCADE
);

-- =====================================================
-- TICKET APPROVAL TABLE
-- =====================================================
CREATE TABLE TicketApproval (
    id INT IDENTITY(1,1) PRIMARY KEY,
    personno INT NOT NULL, -- Reference to Person.PERSONNO
    plant_id INT NOT NULL,
    approval_level INT NOT NULL DEFAULT 1, -- 1=Plant Level, 2=Area Level, 3=Line Level, etc.
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (personno) REFERENCES Person(PERSONNO),
    FOREIGN KEY (plant_id) REFERENCES Plant(id) ON DELETE CASCADE,
    UNIQUE(personno, plant_id, approval_level) -- One person can have one approval level per plant
);

-- =====================================================
-- UPDATE TICKETS TABLE
-- =====================================================

-- First, drop existing foreign key constraints if they exist
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Tickets_Person_ReportedBy')
    ALTER TABLE Tickets DROP CONSTRAINT FK_Tickets_Person_ReportedBy;

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Tickets_Person_AssignedTo')
    ALTER TABLE Tickets DROP CONSTRAINT FK_Tickets_Person_AssignedTo;

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Tickets_Person_EscalatedTo')
    ALTER TABLE Tickets DROP CONSTRAINT FK_Tickets_Person_EscalatedTo;

-- Drop columns that are being removed
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tickets') AND name = 'actual_downtime_hours')
    ALTER TABLE Tickets DROP COLUMN actual_downtime_hours;

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tickets') AND name = 'estimated_downtime_hours')
    ALTER TABLE Tickets DROP COLUMN estimated_downtime_hours;

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tickets') AND name = 'affected_point_type')
    ALTER TABLE Tickets DROP COLUMN affected_point_type;

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tickets') AND name = 'affected_point_name')
    ALTER TABLE Tickets DROP COLUMN affected_point_name;

-- Add new columns
ALTER TABLE Tickets ADD plant_id INT NOT NULL DEFAULT 1;
ALTER TABLE Tickets ADD line_id INT NOT NULL DEFAULT 1;
ALTER TABLE Tickets ADD machine_id INT NOT NULL DEFAULT 1;
ALTER TABLE Tickets ADD machine_number INT NOT NULL DEFAULT 1;
ALTER TABLE Tickets ADD cost_avoidance DECIMAL(15,2) NULL;
ALTER TABLE Tickets ADD downtime_avoidance_hours DECIMAL(8,2) NULL;
ALTER TABLE Tickets ADD failure_mode_id INT DEFAULT 0;
ALTER TABLE Tickets ADD approve_at DATETIME2 NULL;
ALTER TABLE Tickets ADD reject_at DATETIME2 NULL;

-- Add foreign key constraints for new columns
ALTER TABLE Tickets ADD CONSTRAINT FK_Tickets_Plant 
    FOREIGN KEY (plant_id) REFERENCES Plant(id);

ALTER TABLE Tickets ADD CONSTRAINT FK_Tickets_Line 
    FOREIGN KEY (line_id) REFERENCES Line(id);

ALTER TABLE Tickets ADD CONSTRAINT FK_Tickets_Machine 
    FOREIGN KEY (machine_id) REFERENCES Machine(id);

-- Re-add foreign key constraints for Person references
ALTER TABLE Tickets ADD CONSTRAINT FK_Tickets_Person_ReportedBy 
    FOREIGN KEY (reported_by) REFERENCES Person(PERSONNO);

ALTER TABLE Tickets ADD CONSTRAINT FK_Tickets_Person_AssignedTo 
    FOREIGN KEY (assigned_to) REFERENCES Person(PERSONNO);

ALTER TABLE Tickets ADD CONSTRAINT FK_Tickets_Person_EscalatedTo 
    FOREIGN KEY (escalated_to) REFERENCES Person(PERSONNO);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Plant indexes
CREATE INDEX IX_Plant_Code ON Plant(code);
CREATE INDEX IX_Plant_Active ON Plant(is_active);

-- Line indexes
CREATE INDEX IX_Line_PlantId ON Line(plant_id);
CREATE INDEX IX_Line_Code ON Line(code);
CREATE INDEX IX_Line_Active ON Line(is_active);

-- Machine indexes
CREATE INDEX IX_Machine_LineId ON Machine(line_id);
CREATE INDEX IX_Machine_Code ON Machine(code);
CREATE INDEX IX_Machine_Number ON Machine(machine_number);
CREATE INDEX IX_Machine_Active ON Machine(is_active);

-- TicketApproval indexes
CREATE INDEX IX_TicketApproval_Personno ON TicketApproval(personno);
CREATE INDEX IX_TicketApproval_PlantId ON TicketApproval(plant_id);
CREATE INDEX IX_TicketApproval_Level ON TicketApproval(approval_level);
CREATE INDEX IX_TicketApproval_Active ON TicketApproval(is_active);

-- Tickets indexes
CREATE INDEX IX_Tickets_PlantId ON Tickets(plant_id);
CREATE INDEX IX_Tickets_LineId ON Tickets(line_id);
CREATE INDEX IX_Tickets_MachineId ON Tickets(machine_id);
CREATE INDEX IX_Tickets_Status ON Tickets(status);
CREATE INDEX IX_Tickets_ReportedBy ON Tickets(reported_by);
CREATE INDEX IX_Tickets_AssignedTo ON Tickets(assigned_to);

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert sample Plant data
INSERT INTO Plant (name, description, code) VALUES 
('Main Plant', 'Primary manufacturing facility', 'PLANT'),
('Secondary Plant', 'Secondary production facility', 'PLANT2');

-- Insert sample Line data
INSERT INTO Line (plant_id, name, description, code) VALUES 
(1, 'Production Area A', 'Main production line A', 'AREA-A'),
(1, 'Production Area B', 'Main production line B', 'AREA-B'),
(2, 'Quality Control', 'QC and testing area', 'QC');

-- Insert sample Machine data
INSERT INTO Machine (line_id, name, description, code, machine_number) VALUES 
(1, 'Conveyor System', 'Main conveyor belt system', 'CONV', 1),
(1, 'Packaging Machine', 'Automated packaging system', 'PKG', 2),
(2, 'Quality Scanner', 'Automated quality inspection', 'SCAN', 1),
(3, 'Testing Equipment', 'Product testing machinery', 'TEST', 1);

-- Insert sample TicketApproval data
INSERT INTO TicketApproval (personno, plant_id, approval_level) VALUES 
(1, 1, 1), -- Admin has Plant Level approval
(2, 1, 2), -- Another person has Area Level approval
(1, 2, 1); -- Admin also has Plant Level approval for Plant 2

-- =====================================================
-- VIEWS FOR EASY QUERYING
-- =====================================================

-- View to get full machine hierarchy
CREATE VIEW V_MachineHierarchy AS
SELECT 
    m.id as machine_id,
    m.name as machine_name,
    m.code as machine_code,
    m.machine_number,
    l.id as line_id,
    l.name as line_name,
    l.code as line_code,
    p.id as plant_id,
    p.name as plant_name,
    p.code as plant_code,
    CONCAT(p.code, '-', l.code, '-', m.code, '-', m.machine_number) as full_code
FROM Machine m
INNER JOIN Line l ON m.line_id = l.id
INNER JOIN Plant p ON l.plant_id = p.id
WHERE m.is_active = 1 AND l.is_active = 1 AND p.is_active = 1;

-- View to get ticket details with hierarchy
CREATE VIEW V_TicketDetails AS
SELECT 
    t.*,
    p.name as plant_name,
    p.code as plant_code,
    l.name as line_name,
    l.code as line_code,
    m.name as machine_name,
    m.code as machine_code,
    CONCAT(p.code, '-', l.code, '-', m.code, '-', t.machine_number) as full_machine_code,
    pr.PERSON_NAME as reporter_name,
    pr.EMAIL as reporter_email,
    pa.PERSON_NAME as assignee_name,
    pa.EMAIL as assignee_email
FROM Tickets t
LEFT JOIN Plant p ON t.plant_id = p.id
LEFT JOIN Line l ON t.line_id = l.id
LEFT JOIN Machine m ON t.machine_id = m.id
LEFT JOIN Person pr ON t.reported_by = pr.PERSONNO
LEFT JOIN Person pa ON t.assigned_to = pa.PERSONNO;

-- =====================================================
-- STORED PROCEDURES
-- =====================================================

-- Procedure to get available approvers for a plant
CREATE PROCEDURE sp_GetPlantApprovers
    @plant_id INT
AS
BEGIN
    SELECT 
        p.PERSONNO,
        p.PERSON_NAME,
        p.EMAIL,
        ta.approval_level,
        pl.name as plant_name
    FROM Person p
    INNER JOIN TicketApproval ta ON p.PERSONNO = ta.personno
    INNER JOIN Plant pl ON ta.plant_id = pl.id
    WHERE ta.plant_id = @plant_id 
    AND ta.is_active = 1 
    AND p.FLAGDEL != 'Y'
    ORDER BY ta.approval_level DESC, p.PERSON_NAME;
END;

-- Procedure to validate machine hierarchy
CREATE PROCEDURE sp_ValidateMachineHierarchy
    @plant_code VARCHAR(50),
    @line_code VARCHAR(50),
    @machine_code VARCHAR(50),
    @machine_number INT
AS
BEGIN
    SELECT 
        m.id as machine_id,
        l.id as line_id,
        p.id as plant_id,
        CONCAT(p.code, '-', l.code, '-', m.code, '-', m.machine_number) as full_code
    FROM Machine m
    INNER JOIN Line l ON m.line_id = l.id
    INNER JOIN Plant p ON l.plant_id = p.id
    WHERE p.code = @plant_code
    AND l.code = @line_code
    AND m.code = @machine_code
    AND m.machine_number = @machine_number
    AND m.is_active = 1 
    AND l.is_active = 1 
    AND p.is_active = 1;
END;

PRINT 'CEDAR6 Ticket System Schema V2 created successfully!';
PRINT 'Tables created: Plant, Line, Machine, TicketApproval';
PRINT 'Tickets table updated with new columns';
PRINT 'Views created: V_MachineHierarchy, V_TicketDetails';
PRINT 'Stored procedures created: sp_GetPlantApprovers, sp_ValidateMachineHierarchy';
