# Ticket Type Order Summary

## Overview
This document summarizes the order in which ticket types are displayed to users on the HomePage (`frontend/src/pages/home/HomePage.tsx`).

## Implementation Location
The ordering logic is implemented in `frontend/src/components/home/PendingTicketsSection.tsx` at lines 613-617, where ticket groups are sorted by their priority value.

## Display Order

Tickets are grouped by `user_relationship` and displayed in the following order (from highest to lowest priority):

| Priority | Relationship Type | Display Title | Icon | Color Theme |
|----------|------------------|---------------|------|-------------|
| 1 | `escalate_approver` | Escalated Tickets | ArrowUp | Orange (text-orange-600, bg-orange-50) |
| 2 | `assignee` | My Assigned Tickets | UserCheck | Green (text-green-600, bg-green-50) |
| 3 | `close_approver` | Tickets to Close | Lock | Purple (text-purple-600, bg-purple-50) |
| 4 | `review_approver` | Tickets to Review | Star | Yellow (text-yellow-600, bg-yellow-50) |
| 5 | `reject_approver` | Tickets to Review (Rejected) | X | Red (text-red-600, bg-red-50) |
| 6 | `planner` | Tickets to Plan | Calendar | Indigo (text-indigo-600, bg-indigo-50) |
| 7 | `accept_approver` | Tickets to Accept | CheckCircle | Blue (text-blue-600, bg-blue-50) |
| 8 | `requester` | My Created Tickets | User | Gray (text-gray-600, bg-gray-50) |
| 9 | `viewer` | Other Tickets | Eye | Gray (text-gray-500, bg-gray-50) |

## Sorting Logic

The sorting is performed in `PendingTicketsSection.tsx`:

```typescript
const relationshipTypes = Object.keys(groupedTickets).sort((a, b) => {
  const configA = getRelationshipConfig(a, t);
  const configB = getRelationshipConfig(b, t);
  return configA.priority - configB.priority;
});
```

This ensures that ticket groups with lower priority numbers (higher importance) appear first in the list.

## Relationship Type Definitions

The `user_relationship` is determined in the backend (`backend/src/controllers/ticketController.js`) based on:
- Ticket status
- User's approval level
- User's role (assignee, requester, etc.)

## Notes

- Only ticket groups that contain tickets are displayed
- Each group shows the count of tickets in parentheses: `Title (count)`
- The priority system ensures that escalated tickets appear first, followed by assigned tickets
- Approval tickets (close, review, reject, plan, accept) appear in the middle
- Personal tickets (created) appear near the bottom
- View-only tickets appear last
