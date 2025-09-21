# Work Request Workflow API Documentation

## 🎯 Overview

This document provides comprehensive information about the Work Request Workflow API, including interactive documentation, testing tools, and integration examples.

## 📚 Interactive API Documentation

### **Swagger UI** (Recommended)
Access the full interactive API documentation at:
```
http://localhost:3001/api-docs
```

**Features:**
- **Try it out**: Test API endpoints directly from the browser
- **Request/Response examples**: See sample payloads and responses
- **Authentication**: Built-in JWT token management
- **Schema validation**: Automatic request validation
- **Export/Import**: Download OpenAPI spec for external tools

### **OpenAPI Specification**
Download the raw OpenAPI 3.0.3 specification:
```
http://localhost:3001/api-docs.json
```

This can be imported into:
- **Postman**: Generate collections automatically
- **Insomnia**: Import for API testing
- **Code generators**: Generate client SDKs
- **API Gateway tools**: Configure routing and validation

## 🚀 Quick Start

### 1. Start the Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Validate API specification
npm run validate-api
```

### 2. Access Documentation
Open your browser and navigate to:
```
http://localhost:3001/api-docs
```

### 3. Authentication Setup
1. Click the **"Authorize"** button in Swagger UI
2. Enter your JWT token in the format: `Bearer YOUR_JWT_TOKEN`
3. Click **"Authorize"** to apply the token to all requests

### 4. Test Your First API Call
Try the health check endpoint:
```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-12-01T14:30:00.000Z",
  "message": "Mars Abnormal Finding System API is running"
}
```

## 📋 API Endpoint Categories

### 🔧 Work Requests
- **POST** `/api/workrequest` - Create new work request with workflow
- **GET** `/api/workrequest` - List work requests (with filtering)
- **GET** `/api/workrequest/{id}` - Get work request details
- **GET** `/api/workrequest/{id}/resources` - Get work request resources

### ⚙️ Workflow Operations
- **POST** `/api/workrequest/{id}/workflow/action` - Execute workflow actions
- **GET** `/api/workrequest/{id}/workflow/status` - Get workflow status
- **GET** `/api/workrequest/workflow/my-tasks` - Get user's workflow tasks

### 📊 Statistics & Reporting
- **GET** `/api/workrequest/stats/overview` - Get work request statistics

### 🗂️ Master Data
- **GET** `/api/workrequest/types/list` - Get work request types
- **GET** `/api/workrequest/statuses/list` - Get work request statuses
- **GET** `/api/workrequest/urgencies/list` - Get urgency levels
- **GET** `/api/workrequest/categories/list` - Get request categories

## 🔒 Authentication

All API endpoints require JWT authentication. Include the token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Getting a Token
1. Login via the authentication endpoint
2. Use the returned JWT token for subsequent requests
3. Token expires based on server configuration

## 📝 Usage Examples

### Create a Work Request
```bash
curl -X POST "http://localhost:3001/api/workrequest" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Pump needs urgent repair",
    "equipmentCode": "PUMP-001",
    "urgencyId": 2,
    "requestTypeId": 1,
    "remark": "Found during routine inspection"
  }'
```

### Approve a Work Request
```bash
curl -X POST "http://localhost:3001/api/workrequest/1001/workflow/action" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actionType": "approve",
    "description": "Approved for immediate repair"
  }'
```

### Get My Workflow Tasks
```bash
curl "http://localhost:3001/api/workrequest/workflow/my-tasks?taskType=pending" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Generate Work Order
```bash
curl -X POST "http://localhost:3001/api/workrequest/1001/workflow/action" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actionType": "generate_wo",
    "assignedDeptId": 10,
    "assignedPersonId": 25
  }'
```

## 🔧 Development Tools

### Validate API Specification
```bash
npm run validate-api
```

This will:
- ✅ Validate OpenAPI 3.0.3 syntax
- 📊 Show specification statistics
- 🌐 List configured servers
- 🏷️ Display API tags and descriptions

### API Scripts
```bash
# Validate and show docs URL
npm run docs

# Alias for docs command
npm run swagger
```

## 🛠️ Integration Examples

### Postman Collection
1. Download the OpenAPI spec: `http://localhost:3001/api-docs.json`
2. In Postman: **Import** → **OpenAPI** → Select downloaded file
3. Configure environment variables:
   - `base_url`: `http://localhost:3001/api`
   - `jwt_token`: Your authentication token

