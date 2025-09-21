# Work Order (WO) Workflow System Analysis Report

## Executive Summary

This report provides a comprehensive analysis of the Work Order (WO) workflow system in the Cedar6_Mars database. The system implements a sophisticated multi-step approval workflow that manages the lifecycle of work orders from creation to completion, with different workflow paths based on work order types and site configurations.

## 1. System Overview

### 1.1 Core Tables
- **WO**: Main work order table containing work order details and workflow status
- **WOStatus**: Defines the possible status values for work orders
- **WFApproveRouting**: Defines the workflow routing rules for different document types
- **WF_NODE**: Workflow nodes that define the workflow structure
- **WF_NODE_ACTION**: Actions that can be performed at each workflow node

### 1.2 Key Workflow Components
- **Work Order Types**: Different types of work orders (CM, BM, PM, SM, FM, MM, PJ, DC)
- **Site-based Configuration**: Each site can have different workflow configurations
- **Status-based Routing**: Workflow progression based on status codes and approval steps

## 2. Work Order Status System

### 2.1 Status Values (WOStatus Table)
The system uses a hierarchical status system with the following main statuses:

| StatusNo | Status Description | WFStatusCode | Meaning |
|----------|-------------------|--------------|---------|
| 1 | Create Work Order | 10-10 | Initial creation state |
| 2 | Plan Resourced | 20-10 | Resources have been planned |
| 3 | Scheduled | 30-10 | Work has been scheduled |
| 4 | In Progress | 50-10 | Work is currently being executed |
| 5 | Finish | 70-10 | Work has been completed |
| 6 | Wait Operator Finish Approve | 80-10 | Waiting for operator approval |
| 8 | Cancel Work Order | 95-10 | Work order has been cancelled |
| 9 | History | 99-10 | Work order moved to history |
| 10 | Wait Approved Plan | 15-10 | Waiting for plan approval (SM only) |

### 2.2 Status Flags
Each work order maintains several flags to track its current state:
- **FlagWaitStatus**: Indicates if the work order is waiting for approval
- **FlagApprove**: Indicates if the work order has been approved
- **FlagNotApproved**: Indicates if the work order was rejected
- **FlagHis**: Indicates if the work order is in history
- **FlagCancel**: Indicates if the work order has been cancelled

## 3. Workflow Routing System

### 3.1 Document Flow Codes
The system uses document flow codes to identify different workflow paths:
- **02CM**: Corrective Maintenance
- **02BM**: Breakdown Maintenance  
- **02PM**: Preventive Maintenance
- **02SM**: Shift Maintenance
- **02FM**: Facility Maintenance
- **02MM**: Machine Maintenance
- **02PJ**: Project
- **02DC**: Data Collection

### 3.2 Site-based Configuration
Each site (SiteNo) can have different workflow configurations, allowing for:
- Site-specific approval requirements
- Different workflow paths per site
- Customized approval steps

### 3.3 Workflow Steps
The workflow routing table (WFApproveRouting) defines the progression through different steps:
- **StatusNo**: The status number for this step
- **WFStepApproveNo**: The approval step number
- **WFStatusCode**: The workflow status code
- **StepDesc**: Description of the step
- **StatusType**: Type of status (N=Normal, S=Special)

## 4. Workflow Execution Process

### 4.1 Main Stored Procedures

#### sp_WF_WOStatusUpdate
This is the core procedure that handles work order status updates. It accepts:
- **@WONO**: Work order number
- **@ACTION**: Action type (1=Create, 2=SendTo, 3=Approve, 4=NotApprove, 5=Not use, 6=BackHistory, 7=CancelWO, 8=BackCancelWO, 9=Update or save)
- **@UPDATEUSER**: User performing the action

#### sp_WFN_EXEC_NODE_WO
This procedure executes workflow nodes and handles:
- Node type determination (S=Start, C=Condition, A=Action, E=End)
- Condition checking and routing
- Action execution
- Trigger execution

