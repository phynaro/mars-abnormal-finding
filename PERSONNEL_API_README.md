# Personnel Management API Documentation

This API provides comprehensive endpoints for managing personnel, departments, titles, and user groups in the Mars Abnormal Finding System.

## Base URL
```
http://localhost:3001/api/personnel
```

## Authentication
All endpoints require proper authentication. Include your authentication token in the request headers.

## Common Response Format
All endpoints return responses in the following format:
```json
{
  "success": true|false,
  "data": {...},
  "pagination": {...}, // Only for paginated endpoints
  "message": "...", // Only for errors
  "error": "..." // Only for errors
}
```

## Pagination
Paginated endpoints support the following query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search term for filtering

## API Endpoints

### 1. Person Management

#### 1.1 Get All Persons (Paginated)
```http
GET /api/personnel/persons
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search in person code, name, or email
- `deptNo` (number): Filter by department number
- `titleNo` (number): Filter by title number
- `includeDeleted` (boolean): Include deleted records (default: false)

**Example Request:**
```http
GET /api/personnel/persons?page=1&limit=20&search=admin&deptNo=1
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "PERSONNO": 1,
      "PERSONCODE": "ADMIN",
      "FIRSTNAME": "ADMIN",
      "LASTNAME": "SYSTEM",
      "PERSON_NAME": "ADMIN SYSTEM",
      "EMAIL": "test20@mail.com",
      "PHONE": null,
      "DEPTNO": 1,
      "DEPTNAME": "Applications AP",
      "DEPTCODE": "APP-AP",
      "TITLENO": 0,
      "TITLENAME": null,
      "TITLECODE": null,
      "RATE": 0,
      "SiteNo": 3,
      "FLAGDEL": "F",
      "CREATEDATE": null,
      "UPDATEDATE": "20110215"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### 1.2 Get Person by ID
```http
GET /api/personnel/persons/{id}
```

**Path Parameters:**
- `id` (number): Person number (PERSONNO)

**Example Request:**
```http
GET /api/personnel/persons/1
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "PERSONNO": 1,
    "PERSONCODE": "ADMIN",
    "FIRSTNAME": "ADMIN",
    "LASTNAME": "SYSTEM",
    "PERSON_NAME": "ADMIN SYSTEM",
    "EMAIL": "test20@mail.com",
    "PHONE": null,
    "DEPTNO": 1,
    "DEPTNAME": "Applications AP",
    "DEPTCODE": "APP-AP",
    "TITLENO": 0,
    "TITLENAME": null,
    "TITLECODE": null
  }
}
```

#### 1.3 Get Person's User Groups
```http
GET /api/personnel/persons/{id}/groups
```

**Path Parameters:**
- `id` (number): Person number (PERSONNO)

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "USERGROUPNO": 156,
      "USERGROUPCODE": "REQ",
      "USERGROUPNAME": "Requester",
      "HasPermitCancelWork": false,
      "FlagSection": "F",
      "FlagCancelQuotation": "F"
    }
  ]
}
```

### 2. Department Management

#### 2.1 Get All Departments (Paginated)
```http
GET /api/personnel/departments
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search in department code or name
- `parentDept` (number): Filter by parent department
- `includeDeleted` (boolean): Include deleted records (default: false)

