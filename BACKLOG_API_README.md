# Backlog API Documentation

## Overview

The Backlog API provides comprehensive work order backlog analysis with drill-down capabilities. It offers four main endpoints that allow users to analyze work order backlogs by department and by assigned personnel, with both summary and detailed views.

## Architecture

### Backend (Node.js + Express + MSSQL)
- **Controller**: `backend/src/controllers/backlogController.js`
- **Routes**: `backend/src/routes/backlog.js`
- **API Base**: `/api/backlog`
- **Database**: MSSQL with stored procedures
- **Authentication**: JWT token required
- **Documentation**: OpenAPI 3.0.3 (Swagger)

### Frontend (React + TypeScript)
- **Service**: `frontend/src/services/backlogService.ts`
- **Types**: Full TypeScript interfaces for type safety
- **Error Handling**: Comprehensive error handling with user-friendly messages

## API Endpoints

### 1. Get Backlog by Department

**Endpoint**: `GET /api/backlog/assign`

**Description**: Returns work order backlog grouped by department and status.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `siteNo` | integer | No | 3 | Site number |

**Response**:
```json
{
  "success": true,
  "data": {
    "backlog": [
      {
        "woStatusName": "Scheduled",
        "woStatusNo": 3,
        "deptCode": "REL-DRY",
        "count": 594,
        "total": 2360
      }
    ],
    "summary": {
      "totalWorkOrders": 2360,
      "totalDepartments": 5,
      "siteNo": 3
    }
  }
}
```

### 2. Get Backlog by Department - Detail

**Endpoint**: `GET /api/backlog/assign/lv1`

**Description**: Returns detailed work order information for a specific department.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `siteNo` | integer | No | Site number (default: 3) |
| `deptCode` | string | Yes | Department code (e.g., "REL-PP") |

**Response**:
```json
{
  "success": true,
  "data": {
    "details": [
      {
        "wono": 201636,
        "woCode": "WO24-000002",
        "deptCode": "REL-PP",
        "woStatusName": "Finish",
        "symptom": "pump leak",
        "puName": "Volumetic Pump of Filler 1"
      }
    ],
    "summary": {
      "totalWorkOrders": 10,
      "department": "REL-PP",
      "siteNo": 3,
      "statusBreakdown": {
        "Finish": 2,
        "Scheduled": 5,
        "In Progress": 3
      }
    }
  }
}
```

### 3. Get Backlog by User

**Endpoint**: `GET /api/backlog/assignto`

**Description**: Returns work order backlog grouped by assigned user and status.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `siteNo` | integer | No | 3 | Site number |

**Response**:
```json
{
  "success": true,
  "data": {
    "backlog": [
      {
        "woStatusName": "Scheduled",
        "woStatusNo": 3,
        "personName": "Aree Tatongjai",
        "count": 675,
        "total": 865
      }
    ],
    "summary": {
      "totalWorkOrders": 865,
      "totalUsers": 4,
      "siteNo": 3
    }
  }
}
```

### 4. Get Backlog by User - Detail

**Endpoint**: `GET /api/backlog/assignto/lv1`

**Description**: Returns detailed work order information for a specific user.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `siteNo` | integer | No | Site number (default: 3) |
| `personName` | string | Yes | Person name (e.g., "Aree Tatongjai") |

**Response**:
```json
{
  "success": true,
  "data": {
    "details": [
      {
        "wono": 201427,
        "woCode": "PM23-000236",
        "personName": "Aree Tatongjai",
        "woStatusName": "Scheduled",
        "symptom": "Engine Fire Pump inspection & Test runing"
      }
    ],
    "summary": {
      "totalWorkOrders": 10,
      "personName": "Aree Tatongjai",
      "siteNo": 3,
      "statusBreakdown": {
        "Scheduled": 8,
        "Finish": 1,
        "In Progress": 1
      }
    }
  }
}
```

### 5. Get Backlog by Work Order Type and Department

**Endpoint**: `GET /api/backlog/wotype-dept`

**Description**: Returns work order backlog grouped by work order type and department.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `siteNo` | integer | No | 3 | Site number |

**Response**:
```json
{
  "success": true,
  "data": {
    "backlog": [
      {
        "deptNo": 23,
        "deptCode": "REL-DRY",
        "woTypeNo": 11,
        "woTypeCode": "CI",
        "woStatusNo": 4,
        "woStatusCode": "In Progress (50)",
        "total": 93
      },
      {
        "deptNo": 26,
        "deptCode": "EE&CTRL",
        "woTypeNo": 3,
        "woTypeCode": "PML1",
        "woStatusNo": 1,
        "woStatusCode": "Work Initiated (10)",
        "total": 4
      }
    ],
    "summary": {
      "totalWorkOrders": 750,
      "totalDepartments": 5,
      "totalWOTypes": 8,
      "totalStatuses": 4,
      "siteNo": 3
    }
  }
}
```

## Database Stored Procedures

The API uses the following MSSQL stored procedures:

