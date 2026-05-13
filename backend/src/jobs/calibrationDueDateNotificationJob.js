/**
 * Calibration Due Date Notification Scheduled Job
 * Reads schedule from IgxNotificationSchedule (notification_type = 'calibration_due_date')
 * and enqueues a BullMQ job for the worker to process.
 * Disable via env: ENABLE_CALIBRATION_DUE_DATE_NOTIFICATIONS=false
 */

const cron = require('node-cron');
const sql = require('mssql');
const dbConfig = require('../config/dbConfig');
const notificationQueue = require('../queues/notificationQueue');

const NOTIFICATION_TYPE = 'calibration_due_date';

class CalibrationDueDateNotificationJob {
  constructor() {
    this.currentTask = null;
    this.isRunning = false;
  }

  async initialize() {
    try {
      console.log('⏰ Initializing calibration due-date notification job...');
      await this.reloadSchedule();
      console.log('✅ Calibration due-date notification job initialized');
    } catch (error) {
      console.error('❌ Failed to initialize calibration due-date notification job:', error);
    }
  }

  async reloadSchedule() {
    try {
      if (this.currentTask) {
        this.currentTask.stop();
        this.currentTask = null;
      }

      const pool = await sql.connect(dbConfig);
      let result;
      try {
        result = await pool.request()
          .input('notifType', sql.NVarChar(50), NOTIFICATION_TYPE)
          .query(`
            SELECT TOP 1 schedule_cron, timezone, is_enabled
            FROM IgxNotificationSchedule
            WHERE notification_type = @notifType
          `);
      } finally {
        await pool.close();
      }

      if (result.recordset.length === 0) {
        console.log(`⚠️  No calibration due-date schedule found (notification_type = '${NOTIFICATION_TYPE}')`);
        return;
      }

      const schedule = result.recordset[0];

      if (!schedule.is_enabled) {
        console.log('⚠️  Calibration due-date notifications are disabled in database');
        return;
      }

      const cronExpression = schedule.schedule_cron;

      if (!cron.validate(cronExpression)) {
        console.error(`❌ Invalid cron expression for calibration job: ${cronExpression}`);
        return;
      }

      console.log(`📅 Calibration due-date schedule: ${cronExpression} (${schedule.timezone || 'server timezone'})`);

      this.currentTask = cron.schedule(
        cronExpression,
        async () => {
          if (this.isRunning) {
            console.log('⚠️  Previous calibration tick still in progress, skipping');
            return;
          }
          this.isRunning = true;
          console.log('⏰ Enqueueing calibration due-date notification job...');
          try {
            await notificationQueue.addScheduleCalibrationDueDateJob({ notification_type: NOTIFICATION_TYPE });
          } catch (error) {
            console.error('❌ Error enqueueing calibration job:', error);
          } finally {
            this.isRunning = false;
          }
        },
        {
          scheduled: true,
          timezone: schedule.timezone || undefined,
        }
      );

      console.log('✅ Calibration due-date scheduled job started');
    } catch (error) {
      console.error('❌ Error reloading calibration due-date schedule:', error);
    }
  }

  stop() {
    if (this.currentTask) {
      this.currentTask.stop();
      this.currentTask = null;
      console.log('⏹️  Calibration due-date notification job stopped');
    }
  }
}

const job = new CalibrationDueDateNotificationJob();

module.exports = job;
