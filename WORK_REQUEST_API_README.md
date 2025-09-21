# Work Request Management System API Documentation

## Overview

The Work Request (WR) Management System handles the initial requests for maintenance work in the Cedar6 Mars manufacturing environment. Work Requests are the precursor to Work Orders - they capture maintenance needs from operators and production staff, go through approval workflows, and eventually generate Work Orders for execution.

## Database Schema Analysis

### Core Tables

#### 1. WR (Work Requests) - Main Table
- **WRNO**: Primary key (int) - Work Request Number
- **WRCODE**: Work Request Code (nvarchar(20)) - Human-readable identifier
- **WRDATE/WRTIME**: Creation date and time
- **WRDESC**: Problem description (nvarchar(1000))
- **REQUESTERNAME**: Person who requested the work
- **WRSTATUSNO**: Status reference (int)
- **WRURGENTNO**: Urgency level reference (int)
- **RequestTypeNo**: Request type/category reference (int)
- **WONO**: Related Work Order number (int) - set when WO is generated

#### 2. WRStatus (Work Request Statuses)
- **WRSTATUSNO**: Primary key
- **WRSTATUSCODE**: Status code (10, 30, 80, 95, 99)
- **WRSTATUSNAME**: Status description
- **STATUSTYPE**: 'U' (Under process), 'S' (Stop/Completed), 'N' (Normal)

#### 3. WRUrgent (Urgency Levels)
- **WRURGENTNO**: Primary key
- **WRURGENTCODE**: Urgency code (1-5)
- **WRURGENTNAME**: Urgency description (Thai language)

#### 4. WRRequestType (Request Categories)
- **RequestTypeNo**: Primary key
- **RequestTypeCode**: Type code (IM, PJ, RM, RQ, etc.)
- **RequestTypeName**: Type description

#### 5. WRType (Work Request Types)
- **WRTypeNo**: Primary key
- **WRTypeCode**: Type code (WR)
- **WRTypeName**: Type description

#### 6. WR_Resource (Work Request Resources)
- Resources planned or requested for the work
- Materials, labor estimates
- Cost planning information

## API Endpoints

### Base URL: `/api/workrequests`

### 1. Get All Work Requests
```
GET /api/workrequests
```

**Query Parameters:**
- `page` (default: 1): Page number for pagination
- `limit` (default: 20): Number of records per page
- `status`: Filter by status ID
- `urgency`: Filter by urgency level ID
- `requestType`: Filter by request type ID
- `startDate`: Filter by start date (YYYY-MM-DD)
- `endDate`: Filter by end date (YYYY-MM-DD)
- `search`: Search in WR code, description, or requester name
- `sortBy` (default: CREATEDATE): Sort field
- `sortOrder` (default: DESC): Sort order (ASC/DESC)

