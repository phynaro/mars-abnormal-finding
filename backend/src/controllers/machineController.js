const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

const machineController = {
  // Create a new machine
  createMachine: async (req, res) => {
    try {
      const {
        MachineName,
        MachineCode,
        MachineType,
        Manufacturer,
        Model,
        SerialNumber,
        Location,
        Department,
        InstallationDate,
        LastMaintenanceDate,
        NextMaintenanceDate,
        Status,
        Capacity,
        PowerRating,
        OperatingHours,
        Criticality,
        AssetTag,
        PurchasePrice,
        CurrentValue,
        WarrantyExpiryDate,
        Notes,
        CreatedBy
      } = req.body;

      // Validate required fields
      if (!MachineName || !MachineCode || !MachineType) {
        return res.status(400).json({
          success: false,
          message: 'MachineName, MachineCode, and MachineType are required'
        });
      }

      const pool = await sql.connect(dbConfig);
      
      const result = await pool.request()
        .input('MachineName', sql.NVarChar, MachineName)
        .input('MachineCode', sql.NVarChar, MachineCode)
        .input('MachineType', sql.NVarChar, MachineType)
        .input('Manufacturer', sql.NVarChar, Manufacturer)
        .input('Model', sql.NVarChar, Model)
        .input('SerialNumber', sql.NVarChar, SerialNumber)
        .input('Location', sql.NVarChar, Location)
        .input('Department', sql.NVarChar, Department)
        .input('InstallationDate', sql.Date, InstallationDate)
        .input('LastMaintenanceDate', sql.Date, LastMaintenanceDate)
        .input('NextMaintenanceDate', sql.Date, NextMaintenanceDate)
        .input('Status', sql.NVarChar, Status || 'Active')
        .input('Capacity', sql.NVarChar, Capacity)
        .input('PowerRating', sql.NVarChar, PowerRating)
        .input('OperatingHours', sql.Int, OperatingHours || 0)
        .input('Criticality', sql.NVarChar, Criticality || 'Medium')
        .input('AssetTag', sql.NVarChar, AssetTag)
        .input('PurchasePrice', sql.Decimal(15, 2), PurchasePrice)
        .input('CurrentValue', sql.Decimal(15, 2), CurrentValue)
        .input('WarrantyExpiryDate', sql.Date, WarrantyExpiryDate)
        .input('Notes', sql.NVarChar, Notes)
        .input('CreatedBy', sql.NVarChar, CreatedBy || 'System')
        .query(`
          INSERT INTO Machine (
            MachineName, MachineCode, MachineType, Manufacturer, Model, SerialNumber,
            Location, Department, InstallationDate, LastMaintenanceDate, NextMaintenanceDate,
            Status, Capacity, PowerRating, OperatingHours, Criticality, AssetTag,
            PurchasePrice, CurrentValue, WarrantyExpiryDate, Notes, CreatedBy
          ) VALUES (
            @MachineName, @MachineCode, @MachineType, @Manufacturer, @Model, @SerialNumber,
            @Location, @Department, @InstallationDate, @LastMaintenanceDate, @NextMaintenanceDate,
            @Status, @Capacity, @PowerRating, @OperatingHours, @Criticality, @AssetTag,
            @PurchasePrice, @CurrentValue, @WarrantyExpiryDate, @Notes, @CreatedBy
          );
          
          SELECT SCOPE_IDENTITY() AS MachineID;
        `);

      const machineId = result.recordset[0].MachineID;

      res.status(201).json({
        success: true,
        message: 'Machine created successfully',
        data: { MachineID: machineId }
      });

    } catch (error) {
      console.error('Create Machine Error:', error);
      
      // Handle duplicate key error
      if (error.number === 2627) {
        return res.status(400).json({
          success: false,
          message: 'Machine with this code already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create machine',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // Get all machines with optional filtering
  getAllMachines: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        department,
        status,
        machineType,
        criticality
      } = req.query;

      const pool = await sql.connect(dbConfig);

      // Build parameterized WHERE clause and inputs - adapted for PU table
      const conditions = ['FLAGDEL != \'Y\'']; // Active production units (not deleted)
      const requestForCount = pool.request();
      const requestForData = pool.request();

      if (search) {
        conditions.push('(PUNAME LIKE @search OR PUCODE LIKE @search OR PULOCATION LIKE @search)');
        requestForCount.input('search', sql.NVarChar, `%${search}%`);
        requestForData.input('search', sql.NVarChar, `%${search}%`);
      }

      if (department) {
        conditions.push('DEPTNO = @department');
        requestForCount.input('department', sql.Int, department);
        requestForData.input('department', sql.Int, department);
      }

      if (status) {
        // Map status to FLAGDEL field
        const flagValue = status === 'Active' ? 'N' : 'Y';
        conditions.push('FLAGDEL = @status');
        requestForCount.input('status', sql.VarChar, flagValue);
        requestForData.input('status', sql.VarChar, flagValue);
      }

      if (machineType) {
        conditions.push('PUTYPENO = @machineType');
        requestForCount.input('machineType', sql.Int, machineType);
        requestForData.input('machineType', sql.Int, machineType);
      }

      if (criticality) {
        // Map criticality to PUCRITICALNO
        let criticalityNo = 1; // Default to Low
        if (criticality === 'Medium') criticalityNo = 2;
        else if (criticality === 'High') criticalityNo = 3;
        
        conditions.push('PUCRITICALNO = @criticality');
        requestForCount.input('criticality', sql.Int, criticalityNo);
        requestForData.input('criticality', sql.Int, criticalityNo);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      // Get total count (parameterized) - using PU table instead of Machine
      const countResult = await requestForCount.query(`SELECT COUNT(*) AS total FROM PU ${whereClause}`);
      const total = countResult.recordset[0].total;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      requestForData.input('offset', sql.Int, offset);
      requestForData.input('limit', sql.Int, parseInt(limit));

      // Get machines with pagination (parameterized) - mapping PU table columns to Machine interface
      const result = await requestForData.query(`
        SELECT 
          PUNO AS MachineID, 
          PUNAME AS MachineName, 
          PUCODE AS MachineCode, 
          PUTYPENO AS MachineType, 
          TEXT1 AS Manufacturer, 
          TEXT2 AS Model,
          TEXT3 AS SerialNumber, 
          PULOCATION AS Location, 
          DEPTNO AS Department, 
          CREATEDATE AS InstallationDate, 
          UPDATEDATE AS LastMaintenanceDate,
          UPDATEDATE AS NextMaintenanceDate,
          CASE WHEN FLAGDEL = 'Y' THEN 'Inactive' ELSE 'Active' END AS Status, 
          TEXT4 AS Capacity, 
          TEXT5 AS PowerRating, 
          NUMBER1 AS OperatingHours,
          CASE WHEN PUCRITICALNO = 1 THEN 'Low' WHEN PUCRITICALNO = 2 THEN 'Medium' WHEN PUCRITICALNO = 3 THEN 'High' ELSE 'Low' END AS Criticality, 
          PUREFCODE AS AssetTag, 
          NUMBER2 AS PurchasePrice, 
          NUMBER1 AS CurrentValue, 
          DATE1 AS WarrantyExpiryDate,
          NOTE AS Notes, 
          CREATEUSER AS CreatedBy, 
          CREATEDATE AS CreatedDate, 
          UPDATEUSER AS ModifiedBy, 
          UPDATEDATE AS ModifiedDate,
          CASE WHEN FLAGDEL = 'Y' THEN 0 ELSE 1 END AS IsActive
        FROM PU 
        ${whereClause}
        ORDER BY PUNO DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `);

      res.json({
        success: true,
        data: result.recordset,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get All Machines Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve machines',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // Get machine by ID
  getMachineById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const pool = await sql.connect(dbConfig);
      
      const result = await pool.request()
        .input('PUNO', sql.Int, id)
        .query(`
          SELECT 
            PUNO AS MachineID, 
            PUNAME AS MachineName, 
            PUCODE AS MachineCode, 
            PUTYPENO AS MachineType, 
            TEXT1 AS Manufacturer, 
            TEXT2 AS Model,
            TEXT3 AS SerialNumber, 
            PULOCATION AS Location, 
            DEPTNO AS Department, 
            CREATEDATE AS InstallationDate, 
            UPDATEDATE AS LastMaintenanceDate,
            UPDATEDATE AS NextMaintenanceDate,
            CASE WHEN FLAGDEL = 'Y' THEN 'Inactive' ELSE 'Active' END AS Status, 
            TEXT4 AS Capacity, 
            TEXT5 AS PowerRating, 
            NUMBER1 AS OperatingHours,
            CASE WHEN PUCRITICALNO = 1 THEN 'Low' WHEN PUCRITICALNO = 2 THEN 'Medium' WHEN PUCRITICALNO = 3 THEN 'High' ELSE 'Low' END AS Criticality, 
            PUREFCODE AS AssetTag, 
            NUMBER2 AS PurchasePrice, 
            NUMBER1 AS CurrentValue, 
            DATE1 AS WarrantyExpiryDate,
            NOTE AS Notes, 
            CREATEUSER AS CreatedBy, 
            CREATEDATE AS CreatedDate, 
            UPDATEUSER AS ModifiedBy, 
            UPDATEDATE AS ModifiedDate,
            CASE WHEN FLAGDEL = 'Y' THEN 0 ELSE 1 END AS IsActive
          FROM PU 
          WHERE PUNO = @PUNO AND FLAGDEL != 'Y'
        `);

      if (result.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Machine not found'
        });
      }

      res.json({
        success: true,
        data: result.recordset[0]
      });

    } catch (error) {
      console.error('Get Machine By ID Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve machine',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // Update machine
  updateMachine: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Remove fields that shouldn't be updated
      delete updateData.MachineID;
      delete updateData.CreatedBy;
      delete updateData.CreatedDate;
      delete updateData.IsActive;

      const pool = await sql.connect(dbConfig);
      
      // Check if machine exists
      const checkResult = await pool.request()
        .input('MachineID', sql.Int, id)
        .query('SELECT MachineID FROM Machine WHERE MachineID = @MachineID AND IsActive = 1');

      if (checkResult.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Machine not found'
        });
      }

      // Build dynamic update query
      const updateFields = [];
      const inputs = {};
      
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined && updateData[key] !== null) {
          updateFields.push(`${key} = @${key}`);
        }
      });

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }

      // Add ModifiedBy and ModifiedDate
      updateFields.push('ModifiedBy = @ModifiedBy');
      updateFields.push('ModifiedDate = GETDATE()');

      // Build the request with all inputs
      const request = pool.request()
        .input('MachineID', sql.Int, id)
        .input('ModifiedBy', sql.NVarChar, req.user?.username || 'System');

      // Add all update fields as inputs
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined && updateData[key] !== null) {
          if (key === 'InstallationDate' || key === 'LastMaintenanceDate' || key === 'NextMaintenanceDate' || key === 'WarrantyExpiryDate') {
            request.input(key, sql.Date, updateData[key]);
          } else if (key === 'OperatingHours') {
            request.input(key, sql.Int, updateData[key]);
          } else if (key === 'PurchasePrice' || key === 'CurrentValue') {
            request.input(key, sql.Decimal(15, 2), updateData[key]);
          } else {
            request.input(key, sql.NVarChar, updateData[key]);
          }
        }
      });

      await request.query(`
        UPDATE Machine 
        SET ${updateFields.join(', ')}
        WHERE MachineID = @MachineID
      `);

      res.json({
        success: true,
        message: 'Machine updated successfully'
      });

    } catch (error) {
      console.error('Update Machine Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update machine',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // Delete machine (soft delete)
  deleteMachine: async (req, res) => {
    try {
      const { id } = req.params;
      
      const pool = await sql.connect(dbConfig);
      
      // Check if machine exists
      const checkResult = await pool.request()
        .input('MachineID', sql.Int, id)
        .query('SELECT MachineID FROM Machine WHERE MachineID = @MachineID AND IsActive = 1');

      if (checkResult.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Machine not found'
        });
      }

      // Soft delete
      await pool.request()
        .input('MachineID', sql.Int, id)
        .input('ModifiedBy', sql.NVarChar, req.user?.username || 'System')
        .query(`
          UPDATE Machine 
          SET IsActive = 0, ModifiedBy = @ModifiedBy, ModifiedDate = GETDATE()
          WHERE MachineID = @MachineID
        `);

      res.json({
        success: true,
        message: 'Machine deleted successfully'
      });

    } catch (error) {
      console.error('Delete Machine Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete machine',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // Get machine statistics
  getMachineStats: async (req, res) => {
    try {
      const pool = await sql.connect(dbConfig);
      
      const result = await pool.request()
        .query(`
          SELECT 
            COUNT(*) AS totalMachines,
            COUNT(CASE WHEN FLAGDEL != 'Y' THEN 1 END) AS activeMachines,
            COUNT(CASE WHEN FLAGDEL = 'Y' THEN 1 END) AS maintenanceMachines,
            COUNT(CASE WHEN FLAGDEL = 'Y' THEN 1 END) AS inactiveMachines,
            COUNT(CASE WHEN PUCRITICALNO = 3 THEN 1 END) AS criticalMachines,
            COUNT(CASE WHEN PUCRITICALNO = 3 THEN 1 END) AS highPriorityMachines,
            COUNT(CASE WHEN UPDATEDATE <= FORMAT(DATEADD(day, 30, GETDATE()), 'yyyyMMdd') THEN 1 END) AS maintenanceDueSoon
          FROM PU 
          WHERE FLAGDEL != 'Y'
        `);

      res.json({
        success: true,
        data: result.recordset[0]
      });

    } catch (error) {
      console.error('Get Machine Stats Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve machine statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
};

module.exports = machineController;
