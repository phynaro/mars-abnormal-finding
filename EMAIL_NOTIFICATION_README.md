# Email Notification System for Mars CMMS

## Overview

The ticket system now includes automatic email notifications when new tickets are created. For the demo, all notifications are sent to `phynaro@hotmail.com`.

## Features

### ✅ **Automatic Notifications**
- **New Ticket Creation**: Sends email when any ticket is created
- **Rich HTML Templates**: Professional-looking email with ticket details
- **Priority & Severity Styling**: Color-coded priority and severity levels
- **Complete Ticket Information**: All relevant ticket details included
- **Direct Ticket Links**: Clickable buttons and links to view ticket details

### 🎯 **Full Page Ticket Details**
- **Dedicated URL Paths**: Each ticket has its own URL (`/tickets/{id}`)
- **Rich Detail View**: Complete ticket information with comments and status history
- **Email Integration**: Email notifications include direct links to ticket details
- **Navigation**: Easy navigation between ticket list and individual tickets

### 📧 **Email Template Includes**
- Ticket number and title
- Full description
- Affected point (machine/area/equipment)
- Reporter name
- Priority and severity levels
- Estimated downtime (if specified)
- Creation timestamp
- Action required message

## Setup Requirements

### 1. **Environment Variables**
Make sure these are set in your `.env` file:
```bash
RESEND_API_TOKEN=your_resend_api_key_here
FROM_EMAIL=your_verified_sender_email@domain.com
```

### 2. **Resend Account**
- Sign up at [resend.com](https://resend.com)
- Get your API key
- Verify your sender domain (or use Resend's default domain for testing)

## Testing the Email System

### **Method 1: Create a Real Ticket**
1. Navigate to `/tickets` in your frontend
2. Click "Create Ticket"
3. Fill out the form and submit
4. Check `phynaro@hotmail.com` for the notification email

### **Method 2: Test Email Endpoint**
Use the test endpoint to verify email functionality:

```bash
curl -X POST http://localhost:3001/api/tickets/test-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "data": {
    "success": true,
    "messageId": "email_id_from_resend"
  }
}
```

## Email Preview

The notification email will look like this:

```
🚨 New Abnormal Finding Ticket Created - Mars CMMS
==================================================

Hello!

A new abnormal finding has been reported in the Mars CMMS System 
that requires your attention.

Ticket Details:
- Title: [Ticket Title]
- Description: [Full Description]
- Affected Point: [Machine/Area/Equipment Name]
- Reported By: [User Name]
- Priority: HIGH
- Severity: CRITICAL
- Estimated Downtime: 4 hours
- Created: [Timestamp]

Action Required: Please review this ticket and take appropriate 
action based on the severity and priority level.

You can view and manage this ticket by logging into the Mars CMMS System.
```

## Future Enhancements

### **1. Machine Responsibility System**
- Automatically determine responsible personnel based on machine/area
- Send notifications to specific users or teams
- Escalation rules for high-priority tickets

### **2. Additional Notification Types**
- Ticket status changes
- Assignment notifications
- Resolution confirmations
- Escalation alerts

### **3. Notification Preferences**
- User-configurable notification settings
- Email frequency preferences
- Priority-based filtering

## Troubleshooting

### **Common Issues:**

1. **Email Not Sending**
   - Check `RESEND_API_TOKEN` in environment variables
   - Verify `FROM_EMAIL` is set correctly
   - Check backend logs for email service errors

2. **Authentication Errors**
   - Ensure your Resend API key is valid
   - Check if your sender domain is verified

3. **Email Delivery Issues**
   - Check spam/junk folders
   - Verify recipient email address
   - Check Resend dashboard for delivery status

### **Debug Steps:**
1. Check backend console logs for email service messages
2. Use the test endpoint to verify email functionality
3. Check Resend dashboard for email delivery status
4. Verify environment variables are loaded correctly

## API Endpoints

- **POST** `/api/tickets` - Create ticket (triggers email notification)
- **POST** `/api/tickets/test-email` - Test email notification system

## Frontend Routes

- **GET** `/tickets` - Ticket management page (list view)
- **GET** `/tickets/:ticketId` - Individual ticket details page
- **GET** `/tickets/:ticketId/edit` - Edit ticket page (future enhancement)

## Security Notes

- Email notifications are sent asynchronously
- Ticket creation won't fail if email sending fails
- All email errors are logged for debugging
- Email addresses are not exposed in API responses

---

**Ready to test?** Create a new ticket or use the test endpoint to verify email notifications are working! 🎯
