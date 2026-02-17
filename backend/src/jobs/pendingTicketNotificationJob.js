/**
 * Pending Ticket Notification Scheduled Job
 * Sends LINE carousel notifications to users about their pending tickets on a schedule
 */

const cron = require('node-cron');
const sql = require('mssql');
const dbConfig = require('../config/dbConfig');
const notificationQueue = require('../queues/notificationQueue');

class PendingTicketNotificationJob {
  constructor() {
    this.currentTask = null;
    this.isRunning = false;
  }

  /**
   * Initialize the scheduled job
   */
  async initialize() {
    try {
      console.log('⏰ Initializing pending ticket notification job...');
      
      await this.reloadSchedule();
      
      console.log('✅ Pending ticket notification job initialized');
    } catch (error) {
      console.error('❌ Failed to initialize pending ticket notification job:', error);
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
        WHERE notification_type = 'pending_tickets'
      `);

      if (result.recordset.length === 0) {
        console.log('⚠️  No pending tickets notification schedule found in database');
        return;
      }

      const schedule = result.recordset[0];

      if (!schedule.is_enabled) {
        console.log('⚠️  Pending ticket notifications are disabled in database');
        return;
      }

      const cronExpression = schedule.schedule_cron;
      
      console.log(`📅 Schedule configured: ${cronExpression} (${schedule.timezone || 'server timezone'})`);

      // Validate cron expression
      if (!cron.validate(cronExpression)) {
        console.error(`❌ Invalid cron expression: ${cronExpression}`);
        return;
      }

      // Parse cron expression to extract hour and minute
      // Format: minute hour day month dayOfWeek (e.g., '0 9 * * *')
      const cronParts = cronExpression.trim().split(/\s+/);
      let cronMinute = cronParts[0] || '0';
      let cronHour = cronParts[1] || '9';
      
      // Handle special cron values - use default if not a number
      if (cronMinute === '*' || isNaN(parseInt(cronMinute, 10))) {
        cronMinute = '0';
      }
      if (cronHour === '*' || isNaN(parseInt(cronHour, 10))) {
        cronHour = '9';
      }

      // Create new scheduled task: on tick, enqueue one job; worker runs the notification and updates last_run/next_run
      this.currentTask = cron.schedule(cronExpression, async () => {
        if (this.isRunning) {
          console.log('⚠️  Previous schedule tick still in progress, skipping enqueue');
          return;
        }

        this.isRunning = true;
        console.log('⏰ Enqueueing scheduled pending ticket notification job...');

        try {
          await notificationQueue.addSchedulePendingTicketsJob({ notification_type: 'pending_tickets' });
        } catch (error) {
          console.error('❌ Error enqueueing schedule job:', error);
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
      console.log('⏹️  Pending ticket notification job stopped');
    }
  }
}

// Create singleton instance
const job = new PendingTicketNotificationJob();

module.exports = job;