### 4.2 Workflow Actions
The system supports various actions:
- **Create (1)**: Initialize a new work order
- **SendTo (2)**: Send work order to next approval step
- **Approve (3)**: Approve the current step
- **NotApprove (4)**: Reject the current step
- **Update/Save (9)**: Update work order status based on data
- **CancelWO (7)**: Cancel the work order
- **BackHistory (6)**: Move work order back to history

## 5. Workflow Progression Logic

### 5.1 Automatic Status Updates (Action 9)
When a work order is updated (Action 9), the system automatically determines the appropriate status based on:

1. **Completion Date (ACT_FINISH_D)**: If set, moves to Status 5 (Finish)
2. **Start Date (ACT_START_D) or Active Resources**: If set, moves to Status 4 (In Progress)
3. **Scheduled Start Date (SCH_START_D)**: If set, moves to Status 3 (Scheduled)
4. **Planned Resources**: If resources are planned, moves to Status 2 (Plan Resourced)

### 5.2 Approval Workflow
The approval workflow follows the routing defined in WFApproveRouting:
1. Work order starts at Status 1 (Create)
2. Progresses through approval steps based on work order type and site
3. Each step requires approval before moving to the next
4. Can be rejected, sending it back to previous step
5. Can be cancelled at any point

### 5.3 Special Workflow Paths

#### Shift Maintenance (SM) Special Path
Shift maintenance work orders have an additional approval step (Status 10) that requires plan approval before proceeding to normal workflow.

#### Finish Approval Process
When work is completed (Status 5), some work order types require additional approvals:
- **Operator Finish Approval**: Waiting for operator to approve completion
- **Maintenance Finish Approval**: Waiting for maintenance to approve completion

## 6. Integration with Work Request System

The work order system is integrated with the work request (WR) system:
- Work orders can be created from work requests
- When a work order is completed and moved to history, the associated work request is also updated
- The system maintains referential integrity between work requests and work orders

## 7. Key Features

### 7.1 Multi-site Support
- Each site can have different workflow configurations
- Site-specific approval requirements
- Independent workflow execution per site

### 7.2 Flexible Workflow Types
- Different workflow paths for different work order types
- Configurable approval steps
- Extensible workflow system

### 7.3 Status Tracking
- Comprehensive status tracking with multiple flags
- Audit trail of status changes
- User tracking for all actions

### 7.4 Resource Management
- Integration with resource planning
- Automatic status updates based on resource allocation
- Resource-based workflow progression

## 8. Technical Implementation

### 8.1 Database Design
- Normalized database design with clear separation of concerns
- Foreign key relationships ensuring data integrity
- Indexed tables for efficient query performance

### 8.2 Stored Procedure Architecture
- Modular stored procedure design
- Clear separation between workflow logic and business logic
- Parameterized procedures for security and flexibility

### 8.3 Error Handling
- Comprehensive error handling in stored procedures
- Transaction management for data consistency
- Rollback capabilities for failed operations

## 9. Recommendations

### 9.1 System Improvements
1. **Enhanced Audit Trail**: Implement more detailed logging of workflow actions
2. **Performance Optimization**: Add additional indexes for frequently queried fields
3. **Workflow Visualization**: Create tools to visualize workflow paths
4. **Notification System**: Implement automated notifications for workflow events

### 9.2 Monitoring and Maintenance
1. **Regular Workflow Analysis**: Monitor workflow performance and bottlenecks
2. **Data Cleanup**: Implement regular cleanup of completed work orders
3. **Backup and Recovery**: Ensure proper backup procedures for workflow data

## 10. Conclusion

The Work Order workflow system in the Cedar6_Mars database is a sophisticated and well-designed system that provides comprehensive workflow management capabilities. The system's flexibility, multi-site support, and integration with other systems make it suitable for complex maintenance management scenarios.

The modular design and clear separation of concerns make the system maintainable and extensible, while the comprehensive status tracking and approval mechanisms ensure proper control over work order execution.

---

*Report generated based on analysis of Cedar6_Mars database schema and stored procedures*
