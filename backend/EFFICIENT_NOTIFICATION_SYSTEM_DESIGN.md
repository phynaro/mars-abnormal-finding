# Efficient Notification System Design

## 🎯 **System Overview**

The enhanced notification system provides a **single universal procedure** that handles all ticket action notifications efficiently with actor inclusion and duplicate prevention.

## 📋 **Key Improvements**

### **1. Single Universal Procedure**
- **Before**: Multiple calls for different notification types
- **After**: One procedure handles all action types
- **Benefits**: Reduced complexity, unified logic, better performance

### **2. Actor Inclusion**
- **NEW**: `@actor_personno` parameter includes who performed the action
- **Logic**: Actor gets notification credit without creating duplicates
- **Benefit**: Complete accountability and audit trail

### **3. Smart Notification Mapping**
```javascript
// Automatic mapping based on action type
const actionNotifications = {
    'create': ['L2ForPU'],
    'approve_review': ['assignee', 'L4ForPU'],
    'reopen': ['assignee'],
    'accept': ['requester'],
    'reject': ['requester', 'L3ForPU'],
    'escalate': ['requester', 'L3ForPU', 'L4ForPU'],
    'complete': ['requester'],
    'reassign': ['requester', 'assignee'],
    'reject_final': ['requester', 'assignee'],
    'approve_close': ['requester', 'assignee']
};
```

### **4. Most Specific Group Wins**
- **Maintained**: Still applies for approval-level notifications
- **Efficiency**: Only most relevant approvers get notified
- **Hierarchy**: Machine → Line → Area → Plant levels

---

## 🔧 **Procedure Signature**

```sql
EXEC sp_GetTicketNotificationUsers 
    @ticket_id INT,
    @action_type NVARCHAR(50),     -- NEW: Action performed
    @actor_personno INT = NULL     -- NEW: Who did the action
```

### **Parameters:**
- `@ticket_id` - Target ticket ID
- `@action_type` - Action performed ('create', 'accept', 'reject', etc.)
- `@actor_personno` - Person who performed the action (OPTIONAL)

### **Returns:**
```sql
PERSONNO | PERSON_NAME | EMAIL | notification_reason | recipient_type | system_type
```

---

## 📊 **Usage Examples**

### **Example 1: Create Ticket**
```javascript
// User 123 creates ticket 456
const notificationUsers = await getTicketNotificationUsers(
    ticketId: 456,
    actionType: 'create',
    actorPersonno: 123
);

// Result: L2 approvers + Actor (123) get notified
```

### **Example 2: Accept Ticket**
```javascript
// L2 User 789 accepts ticket 456
const notificationUsers = await getTicketNotificationUsers(
    ticketId: 456,
    actionType: 'accept', 
    actorPersonno: 789
);

// Result: Requester + Actor (789) get notified
```

### **Example 3: Reject Ticket**
```javascript
// L2 User 789 rejects ticket 456
const notificationUsers = await getTicketNotificationUsers(
    ticketId: 456,
    actionType: 'reject',
    actorPersonno: 789
);

// Result: Requester + L3ForPU (most specific) + Actor (789) get notified
```

---

## 🔄 **Notification Flow**

### **1. Action Trigger**
```javascript
// When user performs action
await performTicketAction(ticketId, action, actorPersonno);
```

### **2. Notification Retrieval**
```javascript
// Get all users who should be notified
const users = await getTicketNotificationUsers(ticketId, action, actorPersonno);
```

### **3. Notification Dispatch**
```javascript
// Send notifications to all users (including actor)
for (const user of users) {
    await sendNotification(user.EMAIL, user.notification_reason);
}
```

---

## 🎭 **Actor Inclusion Logic**

### **When Actor Gets Notified:**
✅ **Always included** when `@actor_personno` provided
✅ **Separate notification** with "Actor - Performed Action" reason
✅ **No duplication** if actor already in notification list

### **Actor Notification Benefits:**
- **Audit trail**: Complete record of who did what
- **Credit system**: Actor gets recognition for actions
- **Debugging**: Easy to track action performers
- **Analytics**: Activity reporting and metrics

---

## 🚀 **Performance Benefits**

### **Database Efficiency:**
- **Single query** instead of multiple procedure calls
- **Optimized CTEs** for complex logic
- **Reduced round trips** to database

### **Application Efficiency:**
- **Unified helper function** in JavaScript
- **Consistent API** across all actions
- **Reduced code duplication**

### **System Efficiency:**
- **Fewer notifications** (Most Specific Group Wins)
- **Better targeting** (relevant users only)
- **Cleaner logs** (structured notifications)

---

## 📝 **Implementation Steps**

### **1. Deploy Database Changes**
```sql
-- Run the enhanced procedure
EXEC sp_GetTicketNotificationUsers_Clean.sql
```

### **2. Update Backend Code**
```javascript
// Update helpers.js (already done)
const users = await getTicketNotificationUsers(ticketId, actionType, actorPersonno);
```

### **3. Update Controller Calls**
```javascript
// Find all calls to getTicketNotificationUsers and update to include actor
// Examples:
await sendTicketNotification(ticketId, 'create', currentUserId);
await sendTicketNotification(ticketId, 'accept', currentUserId);
await sendTicketNotification(ticketId, 'reject', currentUserId);
```

### **4. Update Notification Dispatch**
```javascript
// Implement unified notification service
const notifyTicketAction = async (ticketId, actionType, actorPersonno) => {
    const users = await getTicketNotificationUsers(ticketId, actionType, actorPersonno);
    
    for (const user of users) {
        await emailService.sendNotification({
            to: user.EMAIL,
            subject: `Ticket Action: ${actionType}`,
            message: user.notification_reason,
            ticketId: ticketId
        });
    }
};
```

---

## ✅ **Testing Checklist**

### **Database Tests:**
- [ ] Test all action types return correct users
- [ ] Verify actor inclusion works
- [ ] Confirm no duplicates in results
- [ ] Check Most Specific Group Wins logic

### **Integration Tests:**
- [ ] Update controller calls to include actor parameter
- [ ] Test notification dispatch
- [ ] Verify email sending works correctly
- [ ] Check LINE notification integration

### **Performance Tests:**
- [ ] Compare old vs new procedure execution time
- [ ] Measure reduced notification volume
- [ ] Verify improved response times

---

## 🎯 **Expected Outcomes**

### **Immediate Benefits:**
- **90% fewer notification-related procedure calls**
- **Complete actor audit trail** in notifications
- **Reduced notification spam** (Most Specific Group Wins)
- **Unified notification handling**

### **Long-term Benefits:**
- **Easier maintenance** (single procedure vs multiple)
- **Better performance** (optimized queries)
- **Enhanced analytics** (actor tracking)
- **Improved user experience**

---

## 🔧 **Migration Path**

### **Phase 1: Deploy Database** ✅
- Enhanced stored procedure
- Actor inclusion logic
- Most Specific Group Wins

### **Phase 2: Update Backend** (Current)
- Update helper function signature
- Modify controller calls to include actor
- Test integration

### **Phase 3: Update Frontend**
- Add action tracking
- Pass actor information
- Update UI feedback

### **Phase 4: Monitoring**
- Performance metrics
- Notification success rates
- User feedback analysis

---

**This efficient design reduces complexity while adding powerful features like actor inclusion and unified notification handling.** 🎉
