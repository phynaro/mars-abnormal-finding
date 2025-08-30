# Machine Management API Documentation

This document describes the REST API endpoints for managing machines in the CMMS system.

## Base URL
```
http://localhost:3001/api/machines
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Get All Machines
**GET** `/api/machines`

Retrieves a paginated list of machines with optional filtering.

#### Query Parameters:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search in machine name, code, or location
- `department` (optional): Filter by department
- `status` (optional): Filter by status (Active, Maintenance, Inactive)
- `machineType` (optional): Filter by machine type
- `criticality` (optional): Filter by criticality (Low, Medium, High, Critical)

#### Example Request:
```bash
GET /api/machines?page=1&limit=5&department=Manufacturing&status=Active
```

#### Response:
```json
{
  "success": true,
  "data": [
    {
      "MachineID": 1,
      "MachineName": "CNC Milling Machine Alpha",
      "MachineCode": "CNC-001",
      "MachineType": "CNC Machine",
      "Manufacturer": "Haas Automation",
      "Model": "VF-2",
      "SerialNumber": "HA2024-001",
      "Location": "Production Floor A",
      "Department": "Manufacturing",
      "Status": "Active",
      "Criticality": "High"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 10,
    "pages": 2
  }
}
```

### 2. Get Machine Statistics
**GET** `/api/machines/stats`

Retrieves summary statistics about machines.

#### Response:
```json
{
  "success": true,
  "data": {
    "totalMachines": 10,
    "activeMachines": 8,
    "maintenanceMachines": 1,
    "inactiveMachines": 1,
    "criticalMachines": 3,
    "highPriorityMachines": 2,
    "maintenanceDueSoon": 2
  }
}
```

### 3. Get Machine by ID
**GET** `/api/machines/:id`

Retrieves a specific machine by its ID.

#### Example Request:
```bash
GET /api/machines/1
```

#### Response:
```json
{
  "success": true,
  "data": {
    "MachineID": 1,
    "MachineName": "CNC Milling Machine Alpha",
    "MachineCode": "CNC-001",
    "MachineType": "CNC Machine",
    "Manufacturer": "Haas Automation",
    "Model": "VF-2",
    "SerialNumber": "HA2024-001",
    "Location": "Production Floor A",
    "Department": "Manufacturing",
    "InstallationDate": "2024-01-15",
    "LastMaintenanceDate": "2024-11-01",
    "NextMaintenanceDate": "2025-02-01",
    "Status": "Active",
    "Capacity": "20\" x 16\" x 20\"",
    "PowerRating": "15 HP",
    "OperatingHours": 1840,
    "Criticality": "High",
    "AssetTag": "AST-CNC-001",
    "PurchasePrice": 85000.00,
    "CurrentValue": 78000.00,
    "WarrantyExpiryDate": "2027-01-15",
    "Notes": "Primary production machine for precision parts",
    "CreatedBy": "Admin",
    "CreatedDate": "2024-12-19T10:30:00.000Z"
  }
}
```

### 4. Create Machine
**POST** `/api/machines`

Creates a new machine.

#### Required Fields:
- `MachineName`: Name of the machine
- `MachineCode`: Unique machine code
- `MachineType`: Type/category of machine

#### Optional Fields:
- `Manufacturer`: Equipment manufacturer
- `Model`: Equipment model
- `SerialNumber`: Equipment serial number
- `Location`: Physical location
- `Department`: Organizational department
- `InstallationDate`: Installation date
- `LastMaintenanceDate`: Last maintenance date
- `NextMaintenanceDate`: Next scheduled maintenance
- `Status`: Current status (default: Active)
- `Capacity`: Machine capacity/specifications
- `PowerRating`: Power requirements
- `OperatingHours`: Current operating hours (default: 0)
- `Criticality`: Importance level (default: Medium)
- `AssetTag`: Asset tracking tag
- `PurchasePrice`: Purchase price
- `CurrentValue`: Current estimated value
- `WarrantyExpiryDate`: Warranty expiration date
- `Notes`: Additional notes
- `CreatedBy`: User creating the record

#### Example Request:
```bash
POST /api/machines
Content-Type: application/json

{
  "MachineName": "New CNC Machine",
  "MachineCode": "CNC-002",
  "MachineType": "CNC Machine",
  "Manufacturer": "Haas Automation",
  "Model": "VF-3",
  "Location": "Production Floor B",
  "Department": "Manufacturing",
  "Criticality": "High"
}
```

#### Response:
```json
{
  "success": true,
  "message": "Machine created successfully",
  "data": {
    "MachineID": 11
  }
}
```

### 5. Update Machine
**PUT** `/api/machines/:id`

Updates an existing machine.

#### Example Request:
```bash
PUT /api/machines/1
Content-Type: application/json

{
  "Status": "Maintenance",
  "NextMaintenanceDate": "2025-03-01",
  "Notes": "Scheduled for preventive maintenance"
}
```

#### Response:
```json
{
  "success": true,
  "message": "Machine updated successfully"
}
```

### 6. Delete Machine
**DELETE** `/api/machines/:id`

Soft deletes a machine (sets IsActive to false).

#### Example Request:
```bash
DELETE /api/machines/1
```

#### Response:
```json
{
  "success": true,
  "message": "Machine deleted successfully"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "MachineName, MachineCode, and MachineType are required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access token is required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Machine not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to create machine",
  "error": "Detailed error message (development only)"
}
```

## Data Types

### Machine Status Values:
- `Active`: Machine is operational
- `Maintenance`: Machine is under maintenance
- `Inactive`: Machine is not operational
- `Retired`: Machine has been retired

### Criticality Levels:
- `Low`: Non-critical equipment
- `Medium`: Standard equipment
- `High`: Important equipment
- `Critical`: Essential equipment

### Common Machine Types:
- CNC Machine
- Conveyor System
- Press Machine
- Compressor
- Laser Equipment
- Material Handling
- Robotic System
- Cooling System
- Packaging Equipment
- Power Generation

## Testing the API

You can test these endpoints using tools like:
- Postman
- cURL
- Thunder Client (VS Code extension)
- Any HTTP client

### Example cURL Commands:

#### Get all machines:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/machines
```

#### Create a machine:
```bash
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"MachineName":"Test Machine","MachineCode":"TEST-001","MachineType":"Test Equipment"}' \
     http://localhost:3001/api/machines
```

#### Update a machine:
```bash
curl -X PUT \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"Status":"Maintenance"}' \
     http://localhost:3001/api/machines/1
```

#### Delete a machine:
```bash
curl -X DELETE \
     -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/machines/1
```
