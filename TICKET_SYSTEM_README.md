# Ticket System for Mars Abnormal Finding

This document describes the implementation of the ticket system for reporting and managing abnormal findings in machines, areas, and equipment.

## Overview

The ticket system allows users to:
- Report abnormal findings with detailed descriptions
- Track ticket status through various stages (open, assigned, in progress, resolved, closed)
- Assign tickets to responsible parties
- Add comments and track status changes
- Monitor estimated vs actual downtime
- Filter and search tickets by various criteria

## Database Schema

### Main Tables

#### 1. Tickets
- **id**: Primary key
- **ticket_number**: Unique ticket identifier (auto-generated)
- **title**: Brief description of the abnormal finding
- **description**: Detailed description
- **machine_id/area_id/equipment_id**: References to affected equipment
- **affected_point_type**: Type of affected point (machine, area, equipment)
- **affected_point_name**: Name of the affected point
- **severity_level**: Low, Medium, High, Critical
- **status**: Open, Assigned, In Progress, Resolved, Closed
- **priority**: Low, Normal, High, Urgent
- **estimated_downtime_hours**: Estimated time to resolve
- **actual_downtime_hours**: Actual time taken
- **reported_by**: User who created the ticket
- **assigned_to**: User assigned to resolve the ticket
- **created_at/updated_at**: Timestamps
- **resolved_at/closed_at**: Resolution timestamps

#### 2. TicketImages
- Stores images related to tickets (before/after photos)
- Links to tickets with cascade delete

#### 3. TicketComments
- Stores user comments on tickets
- Includes user information and timestamps

#### 4. TicketStatusHistory
- Tracks all status changes with timestamps
- Includes notes and user who made the change

#### 5. TicketAssignments
- Tracks assignment history
- Includes assignment notes and timestamps

## Backend API Endpoints

### Base URL: `/api/tickets`

#### 1. Create Ticket
- **POST** `/`
- **Body**: Ticket creation data
- **Response**: Created ticket with ID and ticket number

#### 2. Get All Tickets
- **GET** `/`
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `status`: Filter by status
  - `priority`: Filter by priority
  - `severity_level`: Filter by severity
  - `assigned_to`: Filter by assignee
  - `reported_by`: Filter by reporter
  - `search`: Search in title, description, or affected point name

#### 3. Get Ticket by ID
- **GET** `/:id`
- **Response**: Full ticket details including images, comments, and status history

#### 4. Update Ticket
- **PUT** `/:id`
- **Body**: Fields to update
- **Features**: Automatic status change logging

#### 5. Add Comment
- **POST** `/:id/comments`
- **Body**: `{ comment: string }`

#### 6. Assign Ticket
- **POST** `/:id/assign`
- **Body**: `{ assigned_to: number, notes?: string }`
- **Features**: Automatic status update to "assigned"

#### 7. Delete Ticket
- **DELETE** `/:id`
- **Features**: Cascade delete of related data

## Frontend Components

### 1. CreateTicketModal
- Form for creating new tickets
- Includes all required fields with validation
- Auto-generates ticket numbers
- Responsive design with proper error handling

### 2. TicketList
- Main ticket management interface
- Advanced filtering and search capabilities
- Pagination support
- Action buttons for view, edit, and delete
- Status badges with color coding

### 3. EditTicketModal
- Form for updating existing tickets
- Pre-populated with current ticket data
- Status change tracking with notes
- Validation and error handling

### 4. ViewTicketModal
- Comprehensive ticket details view
- Status history timeline
- Comments section with add comment functionality
- Responsive layout for all screen sizes

## Setup Instructions

### 1. Database Setup
```sql
-- Run the SQL script in backend/database/ticket_system_tables.sql
-- This will create all necessary tables and indexes
```

### 2. Backend Setup
```bash
cd backend
npm install
# The ticket routes are automatically included in app.js
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Access the System
- Navigate to `/tickets` in your browser
- Use the sidebar navigation to access ticket management
- Create, view, edit, and manage tickets

## Features

### Ticket Creation
- **Required Fields**: Title, Description, Affected Point Name
- **Optional Fields**: Machine/Area/Equipment ID, Estimated Downtime
- **Auto-generated**: Ticket number, timestamps, reporter ID
- **Validation**: Form validation with error messages

### Ticket Management
- **Status Tracking**: Complete workflow from open to closed
- **Assignment**: Assign tickets to users with notes
- **Comments**: Add comments to track progress
- **History**: Full audit trail of all changes

### Advanced Features
- **Filtering**: By status, priority, severity, assignee, reporter
- **Search**: Full-text search across title, description, and affected point
- **Pagination**: Efficient handling of large numbers of tickets
- **Responsive Design**: Works on all device sizes

## Security Features

- **Authentication Required**: All endpoints require valid JWT tokens
- **User Context**: Tickets are created with authenticated user information
- **Permission System**: Integrates with existing user permission levels
- **Data Validation**: Server-side validation of all inputs

## Future Enhancements

### Planned Features
1. **Image Upload**: Support for before/after photos
2. **Email Notifications**: Automated notifications for status changes
3. **LINE OA Integration**: Push notifications to LINE
4. **Mobile App**: Native mobile application
5. **Advanced Reporting**: Analytics and reporting dashboard
6. **Workflow Automation**: Automated ticket routing based on rules

### Integration Points
- **User Management**: Assign tickets to users
- **Machine Management**: Link tickets to specific machines
- **Notification System**: Integrate with existing notification infrastructure
- **Reporting System**: Export ticket data for analysis

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify database configuration in `backend/src/config/dbConfig.js`
   - Ensure SQL Server is running and accessible

2. **Authentication Errors**
   - Check JWT token validity
   - Verify user permissions

3. **Frontend Build Issues**
   - Clear node_modules and reinstall dependencies
   - Check TypeScript compilation errors

### Support

For technical support or questions about the ticket system:
- Check the backend logs for detailed error messages
- Verify database table creation
- Test API endpoints with Postman or similar tools

## API Testing

Use the provided Postman collection in `mssql-mcp-node/postman/` to test the ticket system endpoints:

1. **Authentication**: First authenticate to get a JWT token
2. **Create Ticket**: Test ticket creation with various data
3. **List Tickets**: Test filtering and pagination
4. **Update Ticket**: Test status changes and updates
5. **Add Comments**: Test comment functionality
6. **Assign Tickets**: Test assignment workflow

## Performance Considerations

- **Indexes**: Database indexes on frequently queried fields
- **Pagination**: Efficient handling of large datasets
- **Caching**: Consider implementing Redis for frequently accessed data
- **Database Optimization**: Regular maintenance and query optimization

## Monitoring and Logging

- **Backend Logs**: All API calls are logged with timestamps
- **Error Tracking**: Comprehensive error handling and logging
- **Performance Metrics**: Monitor response times and database performance
- **User Activity**: Track ticket creation and modification patterns
