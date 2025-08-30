# 🗄️ Database Documentation

This folder contains comprehensive documentation for the Ticket System database schema and structure.

## 📁 Files Overview

### **Core Schema Files**
| File | Purpose | Use Case |
|------|---------|----------|
| `TICKET_SCHEMA_COMPLETE.sql` | Complete SQL schema with all tables, constraints, and indexes | Database setup, schema reference |
| `ticket_system_tables.sql` | Original table creation script | Initial database setup |
| `update_ticket_workflow.sql` | Migration script for workflow updates | Updating existing databases |

### **Documentation Files**
| File | Purpose | Use Case |
|------|---------|----------|
| `TICKET_DATABASE_DIAGRAM.md` | Visual ASCII diagram of database structure | Understanding table relationships |
| `TICKET_FIELD_REFERENCE.md` | Detailed field-by-field reference guide | Development reference, field details |
| `TICKET_QUICK_REFERENCE.md` | Quick lookup reference for developers | Daily development, quick queries |
| `README.md` | This file - overview and navigation | Getting started, file navigation |

### **Workflow Documentation**
| File | Purpose | Use Case |
|------|---------|----------|
| `../UPDATED_TICKET_WORKFLOW.md` | Complete workflow implementation guide | Understanding business logic, API usage |

## 🚀 Getting Started

### **For New Developers**
1. Start with `TICKET_QUICK_REFERENCE.md` - Quick overview
2. Review `TICKET_DATABASE_DIAGRAM.md` - Visual understanding
3. Use `TICKET_FIELD_REFERENCE.md` - Detailed field information
4. Reference `TICKET_SCHEMA_COMPLETE.sql` - Complete schema

### **For Database Administrators**
1. Use `TICKET_SCHEMA_COMPLETE.sql` for new installations
2. Use `update_ticket_workflow.sql` for existing database updates
3. Reference `TICKET_DATABASE_DIAGRAM.md` for relationship understanding

### **For System Architects**
1. Review `TICKET_DATABASE_DIAGRAM.md` for structure overview
2. Study `TICKET_FIELD_REFERENCE.md` for field design decisions
3. Understand workflow in `../UPDATED_TICKET_WORKFLOW.md`

## 🏗️ Database Structure

### **Main Tables**
- **Tickets** - Core ticket information and workflow status
- **TicketImages** - Attached images and photos
- **TicketComments** - User comments and updates
- **TicketStatusHistory** - Complete audit trail of status changes
- **TicketAssignments** - Assignment history and tracking

### **Key Features**
- **Workflow Support**: Complete L1 → L2 → L3 escalation workflow
- **Audit Trail**: All changes logged with user and timestamp
- **Flexible Equipment**: Can reference machines, areas, or equipment
- **Performance Optimized**: Strategic indexing on commonly queried fields
- **Data Integrity**: Cascade deletes and foreign key constraints

## 🔄 Current Database State

- **Database**: CMMS on 192.168.0.25\SQLEXPRESS
- **Total Tickets**: 23 tickets in system
- **Current Status**: All tickets in 'open' status
- **Schema Version**: Updated with new workflow fields
- **New Fields**: `escalated_to`, `escalation_reason`, `rejection_reason`

## 📊 Database Statistics

### **Table Sizes**
- **Tickets**: 23 records
- **TicketImages**: Variable (depends on attachments)
- **TicketComments**: Variable (depends on activity)
- **TicketStatusHistory**: Variable (depends on status changes)
- **TicketAssignments**: Variable (depends on assignments)

### **Indexes**
- **Primary Keys**: 5 (one per table)
- **Performance Indexes**: 25+ strategic indexes
- **Foreign Key Constraints**: 10+ relationship constraints

## 🛠️ Maintenance & Updates

### **Regular Maintenance**
- Monitor index performance
- Check foreign key integrity
- Review status history growth
- Clean up orphaned records

### **Schema Updates**
- Use `update_ticket_workflow.sql` for workflow changes
- Test migrations on development database first
- Backup production data before schema changes
- Update documentation after schema changes

## 🔍 Common Queries

### **Performance Monitoring**
```sql
-- Check table sizes
SELECT 
    t.name AS TableName,
    p.rows AS RowCounts,
    SUM(a.total_pages) * 8 AS TotalSpaceKB
FROM sys.tables t
INNER JOIN sys.indexes i ON t.object_id = i.object_id
INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
WHERE t.name LIKE '%Ticket%'
GROUP BY t.name, p.rows
ORDER BY t.name;
```

### **Index Usage**
```sql
-- Check index usage
SELECT 
    OBJECT_NAME(s.object_id) AS TableName,
    i.name AS IndexName,
    s.user_seeks,
    s.user_scans,
    s.user_lookups
FROM sys.dm_db_index_usage_stats s
INNER JOIN sys.indexes i ON s.object_id = i.object_id AND s.index_id = i.index_id
WHERE OBJECT_NAME(s.object_id) LIKE '%Ticket%'
ORDER BY s.user_seeks DESC;
```

## 📚 Additional Resources

### **Database Tools**
- **SQL Server Management Studio** - Primary database management tool
- **Azure Data Studio** - Cross-platform database tool
- **DBeaver** - Universal database tool

### **Monitoring Tools**
- **SQL Server Profiler** - Query performance analysis
- **Database Engine Tuning Advisor** - Index optimization
- **Extended Events** - Advanced monitoring and troubleshooting

### **Documentation Standards**
- **Naming Convention**: PascalCase for tables, PascalCase for columns
- **Index Naming**: `IX_TableName_ColumnName` for performance indexes
- **Constraint Naming**: `FK_TableName_ColumnName` for foreign keys
- **Comment Style**: Use `--` for single line, `/* */` for multi-line

## 🤝 Contributing

### **Documentation Updates**
- Update relevant files when schema changes
- Keep examples current with actual data
- Test all SQL examples before committing
- Maintain consistency across all files

### **Schema Changes**
- Document all changes in migration scripts
- Update diagram and reference files
- Test changes on development database
- Coordinate with development team

## 📞 Support

### **Database Issues**
- Check this documentation first
- Review error logs and performance metrics
- Consult with database administrator
- Test solutions on development environment

### **Documentation Issues**
- Verify information against actual database
- Check for outdated examples or references
- Update files with current information
- Maintain consistency across all documents

---

**Last Updated**: January 2024  
**Database Version**: Workflow-Enabled Schema  
**Maintainer**: Development Team
