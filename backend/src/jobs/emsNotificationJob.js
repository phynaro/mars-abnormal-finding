/**
 * EMS calibration notification scheduled job.
 * Reads IgxNotificationSchedule (notification_type = 'ems_calibration')
 * and enqueues BullMQ job for the worker.
 * Disable via env: ENABLE_EMS_CALIBRATION_NOTIFICATIONS=false
 */

const cron = require('node-cron');
const sql = require('mssql');
const dbConfig = require('../config/dbConfig');
const notificationQueue = require('../queues/notificationQueue');

const NOTIFICATION_TYPE = 'ems_calibration';

class EmsNotificationJob {
  constructor() {
    this.currentTask = null;
    this.isRunning = false;
  }

  async initialize() {
    try {
      console.log('⏰ Initializing EMS calibration notification job...');
      await this.reloadSchedule();
      console.log('✅ EMS calibration notification job initialized');
    } catch (error) {
      console.error('❌ Failed to initialize EMS calibration notification job:', error);
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
        console.log(`⚠️  No EMS calibration schedule found (notification_type = '${NOTIFICATION_TYPE}')`);
        return;
      }

      const schedule = result.recordset[0];

      if (!schedule.is_enabled) {
        console.log('⚠️  EMS calibration notifications are disabled in database');
        return;
      }

      const cronExpression = schedule.schedule_cron;

      if (!cron.validate(cronExpression)) {
        console.error(`❌ Invalid cron expression for EMS job: ${cronExpression}`);
        return;
      }

      console.log(`📅 EMS calibration schedule: ${cronExpression} (${schedule.timezone || 'server timezone'})`);

      this.currentTask = cron.schedule(
        cronExpression,
        async () => {
          if (this.isRunning) {
            console.log('⚠️  Previous EMS calibration tick still in progress, skipping');
            return;
          }
          this.isRunning = true;
          console.log('⏰ Enqueueing EMS calibration notification job...');
          try {
            await notificationQueue.addScheduleEmsCalibrationJob({ notification_type: NOTIFICATION_TYPE });
          } catch (error) {
            console.error('❌ Error enqueueing EMS calibration job:', error);
          } finally {
            this.isRunning = false;
          }
        },
        {
          scheduled: true,
          timezone: schedule.timezone || undefined,
        }
      );

      console.log('✅ EMS calibration scheduled job started');
    } catch (error) {
      console.error('❌ Error reloading EMS calibration schedule:', error);
    }
  }

  stop() {
    if (this.currentTask) {
      this.currentTask.stop();
      this.currentTask = null;
      console.log('⏹️  EMS calibration notification job stopped');
    }
  }
}

module.exports = new EmsNotificationJob();
