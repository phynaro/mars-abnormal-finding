# Work Order Type WB (WOTYPENO = 16) Workflow Guide

## Overview
**Work Order Type**: WB (Corrective Maintenance from walk by)  
**WOTYPENO**: 16  
**Parent Type**: CM (Corrective Maintenance, WOTYPENO = 2)  
**Site**: 3  

## Workflow Summary
Since WOTYPENO = 16 (WB) inherits from WOTYPENO = 2 (CM), it follows the Corrective Maintenance workflow path. The workflow consists of 6 main statuses with automatic progression based on work order data.

## Complete Workflow Steps

### How Triggers Work

The workflow system uses **Action 9 (Update/Save)** in `sp_WF_WOStatusUpdate` to automatically progress work orders based on data changes. The system checks specific fields in the WO table and wo_Resource table to determine the appropriate status.

**Trigger Logic (from sp_WF_WOStatusUpdate):**
```sql
-- The system checks these conditions in order:
1. If ACT_FINISH_D is not empty → Status 5 (Finish)
2. If ACT_START_D is not empty OR wo_Resource with FLAGACT='T' exists → Status 4 (In Progress)  
3. If SCH_START_D is not empty → Status 3 (Scheduled)
4. If wo_Resource with FLAGACT='F' exists → Status 2 (Plan Resourced)
5. Otherwise → Status 1 (Create)
```

**Key Trigger Fields:**
- **ACT_FINISH_D**: Actual finish date (triggers Status 5)
- **ACT_START_D**: Actual start date (triggers Status 4)
- **SCH_START_D**: Scheduled start date (triggers Status 3)
- **wo_Resource.FLAGACT**: 
  - `'F'` = Planned resources (triggers Status 2)
  - `'T'` = Actual resources used (triggers Status 4)

### Step 1: Create Work Order (Status 1)
**StatusNo**: 1  
**WFStatusCode**: 10-10  
**Description**: Create Work Order  
**Action**: Create new work order

