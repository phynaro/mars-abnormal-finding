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

// Check if LINE ID has a pending access request
const checkRequestStatus = async (req, res) => {
  try {
    const { lineId } = req.params;

    if (!lineId) {
      return res.status(400).json({
        success: false,
        message: 'LINE ID is required'
      });
    }

    const pool = await getConnection();

    const result = await pool.request()
      .input('lineId', sql.NVarChar, lineId)
      .query(`
        SELECT 
          RequestID,
          FirstName,
          LastName,
          Email,
          Telephone,
          LineID,
          Status,
          CreatedAt,
          UpdatedAt
        FROM IgxRequestAccess 
        WHERE LineID = @lineId AND Status = 'pending'
        ORDER BY CreatedAt DESC
      `);

    if (result.recordset.length > 0) {
      const request = result.recordset[0];
      res.json({
        success: true,
        hasPendingRequest: true,
        request: {
          requestId: request.RequestID,
          firstName: request.FirstName,
          lastName: request.LastName,
          email: request.Email,
          telephone: request.Telephone,
          lineId: request.LineID,
          status: request.Status,
          createdAt: request.CreatedAt,
          updatedAt: request.UpdatedAt
        }
      });
    } else {
      res.json({
        success: true,
        hasPendingRequest: false,
        message: 'No pending request found for this LINE ID'
      });
    }

  } catch (error) {
    console.error('Check request status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check request status',
      error: error.message
    });
  }
};

// Submit new access request
const submitAccessRequest = async (req, res) => {
  try {
    const { firstName, lastName, email, telephone, lineId } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !lineId) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and LINE ID are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    const pool = await getConnection();

    // Check for existing pending request with same LINE ID
    const existingRequest = await pool.request()
      .input('lineId', sql.NVarChar, lineId)
      .query(`
        SELECT RequestID, Status 
        FROM IgxRequestAccess 
        WHERE LineID = @lineId AND Status = 'pending'
      `);

    if (existingRequest.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A pending access request already exists for this LINE ID'
      });
    }

    // Insert new access request
    const result = await pool.request()
      .input('firstName', sql.NVarChar, firstName.trim())
      .input('lastName', sql.NVarChar, lastName.trim())
      .input('email', sql.NVarChar, email.trim().toLowerCase())
      .input('telephone', sql.NVarChar, telephone ? telephone.trim() : null)
      .input('lineId', sql.NVarChar, lineId)
      .query(`
        INSERT INTO IgxRequestAccess (FirstName, LastName, Email, Telephone, LineID, Status, CreatedAt, UpdatedAt)
        OUTPUT INSERTED.RequestID, INSERTED.CreatedAt
        VALUES (@firstName, @lastName, @email, @telephone, @lineId, 'pending', GETDATE(), GETDATE())
      `);

    const newRequest = result.recordset[0];

    console.log(`New access request submitted: RequestID=${newRequest.RequestID}, LINE ID=${lineId}, Email=${email}`);

    res.json({
      success: true,
      message: 'Access request submitted successfully',
      requestId: newRequest.RequestID,
      createdAt: newRequest.CreatedAt
    });

  } catch (error) {
    console.error('Submit access request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit access request',
      error: error.message
    });
  }
};

// Get all access requests (for admin use - will be implemented later)
const getAllAccessRequests = async (req, res) => {
  try {
    const pool = await getConnection();

    const result = await pool.request()
      .query(`
        SELECT 
          ra.RequestID,
          ra.FirstName,
          ra.LastName,
          ra.Email,
          ra.Telephone,
          ra.LineID,
          ra.Status,
          ra.CreatedAt,
          ra.UpdatedAt,
          ra.ApprovedBy,
          ra.ApprovedAt,
          ra.LinkPersonNo,
          p.PERSON_NAME as ApprovedByName
        FROM IgxRequestAccess ra
        LEFT JOIN Person p ON ra.ApprovedBy = p.PERSONNO
        ORDER BY ra.CreatedAt DESC
      `);

    const requests = result.recordset.map(request => ({
      requestId: request.RequestID,
      firstName: request.FirstName,
      lastName: request.LastName,
      email: request.Email,
      telephone: request.Telephone,
      lineId: request.LineID,
      status: request.Status,
      createdAt: request.CreatedAt,
      updatedAt: request.UpdatedAt,
      approvedBy: request.ApprovedBy,
      approvedAt: request.ApprovedAt,
      linkPersonNo: request.LinkPersonNo,
      approvedByName: request.ApprovedByName
    }));

    res.json({
      success: true,
      requests: requests
    });

  } catch (error) {
    console.error('Get all access requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get access requests',
      error: error.message
    });
  }
};

module.exports = {
  checkRequestStatus,
  submitAccessRequest,
  getAllAccessRequests
};
