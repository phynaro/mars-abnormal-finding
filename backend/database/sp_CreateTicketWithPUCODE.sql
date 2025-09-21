-- =====================================================
-- STORED PROCEDURE FOR TICKET CREATION WITH PUCODE VALIDATION
-- =====================================================

CREATE PROCEDURE sp_CreateTicketWithPUCODE
    @ticket_number VARCHAR(20),
    @title NVARCHAR(255),
    @description NVARCHAR(MAX),
    @pucode VARCHAR(100), -- Format: PLANT-AREA-LINE-MACHINE-NUMBER
    @severity_level VARCHAR(20) = 'medium',
    @priority VARCHAR(20) = 'normal',
    @cost_avoidance DECIMAL(15,2) = NULL,
    @downtime_avoidance_hours DECIMAL(8,2) = NULL,
    @failure_mode_id INT = 0,
    @reported_by INT,
    @assigned_to INT = NULL,
    @escalated_to INT = NULL,
    @escalation_reason NVARCHAR(500) = NULL,
    @rejection_reason NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @plant_id INT, @area_id INT, @line_id INT, @machine_id INT, @machine_number INT;
    DECLARE @error_message NVARCHAR(500) = '';
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Parse PUCODE: PLANT-AREA-LINE-MACHINE-NUMBER
        DECLARE @parts TABLE (
            part_number INT,
            part_value VARCHAR(50)
        );
        
        -- Split PUCODE by dashes
        DECLARE @pos INT = 1;
        DECLARE @next_pos INT;
        DECLARE @part_count INT = 0;
        
        WHILE @pos <= LEN(@pucode)
        BEGIN
            SET @next_pos = CHARINDEX('-', @pucode, @pos);
            IF @next_pos = 0 SET @next_pos = LEN(@pucode) + 1;
            
            SET @part_count = @part_count + 1;
            INSERT INTO @parts VALUES (@part_count, SUBSTRING(@pucode, @pos, @next_pos - @pos));
            SET @pos = @next_pos + 1;
        END;
        
        -- Validate PUCODE has exactly 5 parts
        IF @part_count != 5
        BEGIN
            SET @error_message = 'Invalid PUCODE format. Expected: PLANT-AREA-LINE-MACHINE-NUMBER';
            RAISERROR(@error_message, 16, 1);
        END;
        
        -- Extract parts
        DECLARE @plant_code VARCHAR(50), @area_code VARCHAR(50), @line_code VARCHAR(50), @machine_code VARCHAR(50);
        SELECT @plant_code = part_value FROM @parts WHERE part_number = 1;
        SELECT @area_code = part_value FROM @parts WHERE part_number = 2;
        SELECT @line_code = part_value FROM @parts WHERE part_number = 3;
        SELECT @machine_code = part_value FROM @parts WHERE part_number = 4;
        SELECT @machine_number = CAST(part_value AS INT) FROM @parts WHERE part_number = 5;
        
        -- Validate and get IDs
        SELECT @plant_id = id FROM Plant WHERE code = @plant_code AND is_active = 1;
        IF @plant_id IS NULL
        BEGIN
            SET @error_message = 'Plant not found: ' + @plant_code;
            RAISERROR(@error_message, 16, 1);
        END;
        
        SELECT @area_id = id FROM Area WHERE code = @area_code AND plant_id = @plant_id AND is_active = 1;
        IF @area_id IS NULL
        BEGIN
            SET @error_message = 'Area not found: ' + @area_code + ' for plant: ' + @plant_code;
            RAISERROR(@error_message, 16, 1);
        END;
        
        SELECT @line_id = id FROM Line WHERE code = @line_code AND area_id = @area_id AND is_active = 1;
        IF @line_id IS NULL
        BEGIN
            SET @error_message = 'Line not found: ' + @line_code + ' for area: ' + @area_code;
            RAISERROR(@error_message, 16, 1);
        END;
        
        SELECT @machine_id = id FROM Machine WHERE code = @machine_code AND line_id = @line_id AND machine_number = @machine_number AND is_active = 1;
        IF @machine_id IS NULL
        BEGIN
            SET @error_message = 'Machine not found: ' + @machine_code + '-' + CAST(@machine_number AS VARCHAR) + ' for line: ' + @line_code;
            RAISERROR(@error_message, 16, 1);
        END;
        
        -- Validate person references
        IF NOT EXISTS (SELECT 1 FROM Person WHERE PERSONNO = @reported_by AND FLAGDEL != 'Y')
        BEGIN
            SET @error_message = 'Reporter not found or inactive: ' + CAST(@reported_by AS VARCHAR);
            RAISERROR(@error_message, 16, 1);
        END;
        
        IF @assigned_to IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Person WHERE PERSONNO = @assigned_to AND FLAGDEL != 'Y')
        BEGIN
            SET @error_message = 'Assignee not found or inactive: ' + CAST(@assigned_to AS VARCHAR);
            RAISERROR(@error_message, 16, 1);
        END;
        
        IF @escalated_to IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Person WHERE PERSONNO = @escalated_to AND FLAGDEL != 'Y')
        BEGIN
            SET @error_message = 'Escalated person not found or inactive: ' + CAST(@escalated_to AS VARCHAR);
            RAISERROR(@error_message, 16, 1);
        END;
        
        -- Insert ticket
        INSERT INTO Tickets (
            ticket_number, title, description,
            plant_id, area_id, line_id, machine_id, machine_number,
            severity_level, priority,
            cost_avoidance, downtime_avoidance_hours, failure_mode_id,
            reported_by, assigned_to, escalated_to,
            escalation_reason, rejection_reason,
            status, created_at, updated_at
        ) VALUES (
            @ticket_number, @title, @description,
            @plant_id, @area_id, @line_id, @machine_id, @machine_number,
            @severity_level, @priority,
            @cost_avoidance, @downtime_avoidance_hours, @failure_mode_id,
            @reported_by, @assigned_to, @escalated_to,
            @escalation_reason, @rejection_reason,
            'open', GETDATE(), GETDATE()
        );
        
        DECLARE @ticket_id INT = SCOPE_IDENTITY();
        
        -- Log status change
        INSERT INTO TicketStatusHistory (ticket_id, new_status, changed_by, changed_at)
        VALUES (@ticket_id, 'open', @reported_by, GETDATE());
        
        -- Return success with ticket details
        SELECT 
            @ticket_id as ticket_id,
            @ticket_number as ticket_number,
            @plant_id as plant_id,
            @area_id as area_id,
            @line_id as line_id,
            @machine_id as machine_id,
            @machine_number as machine_number,
            @pucode as full_pucode,
            'SUCCESS' as status,
            'Ticket created successfully' as message;
        
        COMMIT TRANSACTION;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        -- Return error details
        SELECT 
            NULL as ticket_id,
            @ticket_number as ticket_number,
            NULL as plant_id,
            NULL as area_id,
            NULL as line_id,
            NULL as machine_id,
            NULL as machine_number,
            @pucode as full_pucode,
            'ERROR' as status,
            ERROR_MESSAGE() as message;
    END CATCH
END;
