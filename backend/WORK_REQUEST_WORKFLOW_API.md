# Work Request Workflow API Implementation Guide

## 🎯 Overview

This implementation provides a complete Work Request (WR) workflow system that integrates with the existing Cedar6_Mars stored procedures. It handles the mapping between your new `Users` table and the legacy `Person`/`_secUsers` tables, and provides a simple API interface for creating work requests and managing workflow actions.

## 🔧 Key Features

- **User Mapping**: Automatic mapping between modern `Users` table and legacy `Person` table
- **Work Request Creation**: Simple API to create work requests with automatic workflow initiation
- **Workflow Actions**: Support for approve, reject, cancel, generate WO, and custom routing
- **Status Tracking**: Real-time workflow status and history tracking
- **Task Management**: User-specific workflow task inbox
- **Transaction Safety**: All operations wrapped in database transactions

## 📋 API Endpoints

### 1. Create Work Request
**POST** `/api/workrequest`

Creates a new work request and automatically starts the workflow process.

#### Request Body Example:
```json
{
  "description": "Equipment malfunction - urgent repair needed",
  "equipmentCode": "PUMP-001",
  "productionUnitId": 123,
  "urgencyId": 2,
  "requestTypeId": 1,
  "requestDate": "2024-12-01",
  "requestTime": "14:30",
  "remark": "Found during routine inspection",
  "note": "May require external contractor",
  "budgetCost": 15000.00,
  "phoneNumber": "+66-123-456789"
}
```

#### Response Example:
```json
{
  "success": true,
  "message": "Work request created and workflow started successfully",
  "data": {
    "id": 1001,
    "wrCode": "WR-2024-001001",
    "description": "Equipment malfunction - urgent repair needed",
    "status": {
      "id": 1,
      "name": "Draft",
      "workflowStatus": "10-00"
    },
    "requester": {
      "name": "John Smith",
      "phone": "+66-123-456789",
      "email": "john.smith@company.com",
      "department": "Production"
    },
    "dates": {
      "created": "20241201",
      "createdTime": "1430",
      "requested": "20241201",
      "requestedTime": "1430"
    },
    "urgency": "High",
    "remark": "Found during routine inspection",
    "note": "May require external contractor",
    "budgetCost": 15000.00
  }
}
```

### 2. Execute Workflow Action
**POST** `/api/workrequest/:id/workflow/action`

Executes a workflow action on a specific work request.

#### Request Body Examples:

**Approve:**
```json
{
  "actionType": "approve",
  "description": "Approved for maintenance work"
}
```

**Reject:**
```json
{
  "actionType": "reject",
  "reason": "Insufficient budget documentation"
}
```

**Generate Work Order:**
```json
{
  "actionType": "generate_wo",
  "woTypeId": 1,
  "assignedDeptId": 10,
  "assignedPersonId": 25,
  "assignedUserGroupId": 5
}
```

**Custom Route:**
```json
{
  "actionType": "route",
  "actionId": 150,
  "description": "Routing to engineering review"
}
```

#### Response Example:
```json
{
  "success": true,
  "message": "approve action executed successfully",
  "data": {
    "workRequest": {
      "id": 1001,
      "code": "WR-2024-001001",
      "status": {
        "id": 3,
        "name": "Approved",
        "workflowStatus": "30-00"
      },
      "workflowNode": {
        "id": 15,
        "type": "A",
        "name": "Manager Approval"
      }
    },
    "actionResult": {
      "type": "approve",
      "returnValue": 1
    },
    "recentActivity": [
      {
        "order": 2,
        "subject": "Manager Approval",
        "description": "Approved for maintenance work",
        "date": "20241201",
        "time": "1500",
        "actionBy": "Jane Manager",
        "sendFor": 1
      }
    ]
  }
}
```

### 3. Get Workflow Status
**GET** `/api/workrequest/:id/workflow/status`

Retrieves the current workflow status and available actions for a work request.

#### Response Example:
```json
{
  "success": true,
  "data": {
    "workRequest": {
      "id": 1001,
      "code": "WR-2024-001001",
      "status": {
        "id": 2,
        "name": "Pending Approval",
        "type": "U",
        "workflowStatus": "20-00",
        "stepApproveNo": "20"
      },
      "workflowNode": {
        "id": 12,
        "type": "A",
        "name": "Supervisor Approval",
        "workflowId": 1
      }
    },
    "availableActions": {
      "canApprove": true,
      "canReject": true,
      "canCancel": true,
      "canGenerateWO": false,
      "workflowActions": [
        {
          "id": 120,
          "name": "Approve",
          "description": "Approve work request",
          "sequence": 1,
          "isRouting": true,
          "fromGroup": 5,
          "toGroup": 8
        },
        {
          "id": 121,
          "name": "Reject",
          "description": "Reject and return to requester",
          "sequence": 2,
          "isRouting": true,
          "fromGroup": 5,
          "toGroup": 1
        }
      ]
    },
    "workflowHistory": [
      {
        "order": 1,
        "subject": "Initial Submission",
        "description": "Work request submitted",
        "actionId": 100,
        "date": "20241201",
        "time": "1430",
        "from": {
          "personId": 21,
          "personName": "John Smith"
        },
        "to": {
          "personId": 25,
          "personName": "Bob Supervisor",
          "userGroupId": 5
        },
        "flags": {
          "sendFor": 1,
          "approved": false,
          "notApproved": false,
          "readed": false,
          "actionCompleted": false
        }
      }
    ],
    "userContext": {
      "userId": 42,
      "personId": 25,
      "name": "Bob Supervisor",
      "departmentId": 10
    }
  }
}
```