**Example Response:**
```json
{
  "success": true,
  "data": {
    "workRequests": [
      {
        "id": 67383,
        "wrCode": "WR24-000001",
        "date": "20240123",
        "time": "1445",
        "description": "***Test WR salamander ชำรุด",
        "remark": null,
        "note": "",
        "budgetCost": 0,
        "requester": {
          "name": "Tanaphong Laowdee",
          "phone": "",
          "email": "",
          "requestDate": null,
          "requestTime": "0000"
        },
        "status": {
          "id": 6,
          "code": "80",
          "name": "WO Generated",
          "workflowStatus": "WO generated"
        },
        "urgency": {
          "id": 0,
          "code": null,
          "name": null
        },
        "requestType": {
          "id": 0,
          "code": null,
          "name": null
        },
        "wrType": {
          "id": 0,
          "code": null,
          "name": null
        },
        "equipment": {
          "id": 0,
          "code": null,
          "name": null
        },
        "productionUnit": {
          "id": 3605,
          "code": null,
          "name": null
        },
        "departments": {
          "requesting": {
            "code": null,
            "name": null
          },
          "receiving": {
            "code": null,
            "name": null
          }
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
        "approvals": {
          "general": {
            "approved": false,
            "date": "20240123",
            "time": "1512",
            "approvedBy": 1
          },
          "manager": {
            "approved": false,
            "date": "",
            "time": "",
            "approvedBy": 0
          },
          "coordinator": {
            "approved": false,
            "date": "",
            "time": "",
            "approvedBy": 0
          }
        },
        "schedule": {
          "startDate": null,
          "startTime": "0000",
          "finishDate": "",
          "finishTime": "",
          "duration": 0
        },
        "downtime": {
          "startDate": "20240123",
          "startTime": "1503",
          "finishDate": null,
          "finishTime": null,
          "duration": 0
        },
        "related": {
          "workOrderId": 0,
          "meterNumber": 0,
          "meterReading": 0
        },
        "imagePath": null,
        "createdDate": "20240123",
        "updatedDate": "20240123"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 850,
      "totalPages": 43,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 2. Get Work Request by ID
```
GET /api/workrequests/:id
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 67383,
    "wrCode": "WR24-000001",
    // ... (same structure as individual work request above)
    "allFields": {
      // Complete database record with all 100+ fields
    }
  }
}
```

### 3. Get Work Request Statistics
```
GET /api/workrequests/stats/overview
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total": 850,
      "pending": 45,
      "completed": 805,
      "initiated": 25,
      "approved": 15,
      "woGenerated": 765,
      "avgDowntime": 85,
      "avgBudgetCost": 2500
    },
    "byUrgency": [
      {
        "urgencyName": "หยุด/ลด กำลังการผลิต",
        "urgencyCode": "4",
        "count": 320
      },
      {
        "urgencyName": "เสี่ยงต่อการหยุด/ลด กำลังการผลิต",
        "urgencyCode": "3",
        "count": 250
      },
      {
        "urgencyName": "ไม่ปลอดภัย",
        "urgencyCode": "2",
        "count": 180
      },
      {
        "urgencyName": "มีผลต่อคุณภาพและสิ่งแวดล้อม",
        "urgencyCode": "1",
        "count": 75
      },
      {
        "urgencyName": "อื่นๆ",
        "urgencyCode": "5",
        "count": 25
      }
    ],
    "byRequestType": [
      {
        "typeName": "Request To Maintenance",
        "typeCode": "RM",
        "count": 425
      },
      {
        "typeName": "Request To Operation",
        "typeCode": "RQ",
        "count": 220
      },
      {
        "typeName": "Improvement",
        "typeCode": "IM",
        "count": 105
      },
      {
        "typeName": "Project",
        "typeCode": "PJ",
        "count": 65
      },
      {
        "typeName": "แจ้งปัญหาประเภท 1",
        "typeCode": "RQ_Type1",
        "count": 35
      }
    ]
  }
}
```

### 4. Get Work Request Types
```
GET /api/workrequests/types/list
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "WR",
      "name": "Work Request"
    }
  ]
}
```

### 5. Get Work Request Statuses
```
GET /api/workrequests/statuses/list
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "10",
      "name": "Initiated",
      "type": "U",
      "nextStatus": "30"
    },
    {
      "id": 3,
      "code": "30",
      "name": "Owner Approved",
      "type": "S",
      "nextStatus": "80"
    },
    {
      "id": 6,
      "code": "80",
      "name": "WO Generated",
      "type": "S",
      "nextStatus": "99"
    },
    {
      "id": 7,
      "code": "95",
      "name": "WR Cancel Gen WO",
      "type": "S",
      "nextStatus": ""
    },
    {
      "id": 8,
      "code": "99",
      "name": "Historied",
      "type": "N",
      "nextStatus": ""
    }
  ]
}
```

### 6. Get Work Request Urgency Levels
```
GET /api/workrequests/urgencies/list
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "1",
      "name": "มีผลต่อคุณภาพและสิ่งแวดล้อม"
    },
    {
      "id": 2,
      "code": "2",
      "name": "ไม่ปลอดภัย"
    },
    {
      "id": 3,
      "code": "3",
      "name": "เสี่ยงต่อการหยุด/ลด กำลังการผลิต"
    },
    {
      "id": 4,
      "code": "4",
      "name": "หยุด/ลด กำลังการผลิต"
    },
    {
      "id": 5,
      "code": "5",
      "name": "อื่นๆ"
    }
  ]
}
```

### 7. Get Work Request Categories
```
GET /api/workrequests/categories/list
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "IM",
      "name": "Improvement",
      "siteId": 1
    },
    {
      "id": 2,
      "code": "PJ",
      "name": "Project",
      "siteId": 1
    },
    {
      "id": 3,
      "code": "RM",
      "name": "Request To Maintenance",
      "siteId": 1
    },
    {
      "id": 4,
      "code": "RQ",
      "name": "Request To Operation",
      "siteId": 1
    },
    {
      "id": 5,
      "code": "RQ_Type1",
      "name": "แจ้งปัญหาประเภท 1",
      "siteId": 1
    },
    {
      "id": 6,
      "code": "RQ_Type2",
      "name": "แจ้งปัญหาประเภท 2",
      "siteId": 1
    },
    {
      "id": 7,
      "code": "RQ_Type3",
      "name": "แจ้งปัญหาประเภท 3",
      "siteId": 1
    }
  ]
}
```

### 8. Get Work Request Resources
```
GET /api/workrequests/:id/resources
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 5432,
      "workRequestId": 67383,
      "type": "M",
      "subType": "1",
      "name": "Replacement valve",
      "unit": "EA",
      "unitCost": 850.00,
      "quantity": 1,
      "hours": 0,
      "quantityHours": 0,
      "amount": 850.00,
      "remark": "For salamander repair",
      "isActual": false,
      "transactionDate": "20240123",
      "relatedIds": {
        "craft": null,
        "tool": null,
        "part": 8901
      },
      "createdDate": "20240123",
      "createdBy": 443
    }
  ]
}
```

## Work Request Status Workflow

```
10 (Initiated) 
    ↓
