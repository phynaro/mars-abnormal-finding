# WFtrackeds Table Role in Workflow System Analysis

## Overview
The `WFtrackeds` table plays a **critical role** in the workflow system by tracking the progression of documents through their approval processes. This table serves as the **audit trail** and **workflow engine** for all document types in the system.

## WFtrackeds Table Role

### 1. **Workflow Event Tracking**
- **Records every workflow event**: Each time a document moves through a workflow step, a record is created in `WFtrackeds`
- **Audit trail**: Maintains complete history of who did what, when, and why
- **Current ownership**: Tracks who currently owns the document for approval

### 2. **Key Fields and Their Purpose**
```sql
-- Core identification
DocNo: Document number (e.g., WONO for work orders)
DocCode: Document code (e.g., "WO23-000004")
WFDocFlowCode: Document flow code (e.g., "WO", "02CM", "02BM")

-- Workflow progression
Event_Order: Sequence of events
WFStepNo: Current workflow step number
WFStatusCode: Current workflow status code (e.g., "80-10")

-- Approval tracking
Receive_PersonNo: Person who should receive for approval
Approved_Flag: Whether this step was approved
NotApproved_Flag: Whether this step was rejected
Approved_PersonNo: Person who approved/rejected
Approved_Date/Time: When approval/rejection occurred

-- Event details
Event_Desc: Description of what happened
From_PersonNo: Person who sent the document
Send_For: Purpose of sending (e.g., "For Approval")
```

### 3. **Workflow Engine Function**
- **Triggers workflow progression**: When `sp_WF_WOStatusUpdate` runs, it looks for `WFtrackeds` records to determine the next step
- **Validates permissions**: Uses `WFtrackeds` to check if the current user can perform the requested action
- **Determines next approver**: Based on `WFtrackeds` records, determines who should receive the document next

## Document Flow Code Issue

### **Problem Identified**
The workflow system is **not working properly** because:

1. **Missing Document Flow Code**: WB work orders use `WFDocFlowCode = "WO"`, but there are **NO routing rules** defined for this code in `WFApproveRouting`

2. **Available Document Flow Codes**:
   - `01WR` - Work Request
   - `02CM` - Corrective Maintenance
   - `02BM` - Breakdown Maintenance  
   - `02PM` - Preventive Maintenance
   - `02SM` - Scheduled Maintenance
   - `02FM` - Facility Maintenance
   - `02MM` - Minor Maintenance
   - `02PJ` - Project
   - `02DC` - Document Control

3. **Missing Code**: `WO` - Work Order (general)

### **Root Cause Analysis**
When `sp_WF_WOStatusUpdate` runs with `ACTION = 9`:

1. **Looks for routing rules**: Searches `WFApproveRouting` for `WFDocFlowCode = "WO"`
2. **Finds nothing**: No routing rules exist for `WFDocFlowCode = "WO"`
3. **Cannot create tracking records**: Without routing rules, it cannot determine the next workflow step
4. **Workflow stalls**: The work order remains stuck at its current status

## Testing Recommendations

### **Option 1: Use Existing Document Flow Code**
For testing WB work orders, you can use one of the existing document flow codes:

**Recommended**: `02CM` (Corrective Maintenance)
- **Reason**: WB work orders are typically corrective maintenance tasks
- **Workflow**: Same approval process (Operator → Maintenance → History)
- **Availability**: Already configured for Site 3

**Alternative**: `02BM` (Breakdown Maintenance)
- **Reason**: Walk-by maintenance often addresses breakdown issues
- **Workflow**: Same approval process

### **Option 2: Create WO Document Flow Code**
Add routing rules for `WFDocFlowCode = "WO"`:

```sql
-- Copy routing rules from 02CM to WO for Site 3
INSERT INTO WFApproveRouting (SiteNo, WFDocFlowCode, StatusNo, WFStepApproveNo, WFStatusCode, StepDesc, StatusType, Flagbudget, FlagDel) 
SELECT 3, 'WO', StatusNo, WFStepApproveNo, WFStatusCode, StepDesc, StatusType, Flagbudget, FlagDel 
FROM WFApproveRouting 
WHERE WFDocFlowCode = '02CM' AND SiteNo = 3
```

### **Option 3: Modify Work Order Creation**
Change the `WFDocFlowCode` used by WB work orders to an existing code:

```sql
-- Update existing WB work orders to use 02CM
UPDATE WFtrackeds 
SET WFDocFlowCode = '02CM' 
WHERE DocCode LIKE 'WO%' AND WFDocFlowCode = 'WO'
```

## Recommended Solution

### **Immediate Fix**: Use `02CM` for WB Work Orders
1. **Update workflow tracking**: Change `WFDocFlowCode` from `"WO"` to `"02CM"`
2. **Test workflow**: Verify that the approval process works correctly
3. **Document the mapping**: WB work orders → `02CM` workflow

### **Long-term Fix**: Create Proper WO Routing
1. **Add WO routing rules**: Create comprehensive routing for `WFDocFlowCode = "WO"`
2. **Configure for all sites**: Ensure WO routing works across all sites
3. **Test thoroughly**: Verify workflow progression and approval process

## Conclusion

The `WFtrackeds` table is essential for workflow functionality. The current issue is that WB work orders are using a document flow code (`"WO"`) that has no routing rules defined, causing the workflow to stall. 

**Immediate recommendation**: Use `02CM` (Corrective Maintenance) as the document flow code for WB work orders, as it provides the same workflow structure and is already properly configured for Site 3.
