# LINE FLEX Message Usage Example

This document shows how to use the new FLEX message feature for LINE notifications in the ticket system.

## Overview

The FLEX message feature provides rich, visual notifications for LINE users with:
- Hero image from ticket attachments or default image
- Structured layout with all ticket information
- Color-coded status and priority indicators
- Thai language support
- Direct link to ticket in the app

## Basic Usage

### 1. Import the lineService
```javascript
const lineService = require('../services/lineService');
```

### 2. Use FLEX Message Builders

#### Ticket Created Notification
```javascript
// Get ticket data and images
const ticket = {
  id: 1,
  ticket_number: 'TKT-20250101-001',
  title: 'เครื่องจักรหยุดทำงาน',
  description: 'แรงดันลมที่กริปเปอร์ต่ำ ทำให้หยิบชิ้นงานล้มเหลวบ่อยครั้ง',
  affected_point_name: 'พาเลทไทเซอร์ #2 – ABB OmniCore',
  severity_level: 'high',
  priority: 'urgent',
  status: 'open',
  estimated_downtime_hours: 8,
  created_at: new Date().toISOString()
};

const images = [
  {
    url: 'https://example.com/image1.jpg',
    filename: 'machine_issue.jpg'
  }
];

// Build FLEX message
const flexMessage = lineService.buildTicketCreatedFlexMessage(
  ticket, 
  'สมชาย พ.', // reporter name
  images
);

// Send to LINE user
await lineService.pushToUser(lineUserId, flexMessage);
```

#### Ticket Assigned Notification
```javascript
const flexMessage = lineService.buildTicketAssignedFlexMessage(
  ticket, 
  'ทีมซ่อมบำรุง ระดับ 2', // assignee name
  images
);

await lineService.pushToUser(assigneeLineId, flexMessage);
```

#### Status Update Notification
```javascript
const flexMessage = lineService.buildTicketStatusUpdateFlexMessage(
  ticket, 
  'open', // old status
  'in_progress', // new status
  'สมชาย พ.', // changed by name
  images
);

await lineService.pushToUser(reporterLineId, flexMessage);
```

## Integration with Ticket Controller

### Example: Update the delayed notification function

```javascript
// In ticketController.js - sendDelayedTicketNotification function
const sendDelayedTicketNotification = async (ticketId) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Get ticket information with user details
    const ticketResult = await pool.request()
      .input('ticket_id', sql.Int, ticketId)
      .query(`
        SELECT t.*, 
               r.FirstName + ' ' + r.LastName as reporter_name,
               r.LineID as reporter_line_id,
               a.FirstName + ' ' + a.LastName as assignee_name,
               a.LineID as assignee_line_id
        FROM Tickets t
        LEFT JOIN Users r ON t.reported_by = r.UserID
        LEFT JOIN Users a ON t.assigned_to = a.UserID
        WHERE t.id = @ticket_id
      `);
    
    const ticket = ticketResult.recordset[0];
    
    // Get ticket images
    const imagesResult = await pool.request()
      .input('ticket_id', sql.Int, ticketId)
      .query(`
        SELECT image_url, image_name 
        FROM TicketImages 
        WHERE ticket_id = @ticket_id 
        ORDER BY uploaded_at ASC
      `);
    
    // Convert to proper format
    const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const ticketImages = imagesResult.recordset.map(img => ({
      url: `${baseUrl}${img.image_url}`,
      filename: img.image_name
    }));
    
    // Send FLEX message to pre-assigned user
    if (ticket.assigned_to && ticket.assignee_line_id) {
      const flexMessage = lineService.buildTicketCreatedFlexMessage(
        ticket, 
        ticket.reporter_name, 
        ticketImages
      );
      await lineService.pushToUser(ticket.assignee_line_id, flexMessage);
    }
    
    // Send FLEX message to reporter
    if (ticket.reporter_line_id) {
      const flexMessage = lineService.buildTicketCreatedFlexMessage(
        ticket, 
        ticket.reporter_name, 
        ticketImages
      );
      await lineService.pushToUser(ticket.reporter_line_id, flexMessage);
    }
    
  } catch (error) {
    console.error(`Error sending FLEX notification for ticket ${ticketId}:`, error);
  }
};
```

## Available FLEX Message Types

1. **buildTicketCreatedFlexMessage** - New ticket created
2. **buildTicketAssignedFlexMessage** - Ticket assigned to user
3. **buildTicketStatusUpdateFlexMessage** - Status changed
4. **buildTicketAcceptedFlexMessage** - Ticket accepted
5. **buildTicketRejectedFlexMessage** - Ticket rejected
6. **buildJobCompletedFlexMessage** - Job completed
7. **buildTicketEscalatedFlexMessage** - Ticket escalated
8. **buildTicketClosedFlexMessage** - Ticket closed
9. **buildTicketReopenedFlexMessage** - Ticket reopened
10. **buildTicketReassignedFlexMessage** - Ticket reassigned

## Message Structure

Each FLEX message includes:

### Header Section
- **Title**: Notification type (e.g., "Ticket Created")
- **Subtitle**: Thai description
- **Hero Image**: From ticket images or default

### Ticket Information
- **Ticket Number**: Unique identifier
- **Status**: Current status with color coding
- **Priority**: Priority level with color coding

### Details Section
- **Asset**: Affected equipment/machine
- **Problem**: Description of the issue
- **Severity**: Severity level
- **Report by**: Who reported the issue
- **Assign to**: Who is assigned (if any)
- **Est. Downtime**: Estimated downtime hours
- **Request Time**: When the ticket was created

### Footer
- **Open in App Button**: Direct link to ticket

## Color Coding

### Status Colors
- **Open**: Green (#1E7D33)
- **Assigned**: Orange (#FFA500)
- **In Progress**: Blue (#0066CC)
- **Completed**: Green (#28A745)
- **Closed**: Gray (#6C757D)
- **Rejected**: Red (#DC3545)
- **Escalated**: Pink (#E83E8C)

### Priority Colors
- **Low**: Green (#28A745)
- **Normal**: Orange (#FFA500)
- **High**: Orange-Red (#FF6B35)
- **Urgent**: Red (#DC3545)
- **Critical**: Dark Red (#8B0000)

## Environment Variables

Make sure these environment variables are set:

```bash
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
BACKEND_URL=http://localhost:3001  # or your production URL
LINE_ALLOW_LOCAL_IMAGES=true  # Set to false in production
```

## Testing

Run the test script to see FLEX message examples:

```bash
cd backend
node test_flex_message.js
```

This will generate sample FLEX messages for different notification types and display the JSON structure.
