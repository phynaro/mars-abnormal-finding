-- =====================================================
-- TEST SCRIPT FOR NEW TICKET NUMBER GENERATION
-- Mars Abnormal Finding System
-- =====================================================
-- This script tests the new ticket number generation format
-- Format: TKT-YYYYMMDD-Case number
-- =====================================================

-- First, create the TicketDailyCounters table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TicketDailyCounters' AND xtype='U')
BEGIN
    CREATE TABLE TicketDailyCounters (
        id INT IDENTITY(1,1) PRIMARY KEY,
        date_str VARCHAR(8) NOT NULL UNIQUE,
        case_number INT NOT NULL DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    
    CREATE INDEX IX_TicketDailyCounters_date_str ON TicketDailyCounters (date_str);
    PRINT 'TicketDailyCounters table created successfully';
END
ELSE
BEGIN
    PRINT 'TicketDailyCounters table already exists';
END

-- Test the ticket number generation logic
DECLARE @date_str VARCHAR(8) = FORMAT(GETDATE(), 'yyyyMMdd');
DECLARE @case_number INT;

-- Simulate the ticket number generation process
IF EXISTS (SELECT 1 FROM TicketDailyCounters WHERE date_str = @date_str)
BEGIN
    UPDATE TicketDailyCounters 
    SET case_number = case_number + 1 
    WHERE date_str = @date_str;
    
    SELECT @case_number = case_number FROM TicketDailyCounters WHERE date_str = @date_str;
    PRINT 'Updated existing counter for date: ' + @date_str;
END
ELSE
BEGIN
    INSERT INTO TicketDailyCounters (date_str, case_number) 
    VALUES (@date_str, 1);
    
    SET @case_number = 1;
    PRINT 'Created new counter for date: ' + @date_str;
END

-- Generate sample ticket numbers
DECLARE @ticket_number VARCHAR(20) = 'TKT-' + @date_str + '-' + RIGHT('000' + CAST(@case_number AS VARCHAR), 3);
PRINT 'Generated ticket number: ' + @ticket_number;

-- Show current state
SELECT 
    date_str,
    case_number,
    'TKT-' + date_str + '-' + RIGHT('000' + CAST(case_number AS VARCHAR), 3) AS sample_ticket_number,
    created_at,
    updated_at
FROM TicketDailyCounters 
WHERE date_str = @date_str;

-- Test multiple generations for the same day
PRINT 'Testing multiple ticket generations for the same day...';

-- Generate 5 more ticket numbers
DECLARE @i INT = 1;
WHILE @i <= 5
BEGIN
    UPDATE TicketDailyCounters 
    SET case_number = case_number + 1 
    WHERE date_str = @date_str;
    
    SELECT @case_number = case_number FROM TicketDailyCounters WHERE date_str = @date_str;
    SET @ticket_number = 'TKT-' + @date_str + '-' + RIGHT('000' + CAST(@case_number AS VARCHAR), 3);
    PRINT 'Ticket ' + CAST(@i AS VARCHAR) + ': ' + @ticket_number;
    
    SET @i = @i + 1;
END

-- Show final state
PRINT 'Final state:';
SELECT 
    date_str,
    case_number,
    'TKT-' + date_str + '-' + RIGHT('000' + CAST(case_number AS VARCHAR), 3) AS latest_ticket_number,
    created_at,
    updated_at
FROM TicketDailyCounters 
WHERE date_str = @date_str;

-- Clean up test data (optional)
-- DELETE FROM TicketDailyCounters WHERE date_str = @date_str;
-- PRINT 'Test data cleaned up';

PRINT 'Test completed successfully!';
PRINT 'New ticket number format: TKT-YYYYMMDD-XXX';
PRINT 'Example: TKT-20241225-001, TKT-20241225-002, etc.';