30 (Owner Approved) 
    ↓
80 (WO Generated) 
    ↓
99 (Historied)

Alternative paths:
- Any status → 95 (WR Cancel Gen WO)
```

## Urgency Levels (Thai Manufacturing Context)

| Code | Thai Name | English Translation | Priority Level |
|------|-----------|-------------------|----------------|
| 1 | มีผลต่อคุณภาพและสิ่งแวดล้อม | Affects Quality & Environment | Medium |
| 2 | ไม่ปลอดภัย | Not Safe | High |
| 3 | เสี่ยงต่อการหยุด/ลด กำลังการผลิต | Risk of Production Stop/Reduction | High |
| 4 | หยุด/ลด กำลังการผลิต | Production Stop/Reduction | Critical |
| 5 | อื่นๆ | Others | Low |

## Request Categories

| Code | Name | Description | Usage |
|------|------|-------------|-------|
| IM | Improvement | Process improvements | Enhancement requests |
| PJ | Project | Project work | Major initiatives |
| RM | Request To Maintenance | Maintenance requests | Standard maintenance |
| RQ | Request To Operation | Operational requests | Operations support |
| RQ_Type1 | แจ้งปัญหาประเภท 1 | Problem Type 1 | Specific issue category |
| RQ_Type2 | แจ้งปัญหาประเภท 2 | Problem Type 2 | Specific issue category |
| RQ_Type3 | แจ้งปัญหาประเภท 3 | Problem Type 3 | Specific issue category |

## Work Request vs Work Order Relationship

1. **Work Request (WR)**: Initial request for maintenance work
   - Created by operators/production staff
   - Goes through approval workflow
   - Contains problem description and urgency
   - Planning and resource estimation

2. **Work Order (WO)**: Actual work execution document
   - Generated from approved Work Request
   - Contains detailed work instructions
   - Resource allocation and scheduling
   - Work execution and completion tracking

**Flow**: WR Created → WR Approved → WO Generated → Work Executed → WR Historied

## Approval Workflow

The system supports multiple approval levels:

1. **General Approval** (`FLAGAPPROVE`): Basic approval
2. **Manager Approval** (`FLAGAPPROVEM`): Management level approval
3. **Coordinator Approval** (`FLAGAPPROVEC`): Coordination approval

Each approval level tracks:
- Approval flag (T/F)
- Approval date and time
- Approver ID

## Safety Requirements

Work Requests track safety requirements similar to Work Orders:
- **HotWork**: Work involving heat sources
- **ConfineSpace**: Work in confined spaces
- **WorkAtHeight**: Work at elevated positions
- **LockOutTagOut**: Energy isolation required
- **FlagSafety**: General safety considerations
- **FlagEnvironment**: Environmental impact considerations

## Date Format

All dates use `YYYYMMDD` format (e.g., "20240123" for January 23, 2024).

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

## Frontend Integration Example

```javascript
// Fetch work requests with filters
const fetchWorkRequests = async (filters = {}) => {
  const queryParams = new URLSearchParams({
    page: filters.page || 1,
    limit: filters.limit || 20,
    ...(filters.status && { status: filters.status }),
    ...(filters.urgency && { urgency: filters.urgency }),
    ...(filters.search && { search: filters.search })
  });

  const response = await fetch(`/api/workrequests?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  });

  return response.json();
};

// Get work request details
const getWorkRequestDetails = async (id) => {
  const response = await fetch(`/api/workrequests/${id}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  return response.json();
};

// Get work request statistics for dashboard
const getWorkRequestStats = async () => {
  const response = await fetch('/api/workrequests/stats/overview', {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  return response.json();
};

// Get urgency levels for dropdown
const getUrgencyLevels = async () => {
  const response = await fetch('/api/workrequests/urgencies/list', {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  return response.json();
};
```

## Database Relationships

```
WR (Work Request)
├── WRStatus (Status)
├── WRUrgent (Urgency)
├── WRRequestType (Category)
├── WRType (Type)
├── WR_Resource (Resources) [1:N]
├── EQ (Equipment) [N:1]
├── PU (Production Unit) [N:1]
├── Dept (Departments) [N:1]
├── Site (Site) [N:1]
├── Person (Users) [N:1]
└── WO (Work Order) [1:1] - Generated from WR
```

## Sample Data Summary

The system currently contains:
- **850+** work requests
- **5** status types
- **5** urgency levels
- **7** request categories/types
- **1** work request type

## Typical Usage Patterns

1. **Operator Reports Issue**: Creates WR with problem description and urgency
2. **Supervisor Reviews**: Approves or rejects the WR
3. **Maintenance Planner**: Reviews approved WRs and generates Work Orders
4. **Work Execution**: WO is executed, WR status updated to "WO Generated"
5. **Completion**: After WO completion, WR is moved to "Historied" status

## Key Differences from Work Orders

| Aspect | Work Request (WR) | Work Order (WO) |
|--------|------------------|-----------------|
| Purpose | Request for work | Work execution |
| Creator | Operators/Production | Maintenance planners |
| Status | Simple workflow | Complex execution states |
| Detail Level | Problem description | Detailed procedures |
| Resources | Estimates | Actual allocation |
| Approval | Required | Optional |

## Performance Considerations

1. **Filtering**: Use specific filters to reduce dataset size
2. **Pagination**: Always implement pagination for list views
3. **Indexing**: Database indexes on frequently queried fields
4. **Search**: Full-text search on description and requester fields

## Multilingual Support

The system contains Thai language content:
- Urgency level names are in Thai
- Some request type names are in Thai
- Consider implementing translation layer for international use

## Future Enhancements

1. **Mobile App Integration**: Field-based work request creation
2. **Image Attachments**: Visual problem documentation
3. **Integration with IoT**: Automatic WR generation from sensor data
4. **Advanced Analytics**: Pattern recognition for predictive maintenance
5. **Workflow Automation**: Rule-based approval routing
6. **Real-time Notifications**: Status change notifications
7. **Resource Planning**: Integration with inventory management

This API provides comprehensive access to the Work Request Management System, enabling frontend applications to build user-friendly interfaces for maintenance request workflows in manufacturing environments.
