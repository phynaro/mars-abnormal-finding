# Database Connection Troubleshooting Guide

## Current Issue
The database connection is failing because the SQL Server at `192.168.0.25\SQLEXPRESS` is not accessible.

## Root Cause Analysis
1. **Environment Variables**: ✅ Properly configured in `.env` file
2. **Database Configuration**: ✅ Correctly set up in `dbConfig.js`
3. **Network Connectivity**: ❌ SQL Server at `192.168.0.25` is not reachable
4. **Database Name Mismatch**: ⚠️ Backend uses `Cedar6_Mars`, MCP uses `Cedar5_Mars`

## Solutions

### Option 1: Fix Network Connectivity (Recommended)
1. **Check if SQL Server is running** on `192.168.0.25`:
   ```bash
   ping 192.168.0.25
   telnet 192.168.0.25 1433
   ```

2. **Verify SQL Server configuration**:
   - Ensure SQL Server service is running
   - Check if TCP/IP protocol is enabled
   - Verify SQL Server Browser service is running (for named instances)
   - Confirm firewall allows port 1433

3. **Test connection from SQL Server Management Studio**:
   - Connect to `192.168.0.25\SQLEXPRESS`
   - Verify authentication works with `sa` user

### Option 2: Use Local SQL Server
If you have SQL Server installed locally:

1. **Update `.env` file**:
   ```env
   DB_SERVER=localhost
   DB_INSTANCE=SQLEXPRESS
   DB_PORT=1433
   DB_NAME=Cedar6_Mars
   DB_USER=sa
   DB_PASSWORD=your_local_password
   ```

2. **Test connection**:
   ```bash
   cd backend
   node test_db_connection.js
   ```

### Option 3: Use Different Database Server
Update the `.env` file with a different server:
```env
DB_SERVER=your-server-ip
DB_INSTANCE=SQLEXPRESS
DB_PORT=1433
DB_NAME=Cedar6_Mars
DB_USER=sa
DB_PASSWORD=your_password
```

## Database Name Consistency
Fix the database name mismatch:
- Backend: `Cedar6_Mars` ✅
- MCP Node: `Cedar5_Mars` ❌ (should be `Cedar6_Mars`)

Update `mssql-mcp-node/.env`:
```env
MSSQL_DATABASE=Cedar6_Mars
```

## Testing Commands

### Test Network Connectivity
```bash
# Test ping
ping 192.168.0.25

# Test port connectivity
telnet 192.168.0.25 1433
# or
nc -zv 192.168.0.25 1433
```

### Test Database Connection
```bash
cd backend
node test_db_connection.js
```

### Test Backend Database Integration
```bash
cd backend
node test_ticket_system.js
```

## Common Issues and Solutions

### 1. "Could not connect (sequence)" Error
- **Cause**: SQL Server not running or network unreachable
- **Solution**: Check SQL Server service and network connectivity

### 2. "Login failed" Error
- **Cause**: Wrong username/password or SQL Server authentication mode
- **Solution**: Verify credentials and enable SQL Server authentication

### 3. "Cannot open database" Error
- **Cause**: Database doesn't exist or user lacks permissions
- **Solution**: Create database or grant permissions to user

### 4. "Named instance not found" Error
- **Cause**: SQL Server Browser service not running
- **Solution**: Start SQL Server Browser service

## Next Steps
1. Choose one of the solutions above
2. Update the `.env` file accordingly
3. Test the connection using the provided scripts
4. Run the backend server to verify everything works

## Files Modified
- `backend/.env` - Database configuration
- `mssql-mcp-node/.env` - MCP database configuration
- `backend/test_db_connection.js` - Connection testing script
