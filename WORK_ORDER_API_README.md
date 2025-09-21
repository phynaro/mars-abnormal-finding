# Work Order Management System API Documentation

## Overview

The Work Order Management System provides comprehensive APIs for managing maintenance work orders in the Cedar6 Mars manufacturing environment. This system tracks breakdown maintenance, preventive maintenance, corrective maintenance, and other work types.

## Database Schema Analysis

### Core Tables

#### 1. WO (Work Orders) - Main Table
- **WONO**: Primary key (int) - Work Order Number
- **WOCODE**: Work Order Code (nvarchar(20)) - Human-readable identifier
- **WODATE/WOTIME**: Creation date and time
- **WO_PROBLEM**: Problem description (nvarchar(max))
- **WO_PLAN**: Work plan (nvarchar(max))
- **WO_CAUSE**: Root cause analysis (nvarchar(max))
- **WO_ACTION**: Actions taken (nvarchar(max))
- **WOSTATUSNO**: Status reference (int)
- **WOTYPENO**: Type reference (int)
- **PRIORITYNO**: Priority reference (int)
- **RequesterName**: Person who requested the work
- **TaskProcedure**: Detailed work procedures

#### 2. WOStatus (Work Order Statuses)
- **WOSTATUSNO**: Primary key
- **WOSTATUSCODE**: Status code (10, 20, 30, 50, 70, 80, 95, 99)
- **WOSTATUSNAME**: Status description
- **STATUSTYPE**: 'N' (Normal/Active) or 'S' (Stop/Completed)

#### 3. WOType (Work Order Types)
- **WOTYPENO**: Primary key
- **WOTYPECODE**: Type code (BM, CM, PML1, PML2, PML3, etc.)
- **WOTYPENAME**: Type description
- **FlagFailure**: Indicates if it's a failure-related work order

#### 4. WOPriority (Priorities)
- **PRIORITYNO**: Primary key
- **PRIORITYCODE**: Priority code (1, 2, 3)
- **PRIORITYNAME**: Priority description

#### 5. WO_Resource (Work Order Resources)
- Materials, labor, and tools used
- Planned vs actual costs and quantities
- Resource types: Materials (M), Labor (L), Tools (T)

#### 6. WO_Task (Work Order Tasks)
- Individual tasks within a work order
- Task completion status and procedures
- Abnormal findings tracking

## API Endpoints

### Base URL: `/api/workorders`

### 1. Get All Work Orders
```
GET /api/workorders
```

**Query Parameters:**
- `page` (default: 1): Page number for pagination
- `limit` (default: 20): Number of records per page
- `status`: Filter by status ID
- `type`: Filter by work order type ID
- `priority`: Filter by priority ID
- `startDate`: Filter by start date (YYYY-MM-DD)
- `endDate`: Filter by end date (YYYY-MM-DD)
- `search`: Search in work order code, problem, or requester name
- `sortBy` (default: CREATEDATE): Sort field
- `sortOrder` (default: DESC): Sort order (ASC/DESC)

