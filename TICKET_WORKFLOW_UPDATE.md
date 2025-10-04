ticket normal status 
1. open
2. in_progress
3. completed
4. reviewed
5. closed

abnormal status
1. reopened_in_progress
2. escalated
3. rejected_pending_l3_review
4. rejected_final

Action Mapping

  L1: ['create', 'approve_review', 'reopen'],
  L2: ['accept', 'reject', 'escalate', 'complete'],
  L3: ['reassign', 'reject_final'],
  L4: ['approve_close']

Email and Line Notification for action should be sent to who do that action plus
1. create 
['L2ForPU']
2. approve_review
['assignee','L4ForPU']
3. reopen
['assignee']
4. accept
['requestor']
5. reject
['requester','L3ForPU']
6. escalate
['requester','L3ForPU','L4ForPU']
7. complete
['requester']
8. reassign
['requester','assignee'] 
9. reject_final
['requester','assignee']
10. approve_close
['requester','assignee']


# Actor Always Included - Examples and Use Cases

## 🎯 **Core Concept**

The actor (person who performed the action) is **ALWAYS included** in the notification list, regardless of:
- Whether they're already in the notification list
- Their role in the ticket
- Their approval level
- Any other conditions

## 📊 **Examples**

### **Example 1: Requester Performs Action**
```sql
-- Ticket 123: DJ-DMH-BLD-BIN-01
-- User 456 (Requester) REJECTS the ticket
EXEC sp_GetTicketNotificationUsers 
    @ticket_id = 123,
    @action_type = 'reject',
    @actor_personno = 456
```

**Expected Result:**
| Person | Role | Reason | Always Included? |
|--------|------|--------|------------------|
| User 456 | Requester | Requester Notification | ✅ (Normal) |
| User 456 | Actor | Actor Notification - Performed Action: reject (Requester) | ✅ (ALWAYS) |
| User 789 | L3Approver | L3 Approval Required - Line-specific | ✅ (Normal) |

**Note:** User 456 appears **TWICE** - once as requester, once as actor.

---

### **Example 2: Assignee Performs Action**
```sql
-- Ticket 123: DJ-DMH-BLD-BIN-01  
-- User 789 (Assignee) COMPLETES the ticket
EXEC sp_GetTicketNotificationUsers 
    @ticket_id = 123,
    @action_type = 'complete',
    @actor_personno = 789
```

**Expected Result:**
| Person | Role | Reason | Always Included? |
|--------|------|--------|------------------|
| User 456 | Requester | Requester Notification | ✅ (Normal) |
| User 789 | Actor | Actor Notification - Performed Action: complete (Assignee) | ✅ (ALWAYS) |

**Note:** User 789 is included **only as actor** since 'complete' doesn't notify assignee normally.

---

### **Example 3: L2 Approver Performs Action**
```sql
-- Ticket 123: DJ-DMH-BLD-BIN-01
-- User 999 (L2 Approver for DJ-DMH-BLD) ACCEPTS the ticket
EXEC sp_GetTicketNotificationUsers 
    @ticket_id = 123,
    @action_type = 'accept',
    @actor_personno = 999
```

**Expected Result:**
| Person | Role | Reason | Always Included? |
|--------|------|--------|------------------|
| User 456 | Requester | Requester Notification | ✅ (Normal) |
| User 999 | Actor | Actor Notification - Performed Action: accept | ✅ (ALWAYS) |

**Note:** User 999 gets notified **only as actor** since they're not requester/assignee.

---

### **Example 4: L4 Approver Performs Action**
```sql
-- Ticket 123: DJ-DMH-BLD-BIN-01
-- User 1111 (L4 Approver for DJ-DMH) APPROVES CLOSE
EXEC sp_GetTicketNotificationUsers 
    @ticket_id = 123,
    @action_type = 'approve_close',
    @actor_personno = 1111
```

**Expected Result:**
| Person | Role | Reason | Always Included? |
|--------|------|--------|------------------|
| User 456 | Requester | Requester Notification | ✅ (Normal) |
| User 789 | Assignee | Assignee Notification | ✅ (Normal) |
| User 1111 | Actor | Actor Notification - Performed Action: approve_close | ✅ (ALWAYS) |

