/**
 * Old Open Ticket Notification Scheduled Job
 * Sends LINE notifications to L2 and L3 approvers for tickets with status='open' that were created more than 24 hours ago
 * Scheduled to run daily at 9 AM
 */

const cron = require('node-cron');
const sql = require('mssql');
const dbConfig = require('../config/dbConfig');
const oldOpenTicketNotificationService = require('../services/oldOpenTicketNotificationService');

class OldOpenTicketNotificationJob {
  constructor() {
    this.currentTask = null;
    this.isRunning = false;
  }

  /**
   * Initialize the scheduled job
   */
  async initialize() {
    try {
      console.log('⏰ Initializing old open ticket notification job...');
      
      await this.reloadSchedule();
      
      console.log('✅ Old open ticket notification job initialized');
    } catch (error) {
      console.error('❌ Failed to initialize old open ticket notification job:', error);
    }
  }

  /**
   * Reload schedule from database
   */
  async reloadSchedule() {
    try {
      // Stop existing task if running
      if (this.currentTask) {
        this.currentTask.stop();
        this.currentTask = null;
      }

      // Get schedule from database
      const pool = await sql.connect(dbConfig);
      const result = await pool.request().query(`
        SELECT TOP 1 
          schedule_cron, 
          timezone, 
          is_enabled
        FROM IgxNotificationSchedule
        WHERE notification_type = 'old_open_tickets'
      `);

      if (result.recordset.length === 0) {
        console.log('⚠️  No old open tickets notification schedule found in database');
        return;
      }

      const schedule = result.recordset[0];

      if (!schedule.is_enabled) {
        console.log('⚠️  Old open ticket notifications are disabled in database');
        return;
      }

      const cronExpression = schedule.schedule_cron;
      
      console.log(`📅 Schedule configured: ${cronExpression} (${schedule.timezone || 'server timezone'})`);

      // Validate cron expression
      if (!cron.validate(cronExpression)) {
        console.error(`❌ Invalid cron expression: ${cronExpression}`);
        return;
      }

      // Create new scheduled task
      this.currentTask = cron.schedule(cronExpression, async () => {
        if (this.isRunning) {
          console.log('⚠️  Previous old open ticket notification job still running, skipping this run');
          return;
        }

        this.isRunning = true;
        console.log('⏰ Running scheduled old open ticket notification job...');

        try {
          // Update last_run
          await pool.request().query(`
            UPDATE IgxNotificationSchedule
            SET last_run = GETDATE()
            WHERE notification_type = 'old_open_tickets'
          `);

          // Run the notification service
          const result = await oldOpenTicketNotificationService.sendNotifications();
          
          console.log('✅ Scheduled old open ticket notification job completed:', result);

          // Update next_run (calculate next occurrence)
          // This is approximate - cron handles the actual scheduling
          const nextRunDate = new Date();
          nextRunDate.setDate(nextRunDate.getDate() + 1); // Next day
          nextRunDate.setHours(9, 0, 0, 0); // 9 AM
          
          await pool.request()
            .input('nextRunDate', sql.DateTime, nextRunDate)
            .query(`
              UPDATE IgxNotificationSchedule
              SET next_run = @nextRunDate
              WHERE notification_type = 'old_open_tickets'
            `);

        } catch (error) {
          console.error('❌ Error in scheduled old open ticket notification job:', error);
        } finally {
          this.isRunning = false;
        }
      }, {
        scheduled: true,
        timezone: schedule.timezone || undefined // Use server timezone if not specified
      });

      console.log('✅ Scheduled job started successfully');

    } catch (error) {
      console.error('❌ Error reloading schedule:', error);
    }
  }

  /**
   * Stop the scheduled job
   */
  stop() {
    if (this.currentTask) {
      this.currentTask.stop();
      this.currentTask = null;
      console.log('⏹️  Old open ticket notification job stopped');
    }
  }
}

// Create singleton instance
const job = new OldOpenTicketNotificationJob();

module.exports = job;

