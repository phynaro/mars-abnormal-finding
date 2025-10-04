const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

// Helper function to get database connection
async function getConnection() {
  try {
    const pool = await sql.connect(dbConfig);
    return pool;
  } catch (err) {
    console.error('Database connection error:', err);
    throw new Error('Database connection failed');
  }
}

// ==================== TICKET APPROVAL CRUD OPERATIONS ====================

// Get all ticket approvals (distinct user and level combinations)
const getTicketApprovals = async (req, res) => {
  try {
    const { plant_code, personno, search, is_active } = req.query;
    const pool = await getConnection();
    
    let whereClause = '';
    const request = pool.request();
    
    if (plant_code) {
      whereClause = 'WHERE ta.plant_code = @plant_code';
      request.input('plant_code', sql.NVarChar, plant_code);
    }
    
    if (personno) {
      whereClause = whereClause ? `${whereClause} AND ta.personno = @personno` : 'WHERE ta.personno = @personno';
      request.input('personno', sql.Int, personno);
    }

    if (search) {
      const searchCondition = `(ta.personno LIKE @search OR per.PERSON_NAME LIKE @search OR per.FIRSTNAME LIKE @search OR per.LASTNAME LIKE @search OR per.PERSONCODE LIKE @search)`;
      whereClause = pool.request ? `${whereClause} AND ${searchCondition}` : `WHERE ${searchCondition}`;
      request.input('search', sql.NVarChar, `%${search}%`);
    }

    if (is_active !== undefined) {
      const activeCondition = 'ta.is_active = @is_active';
      whereClause = whereClause ? `${whereClause} AND ${activeCondition}` : `WHERE ${activeCondition}`;
      request.input('is_active', sql.Bit, is_active === 'true' ? 1 : 0);
    }

    const result = await request.query(`
      SELECT 
             ta.personno, 
             ta.approval_level, 
             CAST(MAX(CAST(ta.is_active AS INT)) AS BIT) as is_active, 
             MIN(ta.created_at) as created_at, 
             MAX(ta.updated_at) as updated_at,
             per.PERSON_NAME as person_name, 
             per.FIRSTNAME, 
             per.LASTNAME, 
             per.PERSONCODE,
             CASE 
               WHEN ta.approval_level = 1 THEN 'L1 - Create/Review/Reopen'
               WHEN ta.approval_level = 2 THEN 'L2 - Accept/Reject/Escalate/Complete'
               WHEN ta.approval_level = 3 THEN 'L3 - Reassign/Reject Final'
               WHEN ta.approval_level = 4 THEN 'L4 - Approve Close'
               ELSE 'Unknown Level'
             END as approval_level_name,
             COUNT(*) as total_approvals
      FROM TicketApproval ta
      LEFT JOIN Person per ON ta.personno = per.PERSONNO
      ${whereClause}
      GROUP BY ta.personno, ta.approval_level, per.PERSON_NAME, per.FIRSTNAME, per.LASTNAME, per.PERSONCODE
      ORDER BY per.PERSON_NAME, ta.approval_level
    `);

    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });

  } catch (error) {
    console.error('Get ticket approvals error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get all approvals for a specific person and level (for editing)
const getTicketApprovalsByPersonAndLevel = async (req, res) => {
  try {
    const { personno, approval_level } = req.params;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('personno', sql.Int, personno)
      .input('approval_level', sql.Int, approval_level)
      .query(`
        SELECT ta.id, ta.personno, ta.plant_code, ta.area_code, ta.line_code, ta.machine_code, 
               ta.approval_level, ta.is_active, ta.created_at, ta.updated_at,
               per.PERSON_NAME as person_name, per.FIRSTNAME, per.LASTNAME, per.PERSONCODE,
               CASE 
                 WHEN ta.machine_code IS NOT NULL THEN 'Machine: ' + ta.machine_code
                 WHEN ta.line_code IS NOT NULL THEN 'Line: ' + ta.line_code
                 WHEN ta.area_code IS NOT NULL THEN 'Area: ' + ta.area_code
                 ELSE 'Plant: ' + ta.plant_code
               END as location_scope,
               CASE 
                 WHEN ta.approval_level = 1 THEN 'L1 - Create/Review/Reopen'
                 WHEN ta.approval_level = 2 THEN 'L2 - Accept/Reject/Escalate/Complete'
                 WHEN ta.approval_level = 3 THEN 'L3 - Reassign/Reject Final'
                 WHEN ta.approval_level = 4 THEN 'L4 - Approve Close'
                 ELSE 'Unknown Level'
               END as approval_level_name
        FROM TicketApproval ta
        LEFT JOIN Person per ON ta.personno = per.PERSONNO
        WHERE ta.personno = @personno AND ta.approval_level = @approval_level
        ORDER BY ta.plant_code, ta.area_code, ta.line_code, ta.machine_code
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No approvals found for this person and level'
      });
    }

    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });

  } catch (error) {
    console.error('Get ticket approvals by person and level error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get ticket approval by ID
const getTicketApprovalById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT ta.id, ta.personno, ta.plant_code, ta.area_code, ta.line_code, ta.machine_code, 
               ta.approval_level, ta.is_active, ta.created_at, ta.updated_at,
               per.PERSON_NAME as person_name, per.FIRSTNAME, per.LASTNAME, per.PERSONCODE,
               CASE 
                 WHEN ta.machine_code IS NOT NULL THEN 'Machine: ' + ta.machine_code
                 WHEN ta.line_code IS NOT NULL THEN 'Line: ' + ta.line_code
                 WHEN ta.area_code IS NOT NULL THEN 'Area: ' + ta.area_code
                 ELSE 'Plant: ' + ta.plant_code
               END as location_scope,
               CASE 
                 WHEN ta.approval_level = 1 THEN 'L1 - Create/Review/Reopen'
                 WHEN ta.approval_level = 2 THEN 'L2 - Accept/Reject/Escalate/Complete'
                 WHEN ta.approval_level = 3 THEN 'L3 - Reassign/Reject Final'
                 WHEN ta.approval_level = 4 THEN 'L4 - Approve Close'
                 ELSE 'Unknown Level'
               END as approval_level_name
        FROM TicketApproval ta
        LEFT JOIN Person per ON ta.personno = per.PERSONNO
        WHERE ta.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket approval not found'
      });
    }

    res.json({
      success: true,
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('Get ticket approval by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Create new ticket approval
const createTicketApproval = async (req, res) => {
  try {
    const { personno, plant_code, area_code, line_code, machine_code, approval_level, is_active = true } = req.body;
    const pool = await getConnection();

    // Validate required fields
    if (!personno || !plant_code || !approval_level) {
      return res.status(400).json({
        success: false,
        message: 'Person number, plant code, and approval level are required'
      });
    }

    // Validate approval level (1-4 only)
    if (![1, 2, 3, 4].includes(parseInt(approval_level))) {
      return res.status(400).json({
        success: false,
        message: 'Approval level must be 1, 2, 3, or 4'
      });
    }

    // Check if person exists
    const personCheck = await pool.request()
      .input('personno', sql.Int, personno)
      .query('SELECT PERSONNO FROM Person WHERE PERSONNO = @personno');
    
    if (personCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Person not found'
      });
    }
    
    // Check if plant exists in PUExtension
    const plantCheck = await pool.request()
      .input('plant_code', sql.NVarChar, plant_code)
      .query('SELECT DISTINCT plant FROM PUExtension WHERE plant = @plant_code AND digit_count = 1');
    
    if (plantCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Plant not found'
      });
    }

    // Check if person already has approval for this location and level
    const existingApproval = await pool.request()
      .input('personno', sql.Int, personno)
      .input('plant_code', sql.NVarChar, plant_code)
      .input('area_code', sql.NVarChar, area_code)
      .input('line_code', sql.NVarChar, line_code)
      .input('machine_code', sql.NVarChar, machine_code)
      .input('approval_level', sql.Int, approval_level)
      .query(`
        SELECT id FROM TicketApproval 
        WHERE personno = @personno 
        AND plant_code = @plant_code 
        AND ISNULL(area_code, '') = ISNULL(@area_code, '')
        AND ISNULL(line_code, '') = ISNULL(@line_code, '')
        AND ISNULL(machine_code, '') = ISNULL(@machine_code, '')
        AND approval_level = @approval_level
      `);
    
    if (existingApproval.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Person already has approval for this location and level'
      });
    }

    const result = await pool.request()
      .input('personno', sql.Int, personno)
      .input('plant_code', sql.NVarChar, plant_code)
      .input('area_code', sql.NVarChar, area_code)
      .input('line_code', sql.NVarChar, line_code)
      .input('machine_code', sql.NVarChar, machine_code)
      .input('approval_level', sql.Int, approval_level)
      .input('is_active', sql.Bit, is_active)
      .query(`
        INSERT INTO TicketApproval 
        (personno, plant_code, area_code, line_code, machine_code, approval_level, is_active, created_at, updated_at)
        OUTPUT INSERTED.id
        VALUES (@personno, @plant_code, @area_code, @line_code, @machine_code, @approval_level, @is_active, GETDATE(), GETDATE())
      `);

    res.status(201).json({
      success: true,
      data: { id: result.recordset[0].id },
      message: 'Ticket approval created successfully'
    });

  } catch (error) {
    console.error('Create ticket approval error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Create multiple ticket approvals (bulk create)
const createMultipleTicketApprovals = async (req, res) => {
  let transaction = null;
  
  try {
    console.log('=== BULK CREATE APPROVALS START ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { approvals } = req.body; // Array of approval objects
    
    if (!approvals || !Array.isArray(approvals) || approvals.length === 0) {
      console.log('Validation failed: approvals array is empty or invalid');
      return res.status(400).json({
        success: false,
        message: 'Approvals array is required and must not be empty'
      });
    }
    
    console.log('Approvals count:', approvals.length);

    const pool = await getConnection();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Validate all approvals first
    const validationErrors = [];
    const personnos = [...new Set(approvals.map(a => a.personno))];
    const plantCodes = [...new Set(approvals.map(a => a.plant_code).filter(Boolean))];

    // Check if all persons exist
    if (personnos.length > 0) {
      const personnosStr = personnos.join(',');
      const personCheck = await transaction.request()
        .query(`SELECT PERSONNO FROM Person WHERE PERSONNO IN (${personnosStr})`);
      
      const existingPersonnos = personCheck.recordset.map(r => r.PERSONNO);
      const missingPersonnos = personnos.filter(p => !existingPersonnos.includes(p));
      
      if (missingPersonnos.length > 0) {
        validationErrors.push(`Persons not found: ${missingPersonnos.join(', ')}`);
      }
    }

    // Check if all plants exist in PUExtension
    if (plantCodes.length > 0) {
      const plantCodesStr = plantCodes.map(code => `'${code}'`).join(',');
      const plantCheck = await transaction.request()
        .query(`SELECT DISTINCT plant FROM PUExtension WHERE plant IN (${plantCodesStr}) AND digit_count = 1`);
      
      const existingPlantCodes = plantCheck.recordset.map(r => r.plant);
      const missingPlantCodes = plantCodes.filter(p => !existingPlantCodes.includes(p));
      
      if (missingPlantCodes.length > 0) {
        validationErrors.push(`Plants not found: ${missingPlantCodes.join(', ')}`);
      }
    }

    // Check for existing approvals to avoid duplicates
    console.log('Checking for existing approvals...');
    console.log('Approvals to check:', JSON.stringify(approvals, null, 2));
    
    // Build individual WHERE conditions for each approval to avoid complex IN clause
    const existingApprovalsConditions = approvals.map(a => {
      const areaCode = a.area_code || '';
      const lineCode = a.line_code || '';
      const machineCode = a.machine_code || '';
      
      return `(personno = ${a.personno} AND plant_code = '${a.plant_code}' AND ISNULL(area_code, '') = '${areaCode}' AND ISNULL(line_code, '') = '${lineCode}' AND ISNULL(machine_code, '') = '${machineCode}' AND approval_level = ${a.approval_level})`;
    }).join(' OR ');
    
    const existingApprovalsQuery = `
      SELECT personno, plant_code, area_code, line_code, machine_code, approval_level
      FROM TicketApproval
      WHERE ${existingApprovalsConditions}
    `;
    
    console.log('Existing approvals query:', existingApprovalsQuery);
    
    const existingApprovals = await transaction.request()
      .query(existingApprovalsQuery);

    if (existingApprovals.recordset.length > 0) {
      const duplicates = existingApprovals.recordset.map(r => 
        `Person ${r.personno} - ${r.plant_code}${r.area_code ? '-' + r.area_code : ''}${r.line_code ? '-' + r.line_code : ''}${r.machine_code ? '-' + r.machine_code : ''} (L${r.approval_level})`
      );
      validationErrors.push(`Duplicate approvals found: ${duplicates.join(', ')}`);
    }

    if (validationErrors.length > 0) {
      if (transaction) {
        await transaction.rollback();
      }
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Create all approvals in bulk
    const createdIds = [];
    const errors = [];

    for (const approval of approvals) {
      try {
        // Validate individual approval
        if (!approval.personno || !approval.plant_code || !approval.approval_level) {
          errors.push({ 
            approval, 
            error: 'Missing required fields: personno, plant_code, approval_level' 
          });
          continue;
        }

        if (![1, 2, 3, 4].includes(parseInt(approval.approval_level))) {
          errors.push({ 
            approval, 
            error: 'Approval level must be 1, 2, 3, or 4' 
          });
          continue;
        }

        console.log('Creating approval:', JSON.stringify(approval, null, 2));
        
        const insertQuery = `
          INSERT INTO TicketApproval 
          (personno, plant_code, area_code, line_code, machine_code, approval_level, is_active, created_at, updated_at)
          OUTPUT INSERTED.id
          VALUES (@personno, @plant_code, @area_code, @line_code, @machine_code, @approval_level, @is_active, GETDATE(), GETDATE())
        `;
        
        console.log('Insert query:', insertQuery);
        console.log('Parameters:', {
          personno: approval.personno,
          plant_code: approval.plant_code,
          area_code: approval.area_code || null,
          line_code: approval.line_code || null,
          machine_code: approval.machine_code || null,
          approval_level: approval.approval_level,
          is_active: approval.is_active !== false
        });
        
        const result = await transaction.request()
          .input('personno', sql.Int, approval.personno)
          .input('plant_code', sql.NVarChar, approval.plant_code)
          .input('area_code', sql.NVarChar, approval.area_code || null)
          .input('line_code', sql.NVarChar, approval.line_code || null)
          .input('machine_code', sql.NVarChar, approval.machine_code || null)
          .input('approval_level', sql.Int, approval.approval_level)
          .input('is_active', sql.Bit, approval.is_active !== false)
          .query(insertQuery);
        
        createdIds.push(result.recordset[0].id);
        console.log(`✓ Successfully created approval for Person ${approval.personno}, Plant ${approval.plant_code}`);
      } catch (error) {
        console.error(`❌ Error creating individual approval:`, error);
        console.error(`   Approval data:`, JSON.stringify(approval, null, 2));
        console.error(`   Error code:`, error.code);
        console.error(`   Error number:`, error.number);
        console.error(`   Error severity:`, error.class);
        console.error(`   Error state:`, error.state);
        console.error(`   Error procedure:`, error.procName);
        console.error(`   Error line number:`, error.lineNumber);
        
        let detailedError = `Database Error: ${error.message}`;
        
        // Handle specific constraint violations
        if (error.number === 2627) {
          detailedError = `Duplicate key constraint violation. An approval already exists for Person ${approval.personno}, Plant ${approval.plant_code}, Level ${approval.approval_level}`;
        } else if (error.number === 547) {
          detailedError = `Foreign key constraint violation. Referenced data doesn't exist. Check if Person ${approval.personno} or Plant ${approval.plant_code} exists.`;
        } else if (error.number === 515) {
          detailedError = `Cannot insert null value into table. Required fields are missing for Person ${approval.personno}, Plant ${approval.plant_code}`;
        } else if (error.number === 8152) {
          detailedError = `String or binary data would be truncated. One of the codes (Plant: ${approval.plant_code}, Area: ${approval.area_code || 'null'}, Line: ${approval.line_code || 'null'}, Machine: ${approval.machine_code || 'null'}) is too long for the database field.`;
        }
        
        errors.push({ 
          approval, 
          error: detailedError,
          code: error.code,
          number: error.number,
          message: error.message
        });
      }
    }

    if (errors.length > 0) {
      if (transaction) {
        await transaction.rollback();
      }
      return res.status(500).json({
        success: false,
        message: 'Some approvals failed to create',
        data: {
          created: createdIds,
          errors: errors
        }
      });
    }

    if (transaction) {
      await transaction.commit();
    }

    console.log('=== BULK CREATE APPROVALS SUCCESS ===');
    console.log('Created IDs:', createdIds);
    console.log('Total created:', createdIds.length);

    res.status(201).json({
      success: true,
      data: { 
        ids: createdIds,
        count: createdIds.length
      },
      message: `Successfully created ${createdIds.length} ticket approvals`
    });
	
  } catch (error) {
    console.log('=== BULK CREATE APPROVALS MAIN ERROR ===');
    console.error('Full error object:', JSON.stringify(error, null, 2));
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error number:', error.number);
    console.error('Error severity:', error.class);
    console.error('Error state:', error.state);
    console.error('Error procedure:', error.procName);
    console.error('Error line number:', error.lineNumber);
    console.error('Error stack:', error.stack);
    
    if (transaction) {
      try {
        await transaction.rollback();
        console.log('Transaction rolled back successfully');
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
    }
    
    let detailedMessage = 'Failed to create ticket approvals';
    if (error.number === 2627) {
      detailedMessage = 'Duplicate constraint violation detected';
    } else if (error.number === 547) {
      detailedMessage = 'Foreign key constraint violation detected';
    } else if (error.number === 515) {
      detailedMessage = 'Null value constraint violation detected';
    } else if (error.number === 8152) {
      detailedMessage = 'Data truncation error detected';
    }
    
    res.status(500).json({ 
      success: false, 
      message: detailedMessage,
      error: error.message,
      code: error.code,
      number: error.number,
      procedure: error.procName,
      lineNumber: error.lineNumber
    });
  }
};

// Update ticket approval
const updateTicketApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { personno, plant_code, area_code, line_code, machine_code, approval_level, is_active } = req.body;
    const pool = await getConnection();
    
    // Check if ticket approval exists
    const existingApproval = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id FROM TicketApproval WHERE id = @id');
    
    if (existingApproval.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket approval not found'
      });
    }

    // Check if plant exists in PUExtension
    const plantCheck = await pool.request()
      .input('plant_code', sql.NVarChar, plant_code)
      .query('SELECT DISTINCT plant FROM PUExtension WHERE plant = @plant_code AND digit_count = 1');
    
    if (plantCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Plant not found'
      });
    }

    // Check if person already has approval for this location and level (excluding current record)
    const duplicateCheck = await pool.request()
      .input('personno', sql.Int, personno)
      .input('plant_code', sql.NVarChar, plant_code)
      .input('area_code', sql.NVarChar, area_code || null)
      .input('line_code', sql.NVarChar, line_code || null)
      .input('machine_code', sql.NVarChar, machine_code || null)
      .input('approval_level', sql.Int, approval_level)
      .input('id', sql.Int, id)
      .query(`
        SELECT id FROM TicketApproval 
        WHERE personno = @personno AND plant_code = @plant_code 
        AND ISNULL(area_code, '') = ISNULL(@area_code, '')
        AND ISNULL(line_code, '') = ISNULL(@line_code, '')
        AND ISNULL(machine_code, '') = ISNULL(@machine_code, '')
        AND approval_level = @approval_level AND id != @id
      `);
    
    if (duplicateCheck.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Person already has approval for this location and level'
      });
    }

    await pool.request()
      .input('id', sql.Int, id)
      .input('personno', sql.Int, personno)
      .input('plant_code', sql.NVarChar, plant_code)
      .input('area_code', sql.NVarChar, area_code || null)
      .input('line_code', sql.NVarChar, line_code || null)
      .input('machine_code', sql.NVarChar, machine_code || null)
      .input('approval_level', sql.Int, approval_level)
      .input('is_active', sql.Bit, is_active)
      .query(`
        UPDATE TicketApproval 
        SET personno = @personno, plant_code = @plant_code, area_code = @area_code, 
            line_code = @line_code, machine_code = @machine_code, approval_level = @approval_level, 
            is_active = @is_active, updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({
      success: true,
      message: 'Ticket approval updated successfully'
    });

  } catch (error) {
    console.error('Update ticket approval error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Delete ticket approval
const deleteTicketApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM TicketApproval WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket approval not found'
      });
    }

    res.json({
      success: true,
      message: 'Ticket approval deleted successfully'
    });

  } catch (error) {
    console.error('Delete ticket approval error:', error);
    
    // Check for foreign key constraint error
    if (error.message && error.message.includes('FOREIGN KEY constraint')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete ticket approval because it has associated records. Please check for any related data first.'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Delete all ticket approvals for a person and level
const deleteTicketApprovalsByPersonAndLevel = async (req, res) => {
  try {
    const { personno, approval_level } = req.params;
    const pool = await getConnection();

    const result = await pool.request()
      .input('personno', sql.Int, personno)
      .input('approval_level', sql.Int, approval_level)
      .query('DELETE FROM TicketApproval WHERE personno = @personno AND approval_level = @approval_level');

    res.json({
      success: true,
      message: `Successfully deleted ${result.rowsAffected[0]} ticket approval(s)`,
      count: result.rowsAffected[0]
    });

  } catch (error) {
    console.error('Delete ticket approvals by person and level error:', error);
    
    // Check for foreign key constraint error
    if (error.message && error.message.includes('FOREIGN KEY constraint')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete ticket approvals because they have associated records. Please check for any related data first.'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// ==================== HIERARCHY VIEW ====================

// Get complete hierarchy view data
const getHierarchyView = async (req, res) => {
  try {
    const pool = await getConnection();

    // Get all hierarchy data organized by levels
    const result = await pool.request().query(`
      SELECT 
        id, puno, pucode, plant, area, line, machine, number,
        digit_count, created_at, updated_at, puname, pudescription,
        CASE
          WHEN digit_count = 1 THEN 'Plant'
          WHEN digit_count = 2 THEN 'Area'
          WHEN digit_count = 3 THEN 'Line'
          WHEN digit_count = 4 THEN 'Machine'
          ELSE 'Unknown'
        END as hierarchy_level,
        CASE
          WHEN digit_count = 1 THEN puname
          WHEN digit_count = 2 THEN plant + ' - ' + puname
          WHEN digit_count = 3 THEN plant + ' - ' + area + ' - ' + puname
          WHEN digit_count = 4 THEN plant + ' - ' + area + ' - ' + line + ' - ' + puname
          ELSE puname
        END as full_path
      FROM PUExtension
      ORDER BY plant, area, line, machine, digit_count, puname
    `);

    // Organize data by hierarchy levels
    const hierarchy = {
      plants: {},
      areas: {},
      lines: {},
      machines: {}
    };

    result.recordset.forEach(item => {
      const { plant, area, line, machine, digit_count } = item;
      
      if (digit_count === 1) {
        // Plant level
        if (!hierarchy.plants[plant]) {
          hierarchy.plants[plant] = {
            code: plant,
            name: item.puname,
            description: item.pudescription,
            puno: item.puno,
            pucode: item.pucode,
            areas: {}
          };
        }
      } else if (digit_count === 2) {
        // Area level
        if (!hierarchy.plants[plant]) {
          hierarchy.plants[plant] = { areas: {} };
        }
        if (!hierarchy.plants[plant].areas[area]) {
          hierarchy.plants[plant].areas[area] = {
            code: area,
            name: item.puname,
            description: item.pudescription,
            puno: item.puno,
            pucode: item.pucode,
            lines: {}
          };
        }
      } else if (digit_count === 3) {
        // Line level
        if (!hierarchy.plants[plant]) {
          hierarchy.plants[plant] = { areas: {} };
        }
        if (!hierarchy.plants[plant].areas[area]) {
          hierarchy.plants[plant].areas[area] = { lines: {} };
        }
        if (!hierarchy.plants[plant].areas[area].lines[line]) {
          hierarchy.plants[plant].areas[area].lines[line] = {
            code: line,
            name: item.puname,
            description: item.pudescription,
            puno: item.puno,
            pucode: item.pucode,
            machines: {}
          };
        }
      } else if (digit_count === 4) {
        // Machine level
        if (!hierarchy.plants[plant]) {
          hierarchy.plants[plant] = { areas: {} };
        }
        if (!hierarchy.plants[plant].areas[area]) {
          hierarchy.plants[plant].areas[area] = { lines: {} };
        }
        if (!hierarchy.plants[plant].areas[area].lines[line]) {
          hierarchy.plants[plant].areas[area].lines[line] = { machines: {} };
        }
        if (!hierarchy.plants[plant].areas[area].lines[line].machines[machine]) {
          hierarchy.plants[plant].areas[area].lines[line].machines[machine] = {
            code: machine,
            name: item.puname,
            description: item.pudescription,
            machine_number: item.number,
            puno: item.puno,
            pucode: item.pucode
          };
        }
      }
    });

    res.json({
      success: true,
      data: {
        flat: result.recordset,
        hierarchy: hierarchy,
        summary: {
          totalItems: result.recordset.length,
          plants: Object.keys(hierarchy.plants).length,
          totalAreas: Object.values(hierarchy.plants).reduce((sum, plant) => sum + Object.keys(plant.areas).length, 0),
          totalLines: Object.values(hierarchy.plants).reduce((sum, plant) => 
            sum + Object.values(plant.areas).reduce((sumArea, area) => sumArea + Object.keys(area.lines).length, 0), 0),
          totalMachines: Object.values(hierarchy.plants).reduce((sum, plant) => 
            sum + Object.values(plant.areas).reduce((sumArea, area) => 
              sumArea + Object.values(area.lines).reduce((sumLine, line) => sumLine + Object.keys(line.machines).length, 0), 0), 0)
        }
      },
      count: result.recordset.length
    });

  } catch (error) {
    console.error('Get hierarchy view error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// ==================== LOOKUP DATA ====================

// Get lookup data for dropdowns
const getLookupData = async (req, res) => {
  try {
    const pool = await getConnection();

    // Query hierarchy from PUExtension table
    const [plantsResult, areasResult, linesResult] = await Promise.all([
      // Get distinct plants (digit_count = 1)
      pool.request().query(`
        SELECT DISTINCT 
          puno as id,
          puname as name,
          plant as code
        FROM PUExtension 
        WHERE digit_count = 1 AND plant IS NOT NULL
        ORDER BY plant
      `),
      // Get distinct areas (digit_count >= 2) - ensure uniqueness by plant+area combination
      pool.request().query(`
        WITH UniqueAreas AS (
          SELECT DISTINCT plant, area, COUNT(*) as puno_count
          FROM PUExtension 
          WHERE digit_count >= 2 AND area IS NOT NULL
          GROUP BY plant, area
        )
        SELECT 
          ROW_NUMBER() OVER (ORDER BY u.plant, u.area) as id,
          u.area as name,
          u.area as code,
          u.plant as plant_code,
          (SELECT TOP 1 puno FROM PUExtension p WHERE p.plant = u.plant AND p.digit_count = 1) as plant_id,
          u.plant as plant_name
        FROM UniqueAreas u
        ORDER BY u.plant, u.area
      `),
      // Get distinct lines (digit_count >= 3) - ensure uniqueness by plant+area+line combination  
      pool.request().query(`
        WITH UniqueAreas AS (
          SELECT DISTINCT plant, area, ROW_NUMBER() OVER (ORDER BY plant, area) as area_id
          FROM PUExtension 
          WHERE digit_count >= 2 AND area IS NOT NULL
          GROUP BY plant, area
        ),
        UniqueLines AS (
          SELECT DISTINCT plant, area, line, COUNT(*) as puno_count
          FROM PUExtension 
          WHERE digit_count >= 3 AND line IS NOT NULL
          GROUP BY plant, area, line
        )
        SELECT 
          ROW_NUMBER() OVER (ORDER BY ul.plant, ul.area, ul.line) as id,
          ul.line as name,
          ul.line as code,
          ul.plant as plant_code,
          ul.area as area_code,
          (SELECT TOP 1 puno FROM PUExtension p WHERE p.plant = ul.plant AND p.digit_count = 1) as plant_id,
          ua.area_id as area_id,
          ul.plant as plant_name,
          ul.area as area_name
        FROM UniqueLines ul
        JOIN UniqueAreas ua ON ul.plant = ua.plant AND ul.area = ua.area
        ORDER BY ul.plant, ul.area, ul.line
      `)
    ]);

    res.json({
      success: true,
      data: {
        plants: plantsResult.recordset,
        areas: areasResult.recordset,
        lines: linesResult.recordset
      }
    });

  } catch (error) {
    console.error('Get lookup data error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Search persons
const searchPersons = async (req, res) => {
  try {
    const { search, limit = 20 } = req.query;
    const pool = await getConnection();
    
    let whereClause = '';
    const request = pool.request();
    
    if (search) {
      whereClause = `WHERE (PERSONNO LIKE @search OR PERSON_NAME LIKE @search OR FIRSTNAME LIKE @search OR LASTNAME LIKE @search OR PERSONCODE LIKE @search)`;
      request.input('search', sql.NVarChar, `%${search}%`);
    }
    
    const result = await request.query(`
      SELECT TOP ${limit} PERSONNO, PERSON_NAME, FIRSTNAME, LASTNAME, PERSONCODE, EMAIL, PHONE
      FROM Person
      ${whereClause}
      ORDER BY PERSON_NAME
    `);

    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });

  } catch (error) {
    console.error('Search persons error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

module.exports = {
  // Ticket approval operations
  getTicketApprovals,
  getTicketApprovalById,
  getTicketApprovalsByPersonAndLevel,
  createTicketApproval,
  createMultipleTicketApprovals,
  updateTicketApproval,
  deleteTicketApproval,
  deleteTicketApprovalsByPersonAndLevel,
  
  // Hierarchy view
  getHierarchyView,
  
  // Lookup data
  getLookupData,
  // Person search
  searchPersons
};