**Required Parameters for Creation:**
```sql
DECLARE @WoNo int = 0
EXEC sp_WOMain_Insert 
    @WOCode = '', -- Auto-generated
    @WODate = '20241201', -- Work order date (YYYYMMDD format)
    @WOTime = '090000', -- Work order time (HHMMSS format)
    @WRNo = 0, -- Work request number (0 if not from WR)
    @WRCode = '', -- Work request code
    @WRDate = '', -- Work request date
    @WRTime = '', -- Work request time
    @Text1 = 'Walk by maintenance issue', -- Description
    @Text2 = '', -- Additional text
    @Text3 = '', -- Additional text
    @PriorityNo = 1, -- Priority (1=Low, 2=Medium, 3=High)
    @DeptNo = 23, -- Department number (based on existing WB work orders)
    @WoTypeNo = 16, -- Work order type (16=WB)
    @PUNo = 4609, -- Production unit number (based on existing WB work orders)
    @EQTypeNo = 0, -- Equipment type number (0 if not applicable)
    @EQNo = 0, -- Equipment number (0 if not applicable)
    @CostCenterNo = 18, -- Cost center number (based on existing WB work orders)
    @VendorNo = 0, -- Vendor number (0 if not applicable)
    @ContrNo = 0, -- Contractor number (0 if not applicable)
    @BudgetNo = 0, -- Budget number (0 if not applicable)
    @PJNo = 0, -- Project number (0 if not applicable)
    @UpdateUser = 436, -- User creating the work order (based on existing WB work orders)
    @SiteNo = 3, -- Site number (3 for this work order type)
    @HotWork = 'F', -- Hot work flag (F=False, T=True)
    @ConfineSpace = 'F', -- Confined space flag
    @WorkAtHeight = 'F', -- Work at height flag
    @LockOutTagOut = 'F', -- Lock out tag out flag
    @SchCurrentStartDate = '', -- Current scheduled start date
    @SchStartDate = '', -- Scheduled start date (can be empty initially)
    @SchStartTime = '', -- Scheduled start time (can be empty initially)
    @SchFinishDate = '', -- Scheduled finish date (can be empty initially)
    @SchFinishTime = '', -- Scheduled finish time (can be empty initially)
    @SchDuration = 0, -- Scheduled duration in hours
    @AssignToNo = 436, -- Assigned to user number (based on existing WB work orders)
    @SchChangeNote = '', -- Schedule change notes
    @MeterNo = 0, -- Meter number (0 if not applicable)
    @MeterDone = 0, -- Meter reading when done
    @WO_PROBLEM = 'Walk by maintenance issue description', -- Problem description
    @WoNo = @WoNo OUTPUT, -- Output parameter for work order number
    @FlagPU = 'F', -- Production unit flag
    @FlagSafety = 'F', -- Safety flag
    @FlagEnvironment = 'F', -- Environment flag
    @PUNO_Effected = 0, -- Affected production unit
    @DT_Start_D = '', -- Down time start date
    @DT_Start_T = '', -- Down time start time
    @DT_Finish_D = '', -- Down time finish date
    @DT_Finish_T = '', -- Down time finish time
    @DT_Duration = 0, -- Down time duration
    @UrgentNo = 0, -- Urgency number
    @DATE_REQ = '', -- Request date
    @Time_REQ = '', -- Request time
    @RequesterName = 'Test User', -- Requester name
    @REQ_PHONE = '', -- Requester phone
    @DEPT_REQ = 23, -- Requesting department (should match DeptNo)
    @Receiver = 0, -- Receiver number
    @ProcedureNo = 0, -- Procedure number
    @SymptomNo = 0, -- Symptom number
    @WOSubTypeNo = 0, -- Work order subtype
    @REQ_Email = '', -- Requester email
    @TaskProcedure = '', -- Task procedure
    @FlagEQ = 'F', -- Equipment flag
    @WarrantyDate = '', -- Warranty date
    @WOCause = '', -- Work order cause
    @Note = '', -- Notes
    @RecordActualBy = 0, -- Record actual by
    @RecordActualDate = '', -- Record actual date
    @RecordActualTime = '', -- Record actual time
    @FlagTPM = 'F', -- TPM flag
    @TPMNo = 0, -- TPM number
    @EQCompNo = 0, -- Equipment component number
    @WOPlan = '', -- Work order plan
    @AssignRemark = '', -- Assignment remarks
    @SchCurrentFinishDate = '', -- Current scheduled finish date
    @AccNo = 0, -- Account number
    @JsaType = 0, -- JSA type
    @JsaNo = '', -- JSA number
    @FlagCleaningJobFinish = 'F', -- Cleaning job finish flag
    @FlagCleaningJobFinishNotReq = 'F', -- Cleaning job finish not required flag
    @FlagHandoverOper = 'F', -- Handover operator flag
    @FlagHandoverOperNotReq = 'F' -- Handover operator not required flag
```
```

### Step 2: Plan Resourced (Status 2)
**StatusNo**: 2  
**WFStatusCode**: 20-10  
**Description**: Plan Resourced  
**Trigger**: When resources are planned for the work order

**Automatic Progression**: When `wo_Resource` records are added with `FLAGACT = 'F'` (planned resources)

**SQL Trigger Check**:
```sql
-- This query returns > 0 when resources are planned
SELECT COUNT(WONo) FROM wo_Resource WHERE wono = @WONo AND FLAGACT = 'F'
```

### Step 3: Scheduled (Status 3)
**StatusNo**: 3  
**WFStatusCode**: 30-10  
**Description**: Scheduled  
**Trigger**: When work is scheduled

**Automatic Progression**: When `SCH_START_D` (scheduled start date) is set to a non-empty value

**SQL Trigger Check**:
```sql
-- This query returns non-empty when scheduled
SELECT sch_start_d FROM wo WHERE wono = @WONo
```

### Step 4: In Progress (Status 4)
**StatusNo**: 4  
**WFStatusCode**: 50-10  
**Description**: In Progress  
**Trigger**: When work begins

**Automatic Progression**: When `ACT_START_D` (actual start date) is set OR when `wo_Resource` records exist with `FLAGACT = 'T'` (actual resources used)

**SQL Trigger Check**:
```sql
-- Either actual start date is set
SELECT act_start_d FROM wo WHERE wono = @WONo
-- OR actual resources are used
SELECT COUNT(WONo) FROM wo_Resource WHERE wono = @WONo AND FLAGACT = 'T'
```

### Step 5: Finish (Status 5)
**StatusNo**: 5  
**WFStatusCode**: 70-10  
**Description**: Finish  
**Trigger**: When work is completed

**Automatic Progression**: When `ACT_FINISH_D` (actual finish date) is set to a non-empty value

**SQL Trigger Check**:
```sql
-- This query returns non-empty when work is finished
SELECT act_finish_d FROM wo WHERE wono = @WONo
```

### Step 6: Wait Operator Finish Approve (Status 6)
**StatusNo**: 6  
**WFStatusCode**: 80-10  
**Description**: Wait Operator Finish Approve  
**Trigger**: After work completion, waiting for operator approval

**Manual Action Required**: Operator must approve the completion

### Step 7: Operator Finish Approved (Status 6)
**StatusNo**: 6  
**WFStatusCode**: 80-20  
**Description**: Operator Finish Approved  
**Trigger**: Operator approves completion

**Manual Action Required**: Operator approval

### Step 8: Wait Maintenance Finish Approve (Status 6)
**StatusNo**: 6  
**WFStatusCode**: 80-30  
**Description**: Wait Maintenance Finish Approve  
**Trigger**: After operator approval, waiting for maintenance approval

**Manual Action Required**: Maintenance must approve the completion

### Step 9: History (Status 9)
**StatusNo**: 9  
**WFStatusCode**: 99-10  
**Description**: History  
**Trigger**: Final approval completed

**Automatic Progression**: When all approvals are complete

## Manual Workflow Actions

### Action 1: Create
```sql
EXEC sp_WF_WOStatusUpdate @WONO = [WorkOrderNumber], @ACTION = 1, @UPDATEUSER = [UserID]
```

### Action 2: Send To Next Step
```sql
EXEC sp_WF_WOStatusUpdate @WONO = [WorkOrderNumber], @ACTION = 2, @UPDATEUSER = [UserID]
```

### Action 3: Approve
```sql
EXEC sp_WF_WOStatusUpdate @WONO = [WorkOrderNumber], @ACTION = 3, @UPDATEUSER = [UserID]
```

### Action 4: Reject
```sql
EXEC sp_WF_WOStatusUpdate @WONO = [WorkOrderNumber], @ACTION = 4, @UPDATEUSER = [UserID]
```

### Action 7: Cancel Work Order
```sql
EXEC sp_WF_WOStatusUpdate @WONO = [WorkOrderNumber], @ACTION = 7, @UPDATEUSER = [UserID]
```

### Action 9: Update/Save (Automatic Status Update)
```sql
EXEC sp_WF_WOStatusUpdate @WONO = [WorkOrderNumber], @ACTION = 9, @UPDATEUSER = [UserID]
```

## Status Flags

Each work order maintains these flags:
- **FlagWaitStatus**: 'T' when waiting for approval, 'F' when not waiting
- **FlagApprove**: 'T' when approved, 'F' when not approved
- **FlagNotApproved**: 'T' when rejected, 'F' when not rejected
- **FlagHis**: 'T' when in history, 'F' when not in history
- **FlagCancel**: 'T' when cancelled, 'F' when not cancelled

## Complete Workflow Example

### 1. Create Work Order
```sql
DECLARE @WoNo int
EXEC sp_WOMain_Insert 
    @WOCode = '', 
    @WODate = '20241201', 
    @WOTime = '090000', 
    @WRNo = 0, 
    @WRCode = '', 
    @WRDate = '', 
    @WRTime = '', 
    @Text1 = 'Walk by maintenance - Equipment inspection', 
    @Text2 = '', 
    @Text3 = '', 
    @PriorityNo = 1, 
    @DeptNo = 23, 
    @WoTypeNo = 16, 
    @PUNo = 4609, 
    @EQTypeNo = 0, 
    @EQNo = 0, 
    @CostCenterNo = 18, 
    @VendorNo = 0, 
    @ContrNo = 0, 
    @BudgetNo = 0, 
    @PJNo = 0, 
    @UpdateUser = 436, 
    @SiteNo = 3, 
    @HotWork = 'F', 
    @ConfineSpace = 'F', 
    @WorkAtHeight = 'F', 
    @LockOutTagOut = 'F', 
    @SchCurrentStartDate = '', 
    @SchStartDate = '', 
    @SchStartTime = '', 
    @SchFinishDate = '', 
    @SchFinishTime = '', 
    @SchDuration = 0, 
    @AssignToNo = 436, 
    @SchChangeNote = '', 
    @MeterNo = 0, 
    @MeterDone = 0, 
    @WO_PROBLEM = 'Equipment requires maintenance based on walk by inspection', 
    @WoNo = @WoNo OUTPUT, 
    @FlagPU = 'F', 
    @FlagSafety = 'F', 
    @FlagEnvironment = 'F', 
    @PUNO_Effected = 0, 
    @DT_Start_D = '', 
    @DT_Start_T = '', 
    @DT_Finish_D = '', 
    @DT_Finish_T = '', 
    @DT_Duration = 0, 
    @UrgentNo = 0, 
    @DATE_REQ = '', 
    @Time_REQ = '', 
    @RequesterName = 'Test User', 
    @REQ_PHONE = '', 
    @DEPT_REQ = 23, 
    @Receiver = 0, 
    @ProcedureNo = 0, 
    @SymptomNo = 0, 
    @WOSubTypeNo = 0, 
    @REQ_Email = '', 
    @TaskProcedure = '', 
    @FlagEQ = 'F', 
    @WarrantyDate = '', 
    @WOCause = '', 
    @Note = '', 
    @RecordActualBy = 0, 
    @RecordActualDate = '', 
    @RecordActualTime = '', 
    @FlagTPM = 'F', 
    @TPMNo = 0, 
    @EQCompNo = 0, 
    @WOPlan = '', 
    @AssignRemark = '', 
    @SchCurrentFinishDate = '', 
    @AccNo = 0, 
    @JsaType = 0, 
    @JsaNo = '', 
    @FlagCleaningJobFinish = 'F', 
    @FlagCleaningJobFinishNotReq = 'F', 
    @FlagHandoverOper = 'F', 
    @FlagHandoverOperNotReq = 'F'