### 4. Get My Workflow Tasks
**GET** `/api/workrequest/workflow/my-tasks?taskType=pending&page=1&limit=20`

Retrieves workflow tasks assigned to the current user.

#### Query Parameters:
- `taskType`: `pending`, `completed`, or `all` (default: `pending`)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

#### Response Example:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "workRequest": {
          "id": 1001,
          "code": "WR-2024-001001",
          "description": "Equipment malfunction - urgent repair needed",
          "requester": "John Smith",
          "requestDate": "20241201",
          "department": "Production",
          "status": {
            "id": 2,
            "name": "Pending Approval"
          },
          "urgency": {
            "code": "H",
            "name": "High"
          }
        },
        "workflow": {
          "subject": "Supervisor Approval",
          "description": "Work request requires supervisor approval",
          "eventDate": "20241201",
          "eventTime": "1430",
          "sendFor": 1,
          "flags": {
            "actionCompleted": false,
            "approved": false,
            "read": false
          }
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    },
    "summary": {
      "taskType": "pending",
      "userContext": {
        "userId": 42,
        "personId": 25,
        "name": "Bob Supervisor"
      }
    }
  }
}
```

## 🔄 Workflow Process Flow

### 1. Work Request Creation Flow
```
User API Call → getUserPersonMapping() → msp_WR_Insert → sp_WFN_EXEC_NODE_WR → Return WR Details
```

### 2. Workflow Action Flow
```
User Action → Validate User/WR → Execute SP → Update Status → Return Updated Status
```

### 3. Supported Workflow Actions

| Action Type | Stored Procedure | Description |
|-------------|------------------|-------------|
| `approve` | `sp_WF_WRApprove` | Approve work request |
| `reject` | `sp_WF_WRApprove` | Reject work request |
| `cancel` | `sp_WF_WRStatusUpdate` | Cancel work request |
| `generate_wo` | `sp_WF_WR_Generate_WO` | Generate work order |
| `route` | `sp_WFN_EXEC_NODE_WR` | Custom workflow routing |

## 🏗️ User Mapping Strategy

The system bridges your modern `Users` table with the legacy `Person` table:

### Mapping Logic:
1. **Primary Match**: Email address matching
2. **Secondary Match**: Name similarity matching
3. **Fallback**: Use Users table data with warning

### Code Example:
```javascript
const userMapping = await getUserPersonMapping(pool, userId);
// Returns:
// {
//   userId: 42,
//   personNo: 25, // Legacy Person.PERSONNO (may be null)
//   email: "user@company.com",
//   name: "John Smith",
//   deptNo: 10,
//   siteNo: 1
// }
```

## 📊 Database Interactions

### Key Tables Involved:
- **WR**: Work requests table
- **WFTrackeds**: Workflow tracking/audit trail
- **WF_NODE**: Workflow node definitions
- **WF_NODE_ACTION**: Available actions per node
- **Person**: Legacy user information
- **Users**: New authentication table

### Transaction Management:
All workflow operations use database transactions to ensure consistency:
```javascript
const transaction = new sql.Transaction(pool);
await transaction.begin();
try {
  // Execute workflow operations
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

## 🛡️ Error Handling

### Common Error Scenarios:
1. **User Not Found**: Returns 401 with authentication error
2. **Work Request Not Found**: Returns 404 with specific message
3. **Invalid Workflow Action**: Returns 400 with validation error
4. **Database Transaction Failure**: Returns 500 with rollback
5. **User Mapping Failure**: Logs warning but continues

### Error Response Format:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Technical error details"
}
```

## 🚀 Usage Examples

### Simple Work Request Creation:
```bash
curl -X POST http://localhost:5000/api/workrequest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "description": "Pump needs repair",
    "equipmentCode": "PUMP-001",
    "urgencyId": 1
  }'
```

### Approve Work Request:
```bash
curl -X POST http://localhost:5000/api/workrequest/1001/workflow/action \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "actionType": "approve",
    "description": "Approved for immediate repair"
  }'
```

### Check My Tasks:
```bash
curl "http://localhost:5000/api/workrequest/workflow/my-tasks?taskType=pending" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔧 Configuration Notes

### Required Middleware:
- `authenticateToken`: JWT authentication
- `requireL1Operator`: Role-based access control

### Environment Dependencies:
- SQL Server connection via `dbConfig`
- User authentication system with `req.user.id`

### Stored Procedure Dependencies:
- `msp_WR_Insert`: Work request creation
- `sp_WFN_EXEC_NODE_WR`: Workflow execution
- `sp_WF_WRApprove`: Approval actions
- `sp_WF_WRStatusUpdate`: Status management
- `sp_WF_WR_Generate_WO`: Work order generation

## 🎯 Next Steps & Enhancements

1. **Add file attachment support** for work requests
2. **Implement email notifications** using workflow configuration
3. **Add bulk workflow actions** for multiple work requests
4. **Create workflow reporting** and analytics endpoints
5. **Add workflow template management** for different request types

## 📞 Support & Troubleshooting

### Common Issues:
1. **User mapping fails**: Check email consistency between Users and Person tables
2. **Workflow doesn't advance**: Verify workflow configuration in WF_NODE tables
3. **Permissions errors**: Ensure user belongs to correct USERGROUP_MEMBER groups

### Debug Tips:
- Enable console logging to trace workflow execution
- Check `WFTrackeds` table for audit trail
- Verify stored procedure return values
- Monitor transaction rollbacks in logs

This implementation provides a robust foundation for work request workflow management while maintaining compatibility with your existing system architecture.
