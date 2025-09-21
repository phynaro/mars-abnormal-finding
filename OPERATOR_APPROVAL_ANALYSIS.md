# Operator Approval (Action = 3) Analysis

## Overview
This document analyzes the specific criteria that must be met for Operator approval using Action = 3 in the `sp_WF_WOStatusUpdate` procedure.

## Action = 3 Approval Logic

### 1. Basic Requirements
**Action Parameter**: 3 (Approve)
**Purpose**: Approve the current workflow step and move to the next step

### 2. Workflow Step Validation

#### A. Current Status Check
The system first validates that the work order is in the correct status for approval:

```sql
-- The work order must be in a status that requires approval
-- For CM work orders, this means StatusNo = 6 (Wait Operator Finish Approve)
-- Current status must match the expected status for the current step
if @oldWOStatusNo = @aiWOStatusNo and @oldWFStepApproveNo = @asWFStepApproveNo
```

#### B. Workflow Step Progression
The system uses a cursor to iterate through all possible workflow steps:

```sql
DECLARE RelShip CURSOR FOR
SELECT
    WFR.WFStepApproveNo AS asWFStepApproveNo,
    WOS.WOStatusNo AS aiWOStatusNo,
    WFR.WFStatuscode AS asWOStatusCode
from WFApproveRouting WFR
inner join WOStatus WOS on WOS.WOStatusNo = WFR.StatusNo
Where siteno = @SiteNo and WFDocFlowCode = @WFDocFlowCode
and WOStatusNo <> 8
order by wostatuscode,WFStepApproveNo
```

### 3. Specific Approval Criteria

#### A. Step Matching Logic
```sql
if @oldWOStatusNo = @aiWOStatusNo and @oldWFStepApproveNo = @asWFStepApproveNo
begin
    if @aiWOStatusNo = 8
        set @oldStep = @ItemCount+2
    else
        set @oldStep = @ItemCount+1
end
```

**Criteria**:
1. **Current Status Match**: `@oldWOStatusNo = @aiWOStatusNo`
2. **Current Step Match**: `@oldWFStepApproveNo = @asWFStepApproveNo`
3. **Special Handling**: If status is 8 (Cancel), skip 2 steps; otherwise skip 1 step

#### B. Approval Execution
```sql
if @oldStep = @ItemCount
begin
    if @aiWOStatusNo <> 9
    begin
        -- Regular approval - stay in current status
        Update WO Set FlagWaitStatus = 'F',FlagApprove = 'T',FlagNotApproved = 'F',
                FlagHis = 'F',FlagCancel = 'F',
                WFStepApproveNo = @asWFStepApproveNo,WOStatusNo = @aiWOStatusNo,
                WFStatusCode = @asWOStatusCode,
                UPDATEUSER = @UPDATEUSER,
                UPDATEDATE = @Updatedate
        Where WONo = @WONo
    end
    else
    begin
        -- Move To History (final approval)
        set @WOHIS = 1
        Update WO Set FlagWaitStatus = 'F',FlagApprove = 'T',FlagNotApproved = 'F',
                FlagHis = 'T',FlagCancel = 'F',
                WFStepApproveNo = @asWFStepApproveNo,WOStatusNo = @aiWOStatusNo,
                WFStatusCode = @asWOStatusCode,
                UPDATEUSER = @UPDATEUSER,
                UPDATEDATE = @Updatedate
        Where WONo = @WONo
    end
end
```

### 4. Operator Approval Specific Steps

#### A. Step 6 - Wait Operator Finish Approve (WFStepApproveNo = "10")
**Current State**:
- **StatusNo**: 6
- **WFStepApproveNo**: "10"
- **WFStatusCode**: "80-10"
- **FlagWaitStatus**: "T" (waiting for approval)

**Approval Criteria**:
1. Work order must be in Status 6
2. WFStepApproveNo must be "10"
3. User must have permission to approve (from WFApprovers table)
4. Work order must be assigned to the user or user's group (from WFtrackeds table)