**Example Response:**
```json
{
  "success": true,
  "data": {
    "workOrders": [
      {
        "id": 201635,
        "woCode": "WO24-000001",
        "date": "20240123",
        "time": "1512",
        "problem": "***Test WR salamander ชำรุด",
        "plan": "",
        "cause": "",
        "action": null,
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
        "requester": {
          "name": "Tanaphong Laowdee",
          "phone": "",
          "email": ""
        },
        "status": {
          "id": 5,
          "code": "70",
          "name": "Finish",
          "workflowStatus": "70-2 Wait for Shift Manager's Accept"
        },
        "type": {
          "id": 1,
          "code": "BM",
          "name": "BREAKDOWN MAINTENANCE"
        },
        "priority": {
          "id": 0,
          "code": null,
          "name": null
        },
        "related": {
          "pmNo": 0,
          "eqNo": 0,
          "puNo": 3605,
          "wrNo": 67383,
          "wrCode": "WR24-000001"
        },
        "equipment": {
          "code": null,
          "name": null
        },
        "productionUnit": {
          "code": null,
          "name": null
        },
        "department": {
          "code": null,
          "name": null
        },
        "site": {
          "code": null,
          "name": null
        },
        "safety": {
          "hotWork": false,
          "confineSpace": false,
          "workAtHeight": false,
          "lockOutTagOut": false,
          "safety": false,
          "environment": false
        },
        "costs": {
          "plannedManHours": null,
          "actualManHours": null,
          "plannedMaterials": null,
          "actualMaterials": null
        },
        "evaluation": {
          "hasEvaluate": true,
          "date": "20240123",
          "time": "1600",
          "note": ""
        },
        "taskProcedure": "ซ่อมเรียบร้อยแล้ว ( เปลี่ยนอะไหล่ใหม่) *** Test",
        "createdDate": "20240123",
        "updatedDate": "20240123"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1500,
      "totalPages": 75,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 2. Get Work Order by ID
```
GET /api/workorders/:id
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 201635,
    "woCode": "WO24-000001",
    // ... (same structure as individual work order above)
    "allFields": {
      // Complete database record with all 200+ fields
    }
  }
}
```

### 3. Get Work Order Statistics
```
GET /api/workorders/stats/overview
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total": 1500,
      "active": 320,
      "completed": 1180,
      "initiated": 45,
      "inProgress": 89,
      "finished": 186,
      "avgCompletionTime": 125
    },
    "byType": [
      {
        "WOTYPENAME": "BREAKDOWN MAINTENANCE",
        "WOTYPECODE": "BM",
        "count": 450
      },
      {
        "WOTYPENAME": "PREVENTIVE LEVEL 1",
        "WOTYPECODE": "PML1",
        "count": 380
      },
      {
        "WOTYPENAME": "CORRECTIVE MAINTENANCE",
        "WOTYPECODE": "CM",
        "count": 290
      }
    ],
    "byPriority": [
      {
        "priorityName": "Within 1 Day",
        "priorityCode": "1",
        "count": 890
      },
      {
        "priorityName": "Within 7 Days",
        "priorityCode": "2",
        "count": 450
      },
      {
        "priorityName": "More than 7 Days",
        "priorityCode": "3",
        "count": 160
      }
    ]
  }
}
```

### 4. Get Work Order Types
```
GET /api/workorders/types/list
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "BM",
      "name": "BREAKDOWN MAINTENANCE",
      "parentId": 0,
      "hierarchy": "0000001",
      "level": 1,
      "groupNo": 2,
      "isProject": false,
      "isFailure": true
    },
    {
      "id": 2,
      "code": "CM",
      "name": "CORRECTIVE MAINTENANCE",
      "parentId": 0,
      "hierarchy": "0000002",
      "level": 1,
      "groupNo": 1,
      "isProject": false,
      "isFailure": false
    },
    {
      "id": 3,
      "code": "PML1",
      "name": "PREVENTIVE LEVEL 1",
      "parentId": 0,
      "hierarchy": "0000003",
      "level": 1,
      "groupNo": 1,
      "isProject": false,
      "isFailure": false
    }
  ]
}
```

### 5. Get Work Order Statuses
```
GET /api/workorders/statuses/list
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "10",
      "name": "Work Initiated",
      "type": "N",
      "nextStatus": "20"
    },
    {
      "id": 2,
      "code": "20",
      "name": "Planed Resource",
      "type": "N",
      "nextStatus": "30"
    },
    {
      "id": 3,
      "code": "30",
      "name": "Scheduled",
      "type": "N",
      "nextStatus": "50"
    },
    {
      "id": 4,
      "code": "50",
      "name": "In Progress",
      "type": "N",
      "nextStatus": "70"
    },
    {
      "id": 5,
      "code": "70",
      "name": "Finish",
      "type": "S",
      "nextStatus": "80"
    },
    {
      "id": 6,
      "code": "80",
      "name": "Close To History",
      "type": "S",
      "nextStatus": "99"
    },
    {
      "id": 8,
      "code": "95",
      "name": "Cancelld",
      "type": "S",
      "nextStatus": ""
    },
    {
      "id": 9,
      "code": "99",
      "name": "History",
      "type": "S",
      "nextStatus": ""
    }
  ]
}
```

### 6. Get Work Order Priorities
```
GET /api/workorders/priorities/list
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "1",
      "name": "Within 1 Day"
    },
    {
      "id": 2,
      "code": "2",
      "name": "Within 7 Days"
    },
    {
      "id": 3,
      "code": "3",
      "name": "More than 7 Days"
    }
  ]
}
```

### 7. Get Work Order Resources
```
GET /api/workorders/:id/resources
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 12345,
      "workOrderId": 201635,
      "type": "M",
      "subType": "1",
      "name": "Bearing SKF 6205",
      "unit": "EA",
      "unitCost": 150.00,
      "quantity": 2,
      "hours": 0,
      "quantityHours": 0,
      "amount": 300.00,
      "remark": "Replaced damaged bearing",
      "isActual": true,
      "transactionDate": "20240123",
      "transactionTime": "1530",
      "relatedIds": {
        "craft": null,
        "tool": null,
        "part": 4567,
        "person": null,
        "manHourType": null,
        "vendor": 123
      },
      "createdDate": "20240123",
      "createdBy": 443
    }
  ]
}
```

### 8. Get Work Order Tasks
```
GET /api/workorders/:id/tasks
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 98765,
      "workOrderId": 201635,
      "code": 1,
      "name": "Replace damaged bearing",
      "component": "Motor bearing housing",
      "standard": "ISO 9001",
      "procedure": "1. Stop equipment\n2. Disconnect power\n3. Remove old bearing\n4. Install new bearing\n5. Test operation",
      "date": "20240123",
      "time": "1530",
      "duration": 60,
      "actualDuration": 45,
      "isDone": true,
      "isAbnormal": false,
      "abnormalNote": null,
      "remark": "Task completed successfully",
      "finishDate": "20240123",
      "finishTime": "1615",
      "isNotComplete": false,
      "installRemove": "I",
      "serialNumber": "BRG-001",
      "images": {
        "path": "/uploads/tasks/12345.jpg",
        "name": "bearing_replacement.jpg"
      },
      "createdDate": "20240123",
      "createdBy": 443,
      "updatedDate": "20240123",
      "updatedBy": 443
    }
  ]
}
```

## Work Order Types Reference

| Code | Name | Description | Usage |
|------|------|-------------|-------|
| BM | BREAKDOWN MAINTENANCE | Emergency repairs for failed equipment | High priority, unplanned |
| CM | CORRECTIVE MAINTENANCE | Repairs based on inspection findings | Medium priority, planned |
| PML1 | PREVENTIVE LEVEL 1 | Basic preventive maintenance | Regular, scheduled |
| PML2 | PREVENTIVE LEVEL 2 | Intermediate preventive maintenance | Periodic, planned |
| PML3 | PREVENTIVE LEVEL 3 | Advanced preventive maintenance | Annual, comprehensive |
| CAL | CALIBRATION | Instrument and equipment calibration | Regulatory compliance |
| SAFETY | Safety | Safety-related maintenance work | High priority |
| CI | CONTINUOUS IMPROVEMENT | Process improvement activities | Strategic initiatives |

## Work Order Status Workflow

```
10 (Work Initiated) 
    ↓
