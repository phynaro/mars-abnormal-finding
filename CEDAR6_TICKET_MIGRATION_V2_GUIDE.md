# CEDAR6 Ticket System Migration Guide V2

## Overview
This document outlines the migration from the original ticket system to the new Plant-Area-Line-Machine hierarchy system with approval workflow and cost tracking.

## Migration Summary

### 🏗️ **New Architecture**
- **Hierarchical Structure**: Plant → Area (Line) → Machine → Number
- **PUCODE Format**: `PLANT-AREA-LINE-MACHINE-NUMBER`
- **Approval Workflow**: Multi-level approval system
- **Cost Tracking**: Cost avoidance and downtime tracking

---

## 📊 **Database Schema Changes**

### **New Tables Created**

#### 1. **Plant Table**
```sql
CREATE TABLE Plant (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(500),
    code VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "PLANT"
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
```

#### 2. **Line Table** (represents Areas)
```sql
CREATE TABLE Line (
    id INT IDENTITY(1,1) PRIMARY KEY,
    plant_id INT NOT NULL,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(500),
    code VARCHAR(50) NOT NULL,  -- e.g., "AREA"
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (plant_id) REFERENCES Plant(id) ON DELETE CASCADE
);
```

#### 3. **Machine Table**
```sql
CREATE TABLE Machine (
    id INT IDENTITY(1,1) PRIMARY KEY,
    line_id INT NOT NULL,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(500),
    code VARCHAR(50) NOT NULL,  -- e.g., "MACHINE"
    machine_number INT NOT NULL,  -- e.g., "NUMBER"
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (line_id) REFERENCES Line(id) ON DELETE CASCADE
);
```

#### 4. **TicketApproval Table**
```sql
CREATE TABLE TicketApproval (
    id INT IDENTITY(1,1) PRIMARY KEY,
    personno INT NOT NULL,  -- Reference to Person.PERSONNO
    plant_id INT NOT NULL,
    approval_level INT NOT NULL DEFAULT 1,  -- 1=Plant, 2=Area, 3=Line
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (personno) REFERENCES Person(PERSONNO),
    FOREIGN KEY (plant_id) REFERENCES Plant(id) ON DELETE CASCADE,
    UNIQUE(personno, plant_id, approval_level)
);
```

### **Tickets Table Modifications**

#### **Columns Added:**
- `plant_id INT NOT NULL` - Plant reference
- `line_id INT NOT NULL` - Line/Area reference  
- `machine_id INT NOT NULL` - Machine reference
- `machine_number INT NOT NULL` - Machine number
- `cost_avoidance DECIMAL(15,2) NULL` - Cost avoidance tracking
- `downtime_avoidance_hours DECIMAL(8,2) NULL` - Downtime avoidance
- `failure_mode_id INT DEFAULT 0` - Failure mode reference
- `approve_at DATETIME2 NULL` - Approval timestamp
- `reject_at DATETIME2 NULL` - Rejection timestamp

#### **Columns Removed:**
- `actual_downtime_hours` - Replaced with downtime_avoidance_hours
- `estimated_downtime_hours` - No longer needed
- `affected_point_type` - Replaced with machine hierarchy
- `affected_point_name` - Replaced with machine hierarchy

---

## 🔄 **Migration Process**

### **Phase 1: Database Schema Update**
1. **Run Schema Script**: Execute `CEDAR6_TICKET_SYSTEM_SCHEMA_V2.sql`
2. **Verify Tables**: Check all new tables are created
3. **Test Constraints**: Verify foreign key relationships
4. **Sample Data**: Insert initial plant/line/machine data

### **Phase 2: Data Migration**
1. **Map Existing Data**: Map existing `pu_id` to new hierarchy
2. **Update Tickets**: Populate new columns with default values
3. **Create Approvals**: Set up initial approval matrix
4. **Validate Data**: Ensure data integrity

