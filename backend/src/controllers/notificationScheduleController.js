const sql = require('mssql');
const dbConfig = require('../config/dbConfig');
const pendingNotificationService = require('../services/pendingTicketNotificationService');

/**
 * Get all notification schedules
 */
const getNotificationSchedules = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT * FROM IgxNotificationSchedule
      ORDER BY notification_type, created_at DESC
    `);

    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('Error getting notification schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification schedules',
      error: error.message
    });
  }
};

/**
 * Get notification schedule by type
 */
const getNotificationScheduleByType = async (req, res) => {
  try {
    const { type } = req.params;
    const pool = await sql.connect(dbConfig);
    
    const result = await pool.request()
      .input('type', sql.NVarChar(50), type)
      .query(`
        SELECT * FROM IgxNotificationSchedule
        WHERE notification_type = @type
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification schedule not found'
      });
    }

    res.json({
      success: true,
      data: result.recordset[0]
    });
  } catch (error) {
    console.error('Error getting notification schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification schedule',
      error: error.message
    });
  }
};

/**
 * Update notification schedule
 */
const updateNotificationSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { schedule_cron, timezone, is_enabled, description } = req.body;
    const updated_by = req.user?.id || null;
    
    const pool = await sql.connect(dbConfig);
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('schedule_cron', sql.NVarChar(100), schedule_cron)
      .input('timezone', sql.NVarChar(50), timezone)
      .input('is_enabled', sql.Bit, is_enabled)
      .input('description', sql.NVarChar(500), description)
      .input('updated_by', sql.Int, updated_by)
      .query(`
        UPDATE IgxNotificationSchedule
        SET schedule_cron = @schedule_cron,
            timezone = @timezone,
            is_enabled = @is_enabled,
            description = @description,
            updated_at = GETDATE(),
            updated_by = @updated_by
        WHERE id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification schedule not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification schedule updated successfully',
      data: { id }
    });
  } catch (error) {
    console.error('Error updating notification schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification schedule',
      error: error.message
    });
  }
};

/**
 * Test notification by triggering it manually
 */
const testNotification = async (req, res) => {
  try {
    const result = await pendingNotificationService.sendToAllUsers();
    
    res.json({
      success: true,
      message: 'Test notification triggered successfully',
      data: result
    });
  } catch (error) {
    console.error('Error testing notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger test notification',
      error: error.message
    });
  }
};

module.exports = {
  getNotificationSchedules,
  getNotificationScheduleByType,
  updateNotificationSchedule,
  testNotification
};