1. **`dbo.Dashboard_Backlog_Assign`** - Backlog by department
2. **`dbo.Dashboard_Backlog_Assign_LV1`** - Department detail drill-down
3. **`dbo.Dashboard_Backlog_AssignTo`** - Backlog by user
4. **`dbo.Dashboard_Backlog_AssignTo_LV1`** - User detail drill-down
5. **`dbo.sp_Dashboard_WorkBacklog_LV1`** - Backlog by work order type and department

## Frontend Usage

### TypeScript Service

```typescript
import { backlogService } from '@/services/backlogService';

// Get backlog by department
const departmentBacklog = await backlogService.getBacklogAssign({ siteNo: 3 });

// Get department details
const departmentDetails = await backlogService.getBacklogAssignLv1({
  siteNo: 3,
  deptCode: 'REL-PP'
});

// Get backlog by user
const userBacklog = await backlogService.getBacklogAssignTo({ siteNo: 3 });

// Get user details
const userDetails = await backlogService.getBacklogAssignToLv1({
  siteNo: 3,
  personName: 'Aree Tatongjai'
});

// Get backlog by work order type and department
const woTypeDeptBacklog = await backlogService.getBacklogByWOTypeAndDept({ siteNo: 3 });
```

### React Component Example

```typescript
import React, { useState, useEffect } from 'react';
import { backlogService, BacklogItem } from '@/services/backlogService';

const BacklogDashboard: React.FC = () => {
  const [backlog, setBacklog] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBacklog();
  }, []);

  const loadBacklog = async () => {
    setLoading(true);
    try {
      const response = await backlogService.getBacklogAssign({ siteNo: 3 });
      setBacklog(response.data.backlog);
    } catch (error) {
      console.error('Failed to load backlog:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {backlog.map((item, index) => (
            <div key={index}>
              <h3>{item.deptCode}</h3>
              <p>Status: {item.woStatusName}</p>
              <p>Count: {item.count}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

## Error Handling

### Common Error Responses

**400 Bad Request**:
```json
{
  "success": false,
  "message": "deptCode parameter is required"
}
```

**401 Unauthorized**:
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details..."
}
```

## Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Testing

### Manual Testing

Use the provided test scripts:

```bash
cd backend

# Test all backlog endpoints
node test_backlog_endpoints.js

# Test the new WOType and Department endpoint specifically
node test_wotype_dept_endpoint.js
```

**Note**: Update the `AUTH_TOKEN` variable in the test scripts with a valid JWT token.

### API Documentation

Interactive API documentation is available at:
- **Swagger UI**: `http://localhost:3001/api-docs`
- **OpenAPI Spec**: `http://localhost:3001/api-docs.json`

## Performance Considerations

### Backend
- **Stored Procedures**: Optimized database queries using stored procedures
- **Connection Pooling**: MSSQL connection pooling for better performance
- **Parameterized Queries**: Prevents SQL injection and improves performance

### Frontend
- **TypeScript**: Full type safety reduces runtime errors
- **Error Boundaries**: Implement error boundaries for better UX
- **Loading States**: Proper loading states for better user experience

## Security

### Authentication
- **JWT Tokens**: Required for all API calls
- **Middleware**: `authenticateToken` middleware validates requests
- **Permission Checks**: `requireFormPermission('WO', 'view')` ensures proper access

### Data Validation
- **Input Sanitization**: All query parameters validated
- **SQL Injection Prevention**: Parameterized stored procedure calls
- **XSS Protection**: Frontend sanitizes user inputs

## Deployment

### Backend
```bash
cd backend
npm install
npm start
# Server runs on port 3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Development server runs on port 5173
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure JWT token is valid and not expired
   - Check Authorization header format

2. **Database Connection Issues**
   - Verify MSSQL server is running
   - Check database configuration in `dbConfig.js`

3. **Stored Procedure Errors**
   - Ensure stored procedures exist in the database
   - Check parameter types and names

4. **CORS Issues**
   - Verify frontend URL is in allowed origins
   - Check CORS configuration in `app.js`

### Debug Logging

- **Backend**: Console logs in server terminal
- **Frontend**: Browser console logs
- **API**: Response logging in controller functions

## Future Enhancements

### Potential Features
1. **Export Functionality**: PDF/Excel export of backlog data
2. **Real-time Updates**: WebSocket integration for live data
3. **Advanced Filtering**: More filter options (date ranges, priority, etc.)
4. **Dashboard Integration**: Integration with existing dashboard components
5. **Mobile App**: React Native version

### Technical Improvements
1. **Caching**: Implement Redis caching for frequently accessed data
2. **Pagination**: For large datasets, implement pagination
3. **Database Optimization**: Query optimization and indexing
4. **Error Handling**: More comprehensive error handling and user feedback
5. **Accessibility**: WCAG compliance improvements

---

*Last Updated: [Current Date]*
*Version: 1.0.0*
*Maintainer: [Developer Name]*