-- Initialize workflow status
EXEC sp_WF_WOStatusUpdate @WONO = @WoNo, @ACTION = 1, @UPDATEUSER = 436
```

### 2. Schedule Work
```sql
-- Update scheduled start date
UPDATE WO SET SCH_START_D = '20241202', SCH_START_T = '080000' WHERE WONO = @WoNo

-- Update status to Scheduled
EXEC sp_WF_WOStatusUpdate @WONO = @WoNo, @ACTION = 9, @UPDATEUSER = 436
```

### 3. Start Work
```sql
-- Update actual start date
UPDATE WO SET ACT_START_D = '20241202', ACT_START_T = '080000' WHERE WONO = @WoNo

-- Update status to In Progress
EXEC sp_WF_WOStatusUpdate @WONO = @WoNo, @ACTION = 9, @UPDATEUSER = 436
```

### 4. Complete Work
```sql
-- Update actual finish date
UPDATE WO SET ACT_FINISH_D = '20241202', ACT_FINISH_T = '170000' WHERE WONO = @WoNo

-- Update status to Finish
EXEC sp_WF_WOStatusUpdate @WONO = @WoNo, @ACTION = 9, @UPDATEUSER = 436
```

### 5. Operator Approval
```sql
-- Operator approves completion
EXEC sp_WF_WOStatusUpdate @WONO = @WoNo, @ACTION = 3, @UPDATEUSER = 436
```

### 6. Maintenance Approval
```sql
-- Maintenance approves completion
EXEC sp_WF_WOStatusUpdate @WONO = @WoNo, @ACTION = 3, @UPDATEUSER = 436
```

## Notes

1. **Site 3 Configuration**: Since site 3 doesn't have specific workflow routing defined, the work order follows the standard CM workflow pattern.

2. **Automatic Progression**: The system automatically updates status based on work order data (Action 9), making manual status updates unnecessary in most cases.

3. **Inheritance**: WB work orders inherit the workflow behavior from CM work orders since they share the same parent type.

4. **Approval Process**: The final approval process requires both operator and maintenance approval before the work order can be moved to history.

5. **Integration**: When the work order is completed and moved to history, any associated work request (WR) is also updated automatically.

---

## User Permission Validation

The system validates user permissions through a combination of **approver assignments** and **workflow tracking**. Here's how it works:

### 1. Approver Assignment (WFApprovers Table)
**Purpose**: Defines who can approve at each workflow step

**Key Fields**:
- **WFDocFlowCode**: Document type (e.g., '02CM' for Corrective Maintenance)
- **WFStepNo**: Workflow step number
- **PersonNo**: User who can approve
- **WFStatusCode**: Status code for the step
- **ApproveLevel**: Approval level (0 = single approval, higher = multiple approvals)

**Example**:
```sql
-- Check who can approve at step 6 (Finish approval)
SELECT PersonNo, PersonName, WFStatusCode, ApproveLevel 
FROM WFApprovers 
WHERE WFDocFlowCode = '02CM' AND WFStepNo = 6 AND Siteno = 2
```

### 2. Workflow Tracking (WFtrackeds Table)
**Purpose**: Tracks who currently "owns" the work order for approval

**Key Fields**:
- **DocNo**: Work order number
- **DocCode**: Work order code
- **Receive_PersonNo**: Individual assigned for approval
- **Receive_UserGroupNo**: User group assigned for approval
- **Approved_Flag**: Whether the step has been approved
- **Send_For**: Indicates the current step is active

**Permission Check Logic**:
```sql
-- Check if user can act on work order (from sp_WFN_CHECK_OWNER_WO)
SELECT 1 FROM WO 
INNER JOIN WFtrackeds ON WFtrackeds.DocNo = WO.WONO
LEFT JOIN USERGROUP_MEMBER ON WFtrackeds.Receive_UserGroupNo = USERGROUP_MEMBER.USERGROUPNO
WHERE WO.WONO = @WONO 
AND (WFtrackeds.Receive_PersonNo = @USERNO OR USERGROUP_MEMBER.PERSON = @USERNO)
AND WFtrackeds.Send_For = 1
```

### 3. User Group Membership (USERGROUP_MEMBER Table)
**Purpose**: Defines which users belong to which approval groups

**Example**:
```sql
-- Check if user 436 is in user group 272
SELECT * FROM USERGROUP_MEMBER WHERE USERGROUPNO = 272 AND PERSON = 436
```

### 4. Permission Validation Process

**Step-by-Step Validation**:
1. **Check Current Owner**: System checks WFtrackeds table for current step owner
2. **Validate User**: User must be either:
   - Directly assigned (Receive_PersonNo = UserID)
   - Member of assigned user group (USERGROUP_MEMBER)
3. **Check Approval Rights**: User must be in WFApprovers table for the current step
4. **Verify Status**: Work order must be in correct status for the action

**Example Validation Query**:
```sql
-- Complete permission check for work order approval
DECLARE @UserNo int = 436
DECLARE @WoNo int = 201637

-- Check if user can approve this work order
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM WO 
            INNER JOIN WFtrackeds ON WFtrackeds.DocNo = WO.WONO
            LEFT JOIN USERGROUP_MEMBER ON WFtrackeds.Receive_UserGroupNo = USERGROUP_MEMBER.USERGROUPNO
            WHERE WO.WONO = @WoNo 
            AND (WFtrackeds.Receive_PersonNo = @UserNo OR USERGROUP_MEMBER.PERSON = @UserNo)
            AND WFtrackeds.Send_For = 1
        ) THEN 'CAN_APPROVE'
        ELSE 'NO_PERMISSION'
    END AS PermissionStatus
```

### 5. Current Permission Status

**For Site 3 (WB Work Orders)**:
- **No specific workflow routing** defined in WFApproveRouting
- **No specific approvers** defined in WFApprovers
- **Uses default CM workflow** (inherits from parent type)
- **Permission validation** relies on user group assignments and workflow tracking

**Note**: Since site 3 doesn't have specific workflow configuration, the system may use default permissions or require manual assignment of approvers.

---

*This guide provides the complete workflow for creating and completing a WB (Walk by) work order type.*
