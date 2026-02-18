/**
 * Finished Ticket Review Notification Scheduled Job
 * Sends LINE carousel notifications to requesters to review their tickets with status = 'finished'
 */

const cron = require('node-cron');
const sql = require('mssql');
const dbConfig = require('../config/dbConfig');
const notificationQueue = require('../queues/notificationQueue');

class FinishedTicketReviewNotificationJob {
  constructor() {
    this.currentTask = null;
    this.isRunning = false;
  }

  /**
   * Initialize the scheduled job
   */
  async initialize() {
    try {
      console.log('⏰ Initializing finished ticket review notification job...');

      await this.reloadSchedule();

      console.log('✅ Finished ticket review notification job initialized');
    } catch (error) {
      console.error('❌ Failed to initialize finished ticket review notification job:', error);
    }
  }

  /**
   * Reload schedule from database
   */
  async reloadSchedule() {
    try {
      if (this.currentTask) {
        this.currentTask.stop();
        this.currentTask = null;
      }

      const pool = await sql.connect(dbConfig);
      const result = await pool.request().query(`
        SELECT TOP 1
          schedule_cron,
          timezone,
          is_enabled
        FROM IgxNotificationSchedule
        WHERE notification_type = 'finished_ticket_review'
      `);

      if (result.recordset.length === 0) {
        console.log('⚠️  No finished ticket review notification schedule found in database');
        return;
      }

      const schedule = result.recordset[0];

      if (!schedule.is_enabled) {
        console.log('⚠️  Finished ticket review notifications are disabled in database');
        return;
      }

      const cronExpression = schedule.schedule_cron;

      console.log(`📅 Finished ticket review schedule: ${cronExpression} (${schedule.timezone || 'server timezone'})`);

      if (!cron.validate(cronExpression)) {
        console.error(`❌ Invalid cron expression: ${cronExpression}`);
        return;
      }

      const cronParts = cronExpression.trim().split(/\s+/);
      let cronMinute = cronParts[0] || '0';
      let cronHour = cronParts[1] || '10';
      if (cronMinute === '*' || isNaN(parseInt(cronMinute, 10))) {
        cronMinute = '0';
      }
      if (cronHour === '*' || isNaN(parseInt(cronHour, 10))) {
        cronHour = '10';
      }

      this.currentTask = cron.schedule(
        cronExpression,
        async () => {
          if (this.isRunning) {
            console.log('⚠️  Previous finished ticket review schedule tick still in progress, skipping enqueue');
            return;
          }

          this.isRunning = true;
          console.log('⏰ Enqueueing scheduled finished ticket review notification job...');

          try {
            await notificationQueue.addScheduleFinishedTicketReviewJob({ notification_type: 'finished_ticket_review' });
          } catch (error) {
            console.error('❌ Error enqueueing finished ticket review schedule job:', error);
          } finally {
            this.isRunning = false;
          }
        },
        {
          scheduled: true,
          timezone: schedule.timezone || undefined
        }
      );

      console.log('✅ Finished ticket review scheduled job started successfully');
    } catch (error) {
      console.error('❌ Error reloading finished ticket review schedule:', error);
    }
  }

  /**
   * Stop the scheduled job
   */
  stop() {
    if (this.currentTask) {
      this.currentTask.stop();
      this.currentTask = null;
      console.log('⏹️  Finished ticket review notification job stopped');
    }
  }
}

const job = new FinishedTicketReviewNotificationJob();

module.exports = job;
