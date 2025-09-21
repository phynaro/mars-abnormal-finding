# WorkFlow API Documentation

This document describes the WorkFlow API endpoints for the Mars Abnormal Finding System.

## Base URL
```
http://localhost:3001/api/workflow
```

## Authentication
All endpoints require authentication using JWT Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Get All WorkFlow Types
Retrieves all workflow types using the `sp_WF_WFTypes_Retrive` stored procedure.

**Endpoint:** `GET /api/workflow/types`

**Headers:**
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

**Response:**
```json
{
  "success": true,
  "message": "Workflow types retrieved successfully",
  "data": [
    {
      "WFTYPENO": 1,
      "WFTYPECODE": "WF001",
      "WFTYPENAME": "Workflow Type 1",
      // ... other fields returned by stored procedure
    }
  ],
  "count": 1
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Failed to retrieve workflow types",
  "error": "Error details (in development mode)"
}
```

### 2. Get WorkFlow Type by ID
Retrieves a specific workflow type by its ID.

**Endpoint:** `GET /api/workflow/types/:id`

**Parameters:**
- `id` (path parameter): The workflow type ID

**Headers:**
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

**Response:**
```json
{
  "success": true,
  "message": "Workflow type retrieved successfully",
  "data": {
    "WFTYPENO": 1,
    "WFTYPECODE": "WF001",
    "WFTYPENAME": "Workflow Type 1",
    // ... other fields returned by stored procedure
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Workflow type not found"
}
```

### 3. Get All WorkFlow Tracking Records
Retrieves all workflow tracking records from the `WFTrackeds` table with necessary joins to Person and UserGroup tables.

**Endpoint:** `GET /api/workflow/tracking`

**Headers:**
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of records per page (default: 20)
- `docNo` (optional): Filter by document number
- `docCode` (optional): Filter by document code (partial match)
- `wfDocFlowCode` (optional): Filter by workflow document flow code
- `fromPersonNo` (optional): Filter by from person number
- `receivePersonNo` (optional): Filter by receive person number
- `approvedFlag` (optional): Filter by approved flag (T/F)
- `readedFlag` (optional): Filter by readed flag (T/F)
- `actionFlag` (optional): Filter by action flag (T/F)
- `wfStatusCode` (optional): Filter by workflow status code
- `startDate` (optional): Filter by start date (YYYY-MM-DD)
- `endDate` (optional): Filter by end date (YYYY-MM-DD)
- `search` (optional): Search in subject, event description, or document code
- `sortBy` (optional): Sort field (default: CreatedAt)
- `sortOrder` (optional): Sort order ASC/DESC (default: DESC)

**Response:**
```json
{
  "success": true,
  "message": "Workflow tracking records retrieved successfully",
  "data": [
    {
      "DocNo": 201637,
      "DocCode": "WO24-000003",
      "WFDocFlowCode": "WO",
      "Event_Order": 1,
      "WFStepNo": 244,
      "Event_Date": "20240123",
      "Event_Time": "1542",
      "Subject": "10-1 WO generated (BM)",
      "Event_Desc": "",
      "From_PersonNo": 152,
      "Receive_PersonNo": 0,
      "Receive_UserGroupNo": 272,
      "Approved_Flag": "F",
      "Approved_PersonNo": null,
      "Approved_Date": null,
      "Approved_Time": null,
      "Readed_Flag": "F",
      "Action_Flag": "F",
      "WFStatusCode": null,
      "ApproveMassage": null,
      "DocStatusNo": 1,
      "CreatedAt": "2024-01-23T15:42:32.583Z",
      "FromPersonName": "Noppadon Masman",
      "FromPersonEmail": "",
      "FromPersonPhone": "",
      "FromPersonTitle": "",
      "ReceivePersonName": null,
      "ReceivePersonEmail": null,
      "ReceivePersonPhone": null,
      "ReceivePersonTitle": null,
      "ApprovedPersonName": null,
      "ApprovedPersonEmail": null,
      "ApprovedPersonPhone": null,
      "ApprovedPersonTitle": null,
      "ReceiveUserGroupName": "Techician Reliability Pouch",
      "ReceiveUserGroupCode": "TECH-REL-PP",
      "WFStepName": "Work Order Generation",
      "WFStepType": "START",
      "WFStepOrder": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 36,
    "totalPages": 2
  }
}
```

### 4. Get WorkFlow Tracking by Document Number
Retrieves all workflow tracking records for a specific document number.

**Endpoint:** `GET /api/workflow/tracking/doc/:docNo`

**Parameters:**
- `docNo` (path parameter): The document number

**Headers:**
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

**Response:**
```json
{
  "success": true,
  "message": "Workflow tracking records retrieved successfully",
  "data": [
    {
      "DocNo": 201637,
      "DocCode": "WO24-000003",
      "WFDocFlowCode": "WO",
      "Event_Order": 1,
      "WFStepNo": 244,
      "Event_Date": "20240123",
      "Event_Time": "1542",
      "Subject": "10-1 WO generated (BM)",
      "Event_Desc": "",
      "From_PersonNo": 152,
      "Receive_PersonNo": 0,
      "Receive_UserGroupNo": 272,
      "Approved_Flag": "F",
      "Approved_PersonNo": null,
      "Approved_Date": null,
      "Approved_Time": null,
      "Readed_Flag": "F",
      "Action_Flag": "F",
      "WFStatusCode": null,
      "ApproveMassage": null,
      "DocStatusNo": 1,
      "CreatedAt": "2024-01-23T15:42:32.583Z",
      "FromPersonName": "Noppadon Masman",
      "FromPersonEmail": "",
      "FromPersonPhone": "",
      "FromPersonTitle": "",
      "ReceivePersonName": null,
      "ReceivePersonEmail": null,
      "ReceivePersonPhone": null,
      "ReceivePersonTitle": null,
      "ApprovedPersonName": null,
      "ApprovedPersonEmail": null,
      "ApprovedPersonPhone": null,
      "ApprovedPersonTitle": null,
      "ReceiveUserGroupName": "Techician Reliability Pouch",
      "ReceiveUserGroupCode": "TECH-REL-PP",
      "WFStepName": "Work Order Generation",
      "WFStepType": "START",
      "WFStepOrder": 1
    }
  ],
  "count": 1
}

## Testing

To test the WorkFlow API endpoints, you can use the provided test script:

```bash
# Navigate to backend directory
cd backend

# Install dependencies if not already installed
npm install

# Run the test script (update AUTH_TOKEN in the script first)
node test_workflow_api.js
```

## Database Stored Procedure

The API uses the following stored procedure:
- `sp_WF_WFTypes_Retrive` - Retrieves workflow types from the database

## Permissions

All endpoints require L1 Operator level permissions or higher.

## Error Handling

The API follows standard HTTP status codes:
- `200` - Success
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `500` - Internal server error
