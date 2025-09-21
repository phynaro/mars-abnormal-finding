# 🎫 New Ticket Number Generation Format

## Overview
The ticket number generation has been updated to use a more readable and organized format: **TKT-YYYYMMDD-Case number**

## Format Details

### Structure
```
TKT-YYYYMMDD-XXX
```

Where:
- **TKT**: Fixed prefix for all tickets
- **YYYYMMDD**: Date in YYYY-MM-DD format (e.g., 20241225 for December 25, 2024)
- **XXX**: 3-digit case number starting from 001 for each day

### Examples
- `TKT-20241225-001` - First ticket on December 25, 2024
- `TKT-20241225-002` - Second ticket on December 25, 2024
- `TKT-20241225-003` - Third ticket on December 25, 2024
- `TKT-20241226-001` - First ticket on December 26, 2024

## Implementation Details

### Database Table
A new table `TicketDailyCounters` tracks daily case numbers:

```sql
CREATE TABLE TicketDailyCounters (
    id INT IDENTITY(1,1) PRIMARY KEY,
    date_str VARCHAR(8) NOT NULL UNIQUE,  -- YYYYMMDD format
    case_number INT NOT NULL DEFAULT 0,  -- Current case number for the day
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
```

### Generation Process
1. **Get current date** in YYYYMMDD format
2. **Check if counter exists** for today's date
3. **Increment counter** if exists, or create new record with case_number = 1
4. **Generate ticket number** using format: `TKT-{date}-{case_number}`

### Benefits
- ✅ **Readable**: Easy to identify date and sequence
- ✅ **Organized**: Tickets grouped by date
- ✅ **Sequential**: Case numbers increment daily
- ✅ **Unique**: No duplicate ticket numbers
- ✅ **Sortable**: Natural chronological ordering

### Fallback Mechanism
If database operations fail, the system falls back to the previous timestamp-based format:
```
TKT-{timestamp}-{random}
```

## Migration Notes

### For Existing Tickets
- Existing tickets keep their current numbers
- New tickets use the new format
- No data migration required

### Database Setup
Run the following SQL script to create the required table:
```sql
-- See: backend/database/TicketDailyCounters.sql
```

### Testing
Use the test script to verify the implementation:
```sql
-- See: backend/database/test_ticket_number_generation.sql
```

## Usage Examples

### JavaScript/Node.js
```javascript
// Generate ticket number
const pool = await sql.connect(dbConfig);
const ticketNumber = await generateTicketNumber(pool);
console.log(ticketNumber); // Output: TKT-20241225-001
```

### SQL Query
```sql
-- Check current counters
SELECT date_str, case_number, 
       'TKT-' + date_str + '-' + RIGHT('000' + CAST(case_number AS VARCHAR), 3) AS sample_ticket_number
FROM TicketDailyCounters 
ORDER BY date_str DESC;
```

## Troubleshooting

### Common Issues
1. **Table doesn't exist**: Run the TicketDailyCounters.sql script
2. **Permission errors**: Ensure database user has INSERT/UPDATE permissions
3. **Duplicate key errors**: Check for concurrent ticket creation

### Monitoring
Monitor the TicketDailyCounters table to ensure proper operation:
```sql
-- Check daily ticket counts
SELECT date_str, case_number, created_at, updated_at
FROM TicketDailyCounters 
ORDER BY date_str DESC;
```
