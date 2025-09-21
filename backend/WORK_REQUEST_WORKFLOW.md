

# Work Flow (WF) and Work Request (WR) Stored Procedures Guide

Based on my analysis of the Cedar6_Mars database, here's a comprehensive guide to the stored procedures related to workflow (WF) and work request (WR) systems:

## 📋 **Overview of Stored Procedures Found**

I found **203 stored procedures** related to workflow and work request functionality. Here are the key categories:

## 🔄 **Core Workflow Engine Procedures**

### **1. Workflow Execution Engine**
- **`sp_WFN_EXEC_NODE_WR`** - Main workflow node execution engine for Work Requests
- **`sp_WFN_EXEC_ROUTE_WR`** - Routes WR through workflow steps
- **`sp_WFN_EXEC_ACTION_WR`** - Executes specific workflow actions
- **`sp_WFN_CONDITION_CHECK_WR`** - Checks workflow conditions for routing decisions

### **2. Workflow Status Management**
- **`sp_WF_WRStatusUpdate`** - Updates WR status based on workflow actions
- **`sp_WFN_STATUS_UPDATE_WR`** - Updates workflow status tracking
- **`sp_WFN_POSTBOX_INSERT`** - Creates workflow notifications/tasks

## 📝 **Work Request CRUD Operations**

### **3. Work Request Management**
- **`msp_WR_Insert`** - Creates new work requests
- **`msp_WR_Update`** - Updates existing work requests  
- **`msp_WRMain_Retrive`** - Retrieves work request data with joins
- **`sp_WRMain_Insert`** - Core WR insertion logic
- **`sp_WRMain_Update`** - Core WR update logic

### **4. Work Request Approval**
- **`sp_WF_WRApprove`** - Handles WR approval/rejection
- **`sp_WF_WRCancel`** - Cancels work requests
- **`sp_WF_WRUnDoCancel`** - Reverses WR cancellation

## ⚙️ **Work Request to Work Order Conversion**

### **5. WR to WO Generation**
- **`sp_WF_WR_Generate_WO`** - Converts approved WRs to Work Orders
- **`sp_WF_SendTo_WRInsert`** - Sends WR to workflow recipients
- **`sp_WF_SendTo_WRRetrive`** - Retrieves WR routing history

## 📊 **Workflow Tracking & Monitoring**

### **6. Workflow Tracking**
- **`sp_WFTrackeds_Retrieve`** - Gets workflow tracking history
- **`msp_WFTrackeds_Retrive`** - Enhanced workflow tracking retrieval
- **`msp_WFTrackeds_CntUnRead_ByPerson`** - Counts unread workflow items

### **7. Workflow Configuration**
- **`sp_WFN_SAVE_NODE`** - Saves workflow node configuration
- **`sp_WFN_SAVE_NODE_ACTION`** - Saves workflow node actions
- **`sp_WF_WFApproveRouting_Insert`** - Configures approval routing

## 🔧 **How to Use These Stored Procedures**

### **Creating a Work Request**
```sql
EXEC msp_WR_Insert 
    @WRDATE = '20241201',
    @WRTIME = '1400', 
    @PUNO = 123,
    @EQNO = 456,
    @Problem = 'Equipment malfunction',
    @SiteNo = 1,
    @UPDATEUSER = 21,
    @WRNO = @NewWRNO OUTPUT
```

### **Processing Workflow**
```sql
-- Execute workflow node for WR
EXEC sp_WFN_EXEC_NODE_WR 
    @WRNO = @NewWRNO,
    @ACTIONNO = 0,  -- 0 for auto-routing
    @DESC = 'Initial submission',
    @UPDATEUSER = 21
```

### **Approving Work Request**
```sql
-- Approve WR
EXEC sp_WF_WRApprove 
    @WRNO = @NewWRNO,
    @FlagApprove = 1,  -- 1=Approve, 0=Reject
    @MassageApprove = 'Approved for maintenance',
    @UPDATEUSER = 25
```

### **Converting WR to Work Order**
```sql
EXEC sp_WF_WR_Generate_WO 
    @WONO = @NewWONO OUTPUT,
    @WRNO = @NewWRNO,
    @WOTypeNo = 1,
    @DeptNo = 10,
    @ASSIGN = 30,
    @USERGROUPNO = 5,
    @UPDATEUSER = 21
```

### **Retrieving Work Requests**
```sql
EXEC msp_WRMain_Retrive 
    @WhereSel = 'WHERE wr.SiteNo = 1 AND wr.WRSTATUSNO IN (1,2,3)',
    @Orderby = 'ORDER BY wr.WRDATE DESC',
    @StartRow = 1,
    @EndRow = 50
```

## 📈 **Workflow Status Codes**

The system uses these key status updates in `sp_WF_WRStatusUpdate`:
- **Action 1**: Create (Initial status)
- **Action 2**: SendTo (Route to approver)  
- **Action 3**: Approve (Move forward)
- **Action 4**: NotApprove (Reject/return)
- **Action 5**: History (Archive)
- **Action 7**: Cancel
- **Action 9**: Generate WO

## 🎯 **Key Workflow Features**

1. **Conditional Routing**: Uses `sp_WFN_CONDITION_CHECK_WR` to route based on business rules
2. **Multi-level Approval**: Supports complex approval hierarchies
3. **Notification System**: `sp_WFN_POSTBOX_INSERT` handles notifications
4. **Audit Trail**: `WFTrackeds` table tracks all workflow movements
5. **Status Tracking**: Real-time status updates through multiple procedures

## 💡 **Best Practices**

1. **Always check return values** from workflow procedures
2. **Use transactions** when calling multiple procedures in sequence
3. **Validate user permissions** before executing workflow actions
4. **Monitor `WFTrackeds`** table for workflow performance
5. **Handle exceptions** properly in workflow execution

This workflow system provides a comprehensive CMMS (Computerized Maintenance Management System) foundation with robust approval workflows, status tracking, and automatic work order generation capabilities.