**After Approval**:
- **StatusNo**: 6 (stays the same)
- **WFStepApproveNo**: "20"
- **WFStatusCode**: "80-20"
- **FlagWaitStatus**: "F"
- **FlagApprove**: "T"

#### B. Step 6 - Wait Maintenance Finish Approve (WFStepApproveNo = "30")
**Current State**:
- **StatusNo**: 6
- **WFStepApproveNo**: "30"
- **WFStatusCode**: "80-30"
- **FlagWaitStatus**: "T"

**Approval Criteria**:
1. Work order must be in Status 6
2. WFStepApproveNo must be "30"
3. User must have permission to approve
4. Previous operator approval must be complete

**After Approval**:
- **StatusNo**: 9 (moves to History)
- **WFStepApproveNo**: "10"
- **WFStatusCode**: "99-10"
- **FlagWaitStatus**: "F"
- **FlagApprove**: "T"
- **FlagHis**: "T"

### 5. Permission Validation

#### A. User Permission Check
The system validates user permissions through:

1. **WFApprovers Table**: User must be listed as an approver for the current step
2. **WFtrackeds Table**: User must be the current owner of the work order
3. **USERGROUP_MEMBER Table**: User must be in the assigned user group

#### B. Permission Validation Query
```sql
-- Check if user can approve (from sp_WFN_CHECK_OWNER_WO)
SELECT 1 FROM WO 
INNER JOIN WFtrackeds ON WFtrackeds.DocNo = WO.WONO
LEFT JOIN USERGROUP_MEMBER ON WFtrackeds.Receive_UserGroupNo = USERGROUP_MEMBER.USERGROUPNO
WHERE WO.WONO = @WONO 
AND (WFtrackeds.Receive_PersonNo = @USERNO OR USERGROUP_MEMBER.PERSON = @USERNO)
AND WFtrackeds.Send_For = 1
```

### 6. Complete Approval Flow Example

#### Step 1: Operator Approval
```sql
-- Current state: Status 6, WFStepApproveNo = "10", WFStatusCode = "80-10"
-- User calls: EXEC sp_WF_WOStatusUpdate @WONO = 12345, @ACTION = 3, @UPDATEUSER = 436

-- System validates:
-- 1. Current status matches expected (StatusNo = 6)
-- 2. Current step matches expected (WFStepApproveNo = "10")
-- 3. User has permission to approve
-- 4. Work order is assigned to user

-- After approval:
-- StatusNo = 6, WFStepApproveNo = "20", WFStatusCode = "80-20", FlagApprove = "T"
```

#### Step 2: Maintenance Approval
```sql
-- Current state: Status 6, WFStepApproveNo = "30", WFStatusCode = "80-30"
-- User calls: EXEC sp_WF_WOStatusUpdate @WONO = 12345, @ACTION = 3, @UPDATEUSER = 437

-- System validates:
-- 1. Current status matches expected (StatusNo = 6)
-- 2. Current step matches expected (WFStepApproveNo = "30")
-- 3. User has permission to approve
-- 4. Previous operator approval is complete

-- After approval:
-- StatusNo = 9, WFStepApproveNo = "10", WFStatusCode = "99-10", FlagHis = "T"
```

### 7. Error Conditions

#### A. Invalid Status
- If work order is not in the expected status for approval
- If WFStepApproveNo doesn't match the current step

#### B. Permission Denied
- If user is not in WFApprovers table for the current step
- If user is not the current owner of the work order
- If user is not in the assigned user group

#### C. Workflow Violation
- If trying to approve a step that's not ready for approval
- If trying to approve without completing previous steps

### 8. Summary

**For Operator Approval (Action = 3), the system requires**:

1. **Correct Current State**: Work order must be in the expected status and step
2. **User Permission**: User must be authorized to approve the current step
3. **Workflow Compliance**: Must follow the defined workflow progression
4. **Assignment Validation**: User must be assigned to the current work order
5. **Step Sequencing**: Must approve steps in the correct order

**The approval process is highly structured and requires multiple validation checks to ensure proper workflow compliance and user authorization.**
