# Testing Work Order API

This document explains how to test the Work Order API endpoints using various testing methods.

## Prerequisites

1. **Server Running**: Make sure the backend server is running on `http://localhost:3001`
2. **Valid Credentials**: Update the username/password in test scripts if needed
3. **Node.js**: Required for Node.js test scripts
4. **cURL**: Required for shell script testing (usually pre-installed on macOS/Linux)

## Test Scripts Available

### 1. Complete Node.js Test Suite
**File**: `test_workorder_endpoints.js`

Comprehensive test suite with multiple test scenarios.

```bash
# Run all tests
node test_workorder_endpoints.js

# Quick test only
node test_workorder_endpoints.js --quick

# Test specific work order
node test_workorder_endpoints.js --quick --id=201635

# Test single work order only
node test_workorder_endpoints.js --single --id=201635
```

**Features**:
- Authentication testing
- Single work order retrieval
- Error handling (404 tests)
- Resource and task retrieval
- Performance testing
- JSON structure validation

### 2. Quick Single Work Order Test
**File**: `quick_test_single_wo.js`

Simple, focused test for getting a single work order.

```bash
# Test default work order (201635)
node quick_test_single_wo.js

# Test specific work order
node quick_test_single_wo.js 201636
```

**Features**:
- Fast single work order test
- Clean, readable output
- JSON file output
- Performance metrics

### 3. cURL Shell Script
**File**: `test_workorder_curl.sh`

Shell script using cURL for testing without Node.js dependencies.

```bash
# Make executable (first time only)
chmod +x test_workorder_curl.sh

# Test default work order
./test_workorder_curl.sh

# Test specific work order
./test_workorder_curl.sh 201636
```

**Features**:
- No Node.js dependencies
- Works on any Unix-like system
- Saves JSON responses to files
- Color-coded output
- Tests multiple endpoints

### 4. Postman Collection
**File**: `Work_Order_API_Tests.postman_collection.json`

Import into Postman for GUI-based testing.

**How to Use**:
1. Open Postman
2. Import → Upload Files → Select the JSON file
3. Run "Login" request first to get authentication token
4. Run other requests as needed

**Features**:
- Pre-built test assertions
- Environment variables for easy configuration
- Visual test results
- Request organization by category

## Test Data

### Default Test Work Order ID
- **ID**: `201635`
- **Code**: `WO24-000001`
- **Type**: Breakdown Maintenance
- **Status**: Finished

### Test Endpoints Covered

1. **GET** `/api/workorders/{id}` - Single work order
2. **GET** `/api/workorders/{id}/resources` - Work order resources  
3. **GET** `/api/workorders/{id}/tasks` - Work order tasks
4. **GET** `/api/workorders` - All work orders (paginated)
5. **GET** `/api/workorders/stats/overview` - Statistics
6. **GET** `/api/workorders/types/list` - Work order types
7. **GET** `/api/workorders/statuses/list` - Work order statuses
8. **GET** `/api/workorders/priorities/list` - Work order priorities

## Expected Response Structure

### Single Work Order Response
```json
{
  "success": true,
  "data": {
    "id": 201635,
    "woCode": "WO24-000001",
    "date": "20240123",
    "time": "1512",
    "problem": "***Test WR salamander ชำรุด",
    "status": {
      "id": 5,
      "code": "70",
      "name": "Finish"
    },
    "type": {
      "id": 1,
      "code": "BM", 
      "name": "BREAKDOWN MAINTENANCE"
    },
    "schedule": {
      "startDate": null,
      "startTime": "0000",
      "finishDate": null,
      "finishTime": "0000",
      "duration": 0
    },
    "actual": {
      "startDate": "20240123",
      "startTime": "1600", 
      "finishDate": "20240123",
      "finishTime": "1700",
      "duration": 60
    },
    "safety": {
      "hotWork": false,
      "confineSpace": false,
      "workAtHeight": false,
      "lockOutTagOut": false
    },
    "allFields": {
      // Complete database record (200+ fields)
    }
  }
}
```

## Common Test Scenarios

### 1. Basic Functionality Test
```bash
node quick_test_single_wo.js
```

### 2. Error Handling Test
```bash
node test_workorder_endpoints.js --single --id=999999
```

### 3. Performance Test
```bash
time node quick_test_single_wo.js
```

### 4. Complete API Coverage
```bash
node test_workorder_endpoints.js
```

## Troubleshooting

### Authentication Errors
- Check username/password in test scripts
- Verify server is running
- Check user permissions

### Network Errors  
- Confirm server is running on correct port (3001)
- Check firewall settings
- Verify API endpoints are correctly registered

### Permission Errors
- Ensure test user has L1Operator role or higher
- Check middleware configuration

### Data Not Found
- Verify work order ID exists in database
- Check FLAGDEL = 'F' (not deleted)
- Confirm database connection

## Output Files Generated

When running tests, the following files may be created:

- `single_wo_{ID}_test.json` - Single work order test result
- `sample_workorder_response.json` - Sample API response
- `workorder_{ID}_response.json` - cURL test result
- `workorder_{ID}_resources.json` - Resources data
- `workorder_{ID}_tasks.json` - Tasks data

## Performance Benchmarks

Expected response times:
- Single work order: < 100ms
- Work order with resources: < 200ms  
- Work order with tasks: < 150ms
- Statistics endpoint: < 300ms

JSON payload sizes:
- Single work order: ~15-25 KB
- With all related data: ~30-50 KB

## Security Considerations

- All endpoints require authentication
- JWT tokens expire (check server configuration)
- Rate limiting may apply
- Use HTTPS in production

## Integration with Frontend

These test scripts verify the API structure that the frontend expects:

1. **Structured Data**: Nested objects for logical grouping
2. **Boolean Conversion**: Flag fields converted to true/false
3. **Null Handling**: Graceful handling of null/empty values
4. **Consistent Format**: All endpoints follow same response pattern

The frontend can rely on this structure for:
- Work order detail pages
- Dashboard statistics
- Resource planning
- Task management
- Status tracking