**Example Request:**
```http
GET /api/personnel/departments?page=1&limit=10&search=commercial
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "DEPTNO": 2,
      "DEPTCODE": "COMMERCIAL",
      "DEPTNAME": "Commercial",
      "DEPTPARENT": 0,
      "PARENT_DEPTNAME": null,
      "PARENT_DEPTCODE": null,
      "HIERARCHYNO": "0000002",
      "CURR_LEVEL": 1,
      "SiteNo": 1,
      "UserGroupNo": 260,
      "USERGROUPNAME": "Commercial Line Manager",
      "USERGROUPCODE": "LM-COMMERCIAL",
      "PERSON_COUNT": 5,
      "FlagSection": "F",
      "FLAGDEL": "F"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

#### 2.2 Get Department by ID
```http
GET /api/personnel/departments/{id}
```

**Path Parameters:**
- `id` (number): Department number (DEPTNO)

#### 2.3 Get Department Hierarchy
```http
GET /api/personnel/departments/hierarchy
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "DEPTNO": 1,
      "DEPTCODE": "APP-AP",
      "DEPTNAME": "Applications AP",
      "DEPTPARENT": 0,
      "CURR_LEVEL": 1,
      "HIERARCHYNO": "0000001",
      "PATH": "Applications AP",
      "LEVEL": 0,
      "PERSON_COUNT": 10
    },
    {
      "DEPTNO": 15,
      "DEPTCODE": "APP-SUB",
      "DEPTNAME": "Applications Subsystem",
      "DEPTPARENT": 1,
      "CURR_LEVEL": 2,
      "HIERARCHYNO": "0000001001",
      "PATH": "Applications AP > Applications Subsystem",
      "LEVEL": 1,
      "PERSON_COUNT": 3
    }
  ]
}
```

### 3. Title Management

#### 3.1 Get All Titles (Paginated)
```http
GET /api/personnel/titles
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search in title code or name
- `parentTitle` (number): Filter by parent title
- `includeDeleted` (boolean): Include deleted records (default: false)

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "TITLENO": 3,
      "TITLECODE": "PM DRY",
      "TITLENAME": "PM DRY",
      "TITLEPARENT": 0,
      "PARENT_TITLENAME": null,
      "PARENT_TITLECODE": null,
      "SiteNo": 1,
      "PERSON_COUNT": 5,
      "FLAGDEL": "F"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "totalPages": 2
  }
}
```

#### 3.2 Get Title by ID
```http
GET /api/personnel/titles/{id}
```

**Path Parameters:**
- `id` (number): Title number (TITLENO)

### 4. User Group Management

#### 4.1 Get All User Groups (Paginated)
```http
GET /api/personnel/usergroups
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search in user group code or name

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "USERGROUPNO": 156,
      "USERGROUPCODE": "REQ",
      "USERGROUPNAME": "Requester",
      "HasPermitCancelWork": false,
      "FlagSection": "F",
      "FlagCancelQuotation": "F",
      "MEMBER_COUNT": 25,
      "DEPT_COUNT": 3
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 8,
    "totalPages": 1
  }
}
```

#### 4.2 Get User Group by ID
```http
GET /api/personnel/usergroups/{id}
```

**Path Parameters:**
- `id` (number): User group number (USERGROUPNO)

#### 4.3 Get User Group Members
```http
GET /api/personnel/usergroups/{id}/members
```

**Path Parameters:**
- `id` (number): User group number (USERGROUPNO)

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "USERGROUPNO": 73,
      "PERSON": 1,
      "PERSONCODE": "ADMIN",
      "FIRSTNAME": "ADMIN",
      "LASTNAME": "SYSTEM",
      "PERSON_NAME": "ADMIN SYSTEM",
      "EMAIL": "test20@mail.com",
      "PHONE": null,
      "DEPTNAME": "Applications AP",
      "DEPTCODE": "APP-AP",
      "TITLENAME": null,
      "TITLECODE": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### 5. Organization Statistics

#### 5.1 Get Organization Statistics
```http
GET /api/personnel/stats
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "TOTAL_PERSONS": 450,
    "TOTAL_DEPARTMENTS": 25,
    "TOTAL_TITLES": 15,
    "TOTAL_USERGROUPS": 8,
    "TOTAL_GROUP_MEMBERSHIPS": 1200,
    "PERSONS_WITH_EMAIL": 380,
    "PERSONS_WITH_PHONE": 320
  }
}
```

## Error Responses

### 404 Not Found
```json
{
  "success": false,
  "message": "Person not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Error fetching persons",
  "error": "Database connection failed"
}
```

## Database Schema Reference

### Person Table Fields
- `PERSONNO`: Primary key (int)
- `PERSONCODE`: Person code (nvarchar, 20)
- `FIRSTNAME`: First name (nvarchar, 30)
- `LASTNAME`: Last name (nvarchar, 30)
- `PERSON_NAME`: Full name (nvarchar, 200)
- `EMAIL`: Email address (nvarchar, 200)
- `PHONE`: Phone number (nvarchar, 30)
- `DEPTNO`: Department number (int, FK)
- `TITLENO`: Title number (int, FK)
- `RATE`: Rate (float)
- `SiteNo`: Site number (int)
- `FLAGDEL`: Deletion flag (varchar, 1)

### Department Table Fields
- `DEPTNO`: Primary key (int)
- `DEPTCODE`: Department code (nvarchar, 10)
- `DEPTNAME`: Department name (nvarchar, 50)
- `DEPTPARENT`: Parent department (int)
- `HIERARCHYNO`: Hierarchy number (nvarchar, 100)
- `CURR_LEVEL`: Current level (int)
- `UserGroupNo`: User group number (int, FK)
- `SiteNo`: Site number (int)
- `FLAGDEL`: Deletion flag (varchar, 1)

### Title Table Fields
- `TITLENO`: Primary key (int)
- `TITLECODE`: Title code (nvarchar, 10)
- `TITLENAME`: Title name (nvarchar, 50)
- `TITLEPARENT`: Parent title (int)
- `SiteNo`: Site number (int)
- `FLAGDEL`: Deletion flag (varchar, 1)

### UserGroup Table Fields
- `USERGROUPNO`: Primary key (int)
- `USERGROUPCODE`: User group code (nvarchar, 50)
- `USERGROUPNAME`: User group name (nvarchar, 100)
- `HasPermitCancelWork`: Permission flag (bit)
- `FlagSection`: Section flag (nvarchar, 1)
- `FlagCancelQuotation`: Cancel quotation flag (char, 1)

### UserGroup_Member Table Fields
- `USERGROUPNO`: User group number (int, FK)
- `PERSON`: Person number (int, FK)

## Example Usage

### Get all persons in a specific department
```bash
curl -X GET "http://localhost:3001/api/personnel/persons?deptNo=1&page=1&limit=20"
```

### Search for persons by name
```bash
curl -X GET "http://localhost:3001/api/personnel/persons?search=admin"
```

### Get department hierarchy
```bash
curl -X GET "http://localhost:3001/api/personnel/departments/hierarchy"
```

### Get user group members
```bash
curl -X GET "http://localhost:3001/api/personnel/usergroups/156/members"
```

### Get organization statistics
```bash
curl -X GET "http://localhost:3001/api/personnel/stats"
```

## Notes

1. All endpoints filter out deleted records by default (where `FLAGDEL` is not 'Y')
2. Search functionality is case-insensitive and uses partial matching
3. Pagination starts from page 1
4. All foreign key relationships are properly joined to provide meaningful data
5. Person count is included in department and title responses
6. Member count is included in user group responses
7. The hierarchy endpoint provides a tree-like structure of departments with full paths
8. Statistics endpoint provides useful organization-wide metrics

## Testing

You can test these endpoints using the provided curl examples or import them into Postman for easier testing. Make sure your backend server is running on the specified port (default: 3001).