20 (Planed Resource) 
    ↓
30 (Scheduled) 
    ↓
50 (In Progress) 
    ↓
70 (Finish) 
    ↓
80 (Close To History) 
    ↓
99 (History)

Alternative paths:
- Any status → 95 (Cancelled)
```

## Priority Levels

| Code | Name | Description | Target Response |
|------|------|-------------|-----------------|
| 1 | Within 1 Day | High priority, urgent | < 24 hours |
| 2 | Within 7 Days | Medium priority | < 7 days |
| 3 | More than 7 Days | Low priority | > 7 days |

## Safety Flags

The system tracks various safety requirements:
- **HotWork**: Work involving heat sources
- **ConfineSpace**: Work in confined spaces
- **WorkAtHeight**: Work at elevated positions
- **LockOutTagOut**: Energy isolation required
- **FlagSafety**: General safety flag
- **FlagEnvironment**: Environmental impact flag

## Resource Types

- **M**: Materials (spare parts, consumables)
- **L**: Labor (man-hours, technicians)
- **T**: Tools (equipment, instruments)

## Date Format

All dates in the system use `YYYYMMDD` format (e.g., "20240123" for January 23, 2024).

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (in development mode)"
}
```

## Authentication

All endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

- Maximum 1000 requests per hour per user
- GET requests: 10 requests per second
- POST/PUT/DELETE requests: 5 requests per second

## Frontend Integration Example

```javascript
// Fetch work orders with filters
const fetchWorkOrders = async (filters = {}) => {
  const queryParams = new URLSearchParams({
    page: filters.page || 1,
    limit: filters.limit || 20,
    ...(filters.status && { status: filters.status }),
    ...(filters.type && { type: filters.type }),
    ...(filters.search && { search: filters.search })
  });

  const response = await fetch(`/api/workorders?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  });

  return response.json();
};

// Get work order details
const getWorkOrderDetails = async (id) => {
  const response = await fetch(`/api/workorders/${id}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  return response.json();
};

// Get work order statistics for dashboard
const getWorkOrderStats = async () => {
  const response = await fetch('/api/workorders/stats/overview', {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  return response.json();
};
```

## Database Relationships

```
WO (Work Order)
├── WOStatus (Status)
├── WOType (Type)
├── WOPriority (Priority)
├── WO_Resource (Resources) [1:N]
├── WO_Task (Tasks) [1:N]
├── EQ (Equipment) [N:1]
├── PU (Production Unit) [N:1]
├── Dept (Department) [N:1]
├── Site (Site) [N:1]
└── Person (Users) [N:1]
```

## Sample Data

The system currently contains:
- **1,500+** work orders
- **16** work order types
- **8** status types
- **3** priority levels
- **504** total database tables

## Performance Considerations

1. **Pagination**: Always use pagination for large datasets
2. **Indexing**: Database tables are indexed on frequently queried fields
3. **Caching**: Consider implementing Redis caching for frequently accessed data
4. **Filtering**: Use specific filters to reduce data transfer

## Future Enhancements

1. Real-time notifications for status changes
2. Mobile app support
3. Advanced reporting and analytics
4. Integration with IoT sensors
5. Predictive maintenance algorithms
6. Workflow automation
7. Document management integration

This API provides comprehensive access to the Work Order Management System, enabling frontend applications to build rich user interfaces for maintenance management in industrial environments.
