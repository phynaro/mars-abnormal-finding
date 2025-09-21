# WorkFlow API Testing Tool

## Overview
This shell script provides a menu-driven interface for testing the WorkFlow API endpoints with built-in authentication.

## Features
- 🔐 **Login Integration**: Built-in login functionality to get authentication tokens
- 🎨 **Colored Output**: Easy-to-read colored status messages
- 📋 **Menu System**: Hierarchical menu structure for easy navigation
- 🔍 **JSON Parsing**: Automatic JSON response formatting using `jq`
- ✅ **Error Handling**: Comprehensive error checking and user feedback

## Prerequisites
- `curl` - For making HTTP requests
- `jq` - For parsing JSON responses

### Installation
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq

# CentOS/RHEL
sudo yum install jq
```

## Usage

### 1. Make the script executable
```bash
chmod +x backend/test_workflow_api.sh
```

### 2. Run the script
```bash
cd backend
./test_workflow_api.sh
```

### 3. Follow the menu prompts
1. **Login** - Enter your email and password
2. **Select API Group** - Choose "WorkFlow API"
3. **Select Endpoint** - Choose the specific endpoint to test

## Menu Structure

```
Main Menu
├── 1. Login (if not authenticated)
├── 2. Select API group (if authenticated)
│   └── WorkFlow API
│       ├── 1. Get all workflow types
│       ├── 2. Get workflow type by ID
│       └── 3. Back to main menu
├── 2. Logout (if authenticated)
└── 3. Exit
```

## Configuration
The script uses the following default configuration:
- **Base URL**: `http://localhost:3001/api`
- **Login Endpoint**: `/auth/login`
- **WorkFlow Endpoints**: `/workflow/types`

## Testing Workflow

1. **Start the backend server** (if not already running)
2. **Run the test script**: `./test_workflow_api.sh`
3. **Login** with valid credentials
4. **Select "WorkFlow API"** from the API groups menu
5. **Choose an endpoint** to test:
   - **Get all workflow types** - Tests `GET /api/workflow/types`
   - **Get workflow type by ID** - Tests `GET /api/workflow/types/:id`
6. **Review the response** - JSON formatted output with status indicators

## Example Output

```
================================
  Mars Abnormal Finding System
      API Testing Tool
================================

=== Main Menu ===

1. Login
2. Exit

Select option (1-2): 1

=== Login ===

Enter email: user@example.com
Enter password: ********
[INFO] Attempting to login...
[INFO] Login successful! Token obtained.

=== API Groups ===

1. WorkFlow API
2. Exit

Select API group (1-2): 1

=== WorkFlow Types API Testing ===

1. Get all workflow types
2. Get workflow type by ID
3. Back to main menu

Select option (1-3): 1

[INFO] Testing GET /api/workflow/types

Response:
{
  "success": true,
  "message": "Workflow types retrieved successfully",
  "data": [
    {
      "WFTYPENO": 1,
      "WFTYPECODE": "WF001",
      "WFTYPENAME": "Standard Workflow"
    }
  ],
  "count": 1
}

[INFO] ✅ Request successful!
[INFO] Found 1 workflow types

Press Enter to continue...
```

## Error Handling
The script handles various error scenarios:
- ❌ **Authentication failures** - Clear error messages for login issues
- ❌ **Network errors** - Connection timeout and server unreachable
- ❌ **Invalid responses** - Malformed JSON or unexpected response format
- ❌ **Missing dependencies** - Checks for required tools (`curl`, `jq`)

## Extending the Script
To add more API endpoints:
1. Add new test functions following the existing pattern
2. Update the menu options in the appropriate function
3. Add the new functions to the case statements

## Troubleshooting

### Common Issues
1. **"jq is not installed"** - Install jq using the commands above
2. **"Connection refused"** - Make sure the backend server is running
3. **"Login failed"** - Check your credentials and server status
4. **"Permission denied"** - Make sure the script is executable: `chmod +x test_workflow_api.sh`
