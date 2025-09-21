-- =====================================================
-- TICKET DAILY COUNTERS TABLE
-- Mars Abnormal Finding System - Ticket Number Generation
-- =====================================================
-- This table tracks daily case numbers for ticket generation
-- Format: TKT-YYYYMMDD-Case number (e.g., TKT-20241225-001)
-- =====================================================

CREATE TABLE TicketDailyCounters (
    -- Primary Key
    id INT IDENTITY(1,1) PRIMARY KEY,
    
    -- Date string in YYYYMMDD format
    date_str VARCHAR(8) NOT NULL UNIQUE,
    
    -- Current case number for this date
    case_number INT NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    -- Index for performance
    INDEX IX_TicketDailyCounters_date_str (date_str)
);

-- Insert initial record for today (if needed)
-- This will be handled automatically by the application
-- INSERT INTO TicketDailyCounters (date_str, case_number) 
-- VALUES (FORMAT(GETDATE(), 'yyyyMMdd'), 0);

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. This table automatically tracks daily case numbers
-- 2. Each day gets a new record with case_number starting from 1
-- 3. Case numbers are incremented atomically to prevent duplicates
-- 4. Format: TKT-YYYYMMDD-XXX (where XXX is 3-digit case number)
-- 5. Example: TKT-20241225-001, TKT-20241225-002, etc.
-- =====================================================