**Note:** User 1111 gets actor notification despite being L4 approver.

---

## 🔧 **Implementation Details**

### **Actor Selection Logic:**
```sql
-- ALWAYS include actor regardless of any conditions
SELECT DISTINCT
    actor.PERSONNO,
    actor.PERSON_NAME,
    actor.EMAIL,
    CONCAT('Actor Notification - Performed Action: ', @action_type, 
           CASE 
               WHEN actor.PERSONNO = @reported_by THEN ' (Requester)'
               WHEN actor.PERSONNO = @assigned_to THEN ' (Assignee)'
               ELSE ''
           END) as notification_reason,
    'actor' as recipient_type,
    'Actor Always Included' as notification_context
FROM Person actor
WHERE actor.PERSONNO = @actor_personno
AND actor_PersonNO IS NOT NULL
AND actor.FLAGDEL != 'Y'
-- NO OTHER CONDITIONS - Actor is ALWAYS INCLUDED
```

### **Key Features:**
1. **No Duplicate Prevention** - Actor can appear multiple times
2. **No Role Checking** - Actor included regardless of their ticket role
3. **No Approval Level Checking** - Actor included regardless of approval level
4. **No Exclusion Logic** - No conditions that would exclude actor

---

## 📋 **Use Cases**

### **Why Always Include Actor?**

1. **Audit Trail**: Complete record of who did what
2. **User Feedback**: Users see confirmation they performed action
3. **Debugging**: Easy to trace action performers in logs
4. **UI Updates**: Users get confirmation emails for their actions
5. **Analytics**: Activity tracking and user engagement metrics

### **Business Benefits:**

✅ **Complete Accountability**: Every action trigger is logged
✅ **User Experience**: Users see confirmation of their actions  
✅ **Debugging**: Easy to trace issues back to specific users
✅ **Compliance**: Full audit trail for regulatory requirements
✅ **Performance**: User can verify their action was processed

---

## 🔄 **Notification Flow Example**

```javascript
// Example: User 456 creates ticket
const actionPerformer = 456;  // Who did the action
const action = 'create';      // What action
const ticketId = 123;         // Target ticket

// Get all notification users WITH actor always included
const notificationUsers = await getTicketNotificationUsers(
    ticketId, 
    action, 
    actionPerformer  // Actor always included
);

// Result: L2 approvers + User 456 (as actor)
// ActionPerformer gets notification confirming their action
```

---

## ⚠️ **Potential Duplication**

### **When Duplicates Occur:**
- **Actor is Requester**: Gets notification as requester + actor
- **Actor is Assignee**: Gets notification as assignee + actor  
- **Actor is Approver**: Gets notification as approver + actor

### **Handling Duplicates:**
1. **Email Service**: Can deduplicate based on email address
2. **Notification Service**: Can mark duplicates and send once
3. **UI**: Can show single notification with combined contexts

### **Example Deduplication:**
```javascript
const sendNotifications = async (users) => {
    // Deduplicate by email, keep unique notification reasons
    const uniqueUsers = users.reduce((acc, user) => {
        if (!acc[user.EMAIL]) {
            acc[user.EMAIL] = {
                EMAIL: user.EMAIL,
                PERSON_NAME: user.PERSON_NAME,
                reasons: [user.notification_reason]
            };
        } else {
            acc[user.EMAIL].reasons.push(user.notification_reason);
        }
        return acc;
    }, {});

    // Send to unique users with combined reasons
    for (const user of Object.values(uniqueUsers)) {
        await sendNotification({
            to: user.EMAIL,
            message: user.reasons.join(' + ')
        });
    }
};
```

---

## 🎯 **Benefits of Always Including Actor**

1. **User Experience**: Confirmation that action was processed
2. **Debugging**: Easy to identify who triggered each action
3. **Analytics**: Complete activity tracking
4. **Compliance**: Full audit trail
5. **UI Consistency**: Users always see their action results

**The actor always being included ensures complete visibility and accountability for all ticket actions.** 🎉
