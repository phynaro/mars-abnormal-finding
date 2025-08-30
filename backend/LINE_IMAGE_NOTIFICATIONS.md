# LINE Image Notifications for Ticket System

## Overview
The ticket system now supports sending LINE notifications with images for the pre-assignment step. When a ticket is created with a pre-assigned user, the LINE notification will include both the text message and any attached images.

## How It Works

### 1. Image Detection
When a ticket is created, the system automatically checks if there are any images attached to the ticket:
- Queries the `TicketImages` table for the ticket ID
- Orders images by creation date (oldest first)
- Converts file paths to accessible URLs

### 2. Message Structure
The LINE notification now supports mixed message types:
- **Text Message**: Contains ticket details and assignment information
- **Image Messages**: Each image is sent as a separate message object

### 3. URL Generation
Images are served via the static file route:
```
/uploads/tickets/{ticketId}/{imagePath}
```

The base URL is configurable via `BACKEND_URL` environment variable.

## Implementation Details

### LINE Service Updates
- `buildTicketPreAssignedWithImagesMessage()` - Creates messages with text + images
- `buildImageMessages()` - Helper function for image message objects
- Enhanced `pushToUser()` - Handles mixed message types

### Message Format
```json
{
  "text": "📌 Ticket Pre-Assigned\n#TKT-001\n...",
  "images": [
    {
      "type": "image",
      "originalContentUrl": "https://backend.com/uploads/tickets/123/image1.jpg",
      "previewImageUrl": "https://backend.com/uploads/tickets/123/image1.jpg"
    }
  ]
}
```

### LINE API Payload
The system automatically converts the mixed message format to LINE's expected format:
```json
{
  "to": "Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "messages": [
    {
      "type": "text",
      "text": "📌 Ticket Pre-Assigned\n#TKT-001\n..."
    },
    {
      "type": "image",
      "originalContentUrl": "https://backend.com/uploads/tickets/123/image1.jpg",
      "previewImageUrl": "https://backend.com/uploads/tickets/123/image1.jpg"
    }
  ]
}
```

## Configuration

### Environment Variables
- `BACKEND_URL` - Base URL for image serving (default: http://localhost:3001)
- `LINE_CHANNEL_ACCESS_TOKEN` - LINE Bot API token

### Static File Serving
Images are served from:
- Primary: `backend/uploads/tickets/{ticketId}/`
- Fallback: `backend/src/uploads/tickets/{ticketId}/`

## Error Handling

### Image Fetch Failures
- If image fetching fails, the notification continues without images
- Errors are logged but don't prevent the main notification
- Graceful degradation to text-only messages

### LINE API Failures
- Failed LINE notifications are logged
- Don't affect the main ticket creation process
- Email notifications continue to work normally

## Usage Examples

### Basic Pre-Assignment (No Images)
```
📌 Ticket Pre-Assigned
#TKT-001
Test Ticket
Reported By: John Doe
Priority: high
Severity: critical
You have been pre-assigned to this ticket
```

### Pre-Assignment with Images
1. Text message with ticket details
2. Image 1: Screenshot of the issue
3. Image 2: Additional documentation
4. Image 3: Related diagrams

## Future Enhancements

### Potential Improvements
- **Image Compression**: Optimize images for LINE's size limits
- **Thumbnail Generation**: Create smaller preview images
- **Batch Processing**: Handle multiple images more efficiently
- **Image Validation**: Check image format and size before sending

### Additional Notification Types
- Ticket acceptance with before/after images
- Job completion with result photos
- Escalation with supporting evidence
- Closure with satisfaction photos

## Testing

### Manual Testing
1. Create a ticket with images
2. Pre-assign to a user with LINE ID
3. Check LINE notification for text + images
4. Verify image URLs are accessible

### Automated Testing
- Unit tests for message builders
- Integration tests for image fetching
- Mock tests for LINE API calls

## Troubleshooting

### Common Issues
1. **Images not showing**: Check file permissions and static serving
2. **URL errors**: Verify `BACKEND_URL` environment variable
3. **LINE errors**: Check API token and message format
4. **Performance**: Monitor image fetch times and optimize queries

### Debug Information
- Check backend logs for image fetch errors
- Verify LINE API response codes
- Test image URLs directly in browser
- Monitor database query performance