### JavaScript/TypeScript Client
```javascript
// Using fetch API
const createWorkRequest = async (requestData) => {
  const response = await fetch('http://localhost:3001/api/workrequest', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  });
  
  return response.json();
};

// Usage
const newWR = await createWorkRequest({
  description: "Equipment malfunction",
  equipmentCode: "PUMP-001",
  urgencyId: 2
});
```

### Python Client
```python
import requests

class WorkRequestAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def create_work_request(self, data):
        response = requests.post(
            f'{self.base_url}/workrequest',
            json=data,
            headers=self.headers
        )
        return response.json()
    
    def get_my_tasks(self, task_type='pending'):
        response = requests.get(
            f'{self.base_url}/workrequest/workflow/my-tasks',
            params={'taskType': task_type},
            headers=self.headers
        )
        return response.json()

# Usage
api = WorkRequestAPI('http://localhost:3001/api', 'your_jwt_token')
new_wr = api.create_work_request({
    'description': 'Equipment malfunction',
    'equipmentCode': 'PUMP-001',
    'urgencyId': 2
})
```

## 📊 API Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error details"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## 🔍 Common Use Cases

### 1. **Create and Track Work Request**
```
POST /workrequest → GET /workrequest/{id}/workflow/status → Monitor progress
```

### 2. **Approval Workflow**
```
GET /workflow/my-tasks → POST /workrequest/{id}/workflow/action (approve)
```

### 3. **Work Order Generation**
```
Approve WR → POST /workrequest/{id}/workflow/action (generate_wo)
```

### 4. **Status Monitoring**
```
GET /workrequest/{id}/workflow/status → Check availableActions and history
```

## 🚨 Error Handling

### Common HTTP Status Codes
- **200**: Success
- **201**: Created (for POST operations)
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (missing/invalid token)
- **404**: Not Found (resource doesn't exist)
- **500**: Internal Server Error (system error)

### Error Response Examples
```json
// Validation Error (400)
{
  "success": false,
  "message": "Description is required",
  "error": "Validation failed"
}

// Authentication Error (401)
{
  "success": false,
  "message": "User authentication required",
  "error": "JWT token missing or invalid"
}

// Not Found Error (404)
{
  "success": false,
  "message": "Work request not found",
  "error": "No work request found with the specified ID"
}
```

## 🔧 Configuration

### Environment Variables
```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration  
DB_SERVER=192.168.0.25
DB_INSTANCE=SQLEXPRESS
DB_NAME=Cedar6_Mars
DB_USER=sa
DB_PASSWORD=your_password

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000
```

### Swagger UI Customization
The Swagger UI can be customized by editing:
```
backend/src/config/swagger.js
```

Available customizations:
- Theme colors and styling
- Request/response interceptors
- Authentication configuration
- Custom CSS and branding

## 📞 Support & Troubleshooting

### Common Issues

**1. "Cannot connect to API"**
- Verify server is running: `npm run dev`
- Check port configuration: Default is 5000
- Ensure no firewall blocking

**2. "Authentication failed"**
- Verify JWT token is valid and not expired
- Check Authorization header format: `Bearer TOKEN`
- Ensure user has required permissions (L1Operator+)

**3. "Swagger UI not loading"**
- Check OpenAPI spec validation: `npm run validate-api`
- Verify YAML syntax in `swagger/work-request-api.yaml`
- Check browser console for JavaScript errors

**4. "Database connection errors"**
- Verify database server is running
- Check connection string in `dbConfig.js`
- Ensure User → Person mapping works

### Debug Mode
Enable detailed logging by setting:
```bash
NODE_ENV=development
```

### Getting Help
1. Check the interactive documentation at `/api-docs`
2. Validate API spec: `npm run validate-api`
3. Review server logs for detailed error messages
4. Test endpoints using the Swagger UI "Try it out" feature

## 🎯 Next Steps

1. **Explore the API**: Use Swagger UI to test different endpoints
2. **Integration**: Import the OpenAPI spec into your preferred tool
3. **Customization**: Modify the YAML file for your specific needs
4. **Monitoring**: Set up logging and analytics for API usage
5. **Security**: Implement rate limiting and additional security measures

---

**Happy API Development! 🚀**

The Work Request Workflow API provides a powerful, well-documented interface for managing maintenance workflows in your CMMS system.
