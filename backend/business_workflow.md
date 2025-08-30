# Ticket Workflow

| Step | Who | Action | Status After Action | Notification Sent To | Explanation |
|------|-----|--------|---------------------|----------------------|-------------|
| 1 | **L1+ Requestor** | Create Ticket | **Open** | L2 | Requestor opens a new ticket. L2 is notified immediately. |
| 2 | **L2 (Reviewer & Assignee)** | Accept | **In-Progress** | Requestor | L2 reviews and takes ownership of the ticket. |
|   |                          | Reject | **Rejected – Pending L3 Review** | Requestor + L3 | If L2 cannot accept, ticket is escalated for L3 review. |
| 3 | **L3** (if escalated) | Accept | **In-Progress** | Requestor | L3 overrides L2’s rejection and puts ticket back in progress. |
|   |                       | Reject | **Rejected (Final)** | Requestor | L3 confirms rejection as final. |
| 4 | **L2 (Assignee)** | Complete Job | **Completed** | Requestor | L2 finishes the job and marks ticket as completed. |
|   |                   | Escalate | **Escalated** | L3 + Requestor | If L2 cannot complete, escalates responsibility to L3. |
| 5 | **Requestor** | Accept Result | **Closed** | L2 | Requestor verifies resolution and formally closes the ticket. |
|   |               | Reject Result | **Reopened (In-Progress)** | L2 | Requestor is not satisfied, ticket goes back to in-progress. |