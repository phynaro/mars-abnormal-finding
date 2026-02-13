/**
 * Due Date Notification Scheduled Job
 * Sends LINE carousel notifications to assigned users about tickets due within 3 days or overdue.
 * Notifies 3 days before due date and every day after that. Max 10 tickets per user, ordered by most late.
 */

const cron = require('node-cron');
const sql = require('mssql');
const dbConfig = require('../config/dbConfig');
const dueDateNotificationService = require('../services/dueDateNotificationService');

const NOTIFICATION_TYPE = 'due_date_reminder';

class DueDateNotificationJob {
  constructor() {
    this.currentTask = null;
    this.isRunning = false;
  }

  /**
   * Initialize the scheduled job
   */
  async initialize() {
    try {
      console.log('⏰ Initializing due-date notification job...');

      await this.reloadSchedule();

      console.log('✅ Due-date notification job initialized');
    } catch (error) {
      console.error('❌ Failed to initialize due-date notification job:', error);
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
        WHERE notification_type = '${NOTIFICATION_TYPE}'
      `);

      if (result.recordset.length === 0) {
        console.log(`⚠️  No due-date notification schedule found (notification_type = '${NOTIFICATION_TYPE}')`);
        return;
      }

      const schedule = result.recordset[0];

      if (!schedule.is_enabled) {
        console.log('⚠️  Due-date notifications are disabled in database');
        return;
      }

      const cronExpression = schedule.schedule_cron;

      console.log(
        `📅 Due-date schedule: ${cronExpression} (${schedule.timezone || 'server timezone'})`
      );

      if (!cron.validate(cronExpression)) {
        console.error(`❌ Invalid cron expression: ${cronExpression}`);
        return;
      }

      const cronParts = cronExpression.trim().split(/\s+/);
      let cronMinute = cronParts[0] || '0';
      let cronHour = cronParts[1] || '9';

      if (cronMinute === '*' || isNaN(parseInt(cronMinute, 10))) {
        cronMinute = '0';
      }
      if (cronHour === '*' || isNaN(parseInt(cronHour, 10))) {
        cronHour = '9';
      }

      this.currentTask = cron.schedule(
        cronExpression,
        async () => {
          if (this.isRunning) {
            console.log('⚠️  Previous due-date notification job still running, skipping this run');
            return;
          }

          this.isRunning = true;
          console.log('⏰ Running scheduled due-date notification job...');

          try {
            const poolRun = await sql.connect(dbConfig);

            await poolRun.request().query(`
              UPDATE IgxNotificationSchedule
              SET last_run = GETDATE()
              WHERE notification_type = '${NOTIFICATION_TYPE}'
            `);

            const resultRun = await dueDateNotificationService.sendToAllUsers();

            console.log('✅ Scheduled due-date notification job completed:', resultRun);

            const hour = parseInt(cronHour, 10);
            const minute = parseInt(cronMinute, 10);
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;

            await poolRun
              .request()
              .input('timeStr', sql.VarChar(8), timeStr)
              .query(`
                UPDATE IgxNotificationSchedule
                SET next_run = DATEADD(day, 1, CAST(CAST(GETDATE() AS DATE) AS DATETIME) + CAST(@timeStr AS TIME))
                WHERE notification_type = '${NOTIFICATION_TYPE}'
              `);
          } catch (error) {
            console.error('❌ Error in scheduled due-date notification job:', error);
          } finally {
            this.isRunning = false;
          }
        },
        {
          scheduled: true,
          timezone: schedule.timezone || undefined
        }
      );

      console.log('✅ Due-date scheduled job started successfully');
    } catch (error) {
      console.error('❌ Error reloading due-date schedule:', error);
    }
  }

  /**
   * Stop the scheduled job
   */
  stop() {
    if (this.currentTask) {
      this.currentTask.stop();
      this.currentTask = null;
      console.log('⏹️  Due-date notification job stopped');
    }
  }
}

const job = new DueDateNotificationJob();

module.exports = job;