### **Phase 3: Backend Migration**
1. **Update Controllers**: Modify ticket controller for new schema
2. **Update Services**: Adapt services for new structure
3. **Update APIs**: Modify API endpoints
4. **Update Validation**: Add new validation rules

### **Phase 4: Frontend Migration**
1. **Update Forms**: Modify ticket creation forms
2. **Update Lists**: Adapt ticket listing views
3. **Update Search**: Modify machine search functionality
4. **Update Workflow**: Implement approval workflow UI

---

## 📋 **PUCODE Format Examples**

### **Format**: `PLANT-AREA-LINE-MACHINE-NUMBER`

#### **Examples:**
- `PLANT-AREA-A-CONV-1` - Plant, Area A, Conveyor, Machine 1
- `PLANT-AREA-B-PKG-2` - Plant, Area B, Packaging, Machine 2
- `PLANT-QC-SCAN-1` - Plant, Quality Control, Scanner, Machine 1
- `PLANT2-PROD-TEST-1` - Plant 2, Production, Test Equipment, Machine 1

---

## 🔐 **Approval Workflow**

### **Approval Levels:**
- **Level 1**: Plant Level (Plant Manager)
- **Level 2**: Area Level (Area Manager)  
- **Level 3**: Line Level (Line Supervisor)
- **Level 4**: Machine Level (Machine Operator)

### **Approval Process:**
1. **Ticket Created** → Status: `pending_approval`
2. **Level 1 Review** → Plant Manager approval
3. **Level 2 Review** → Area Manager approval (if needed)
4. **Level 3 Review** → Line Supervisor approval (if needed)
5. **Approved** → Status: `approved`, `approve_at` timestamp set
6. **Rejected** → Status: `rejected`, `reject_at` timestamp set

---

## 📊 **Cost Tracking**

### **Cost Avoidance Fields:**
- `cost_avoidance` - Monetary value of cost avoided
- `downtime_avoidance_hours` - Hours of downtime prevented

### **Use Cases:**
- **Preventive Maintenance**: Track cost savings from preventing failures
- **Quick Response**: Measure value of rapid ticket resolution
- **Process Improvement**: Quantify impact of workflow improvements

---

## 🔍 **Views and Procedures**

### **Views Created:**
- `V_MachineHierarchy` - Full machine hierarchy with codes
- `V_TicketDetails` - Tickets with complete hierarchy information

### **Stored Procedures:**
- `sp_GetPlantApprovers` - Get available approvers for a plant
- `sp_ValidateMachineHierarchy` - Validate machine hierarchy codes

---

## 🚀 **Next Steps**

### **Immediate Actions:**
1. ✅ **Database Schema** - Created and ready for deployment
2. ⏳ **Backend Migration** - Update controllers and services
3. ⏳ **Frontend Migration** - Update UI components
4. ⏳ **Testing** - Comprehensive testing of new workflow

### **Backend Migration Tasks:**
- [ ] Update `ticketController.js` for new schema
- [ ] Modify `createTicket` function
- [ ] Update `getTickets` with hierarchy joins
- [ ] Implement approval workflow endpoints
- [ ] Add cost tracking functionality
- [ ] Update validation rules

### **Frontend Migration Tasks:**
- [ ] Update ticket creation form
- [ ] Modify machine selection component
- [ ] Implement approval workflow UI
- [ ] Add cost tracking fields
- [ ] Update ticket listing views
- [ ] Modify search functionality

---

## 📝 **Notes**

### **Backward Compatibility:**
- Existing `pu_id` column remains for reference
- Old ticket data preserved during migration
- Gradual migration approach recommended

### **Performance Considerations:**
- Indexes added for optimal query performance
- Views created for common queries
- Stored procedures for complex operations

### **Security:**
- Foreign key constraints ensure data integrity
- Approval levels control access
- Audit trail through timestamps

---

## 📞 **Support**

For questions or issues during migration:
1. Check this documentation first
2. Review the SQL schema file
3. Test in development environment
4. Contact development team for assistance

**Migration Status**: 🟡 **In Progress** - Database schema ready, backend migration pending
