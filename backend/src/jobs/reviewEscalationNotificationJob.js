const cron = require('node-cron');
const sql = require('mssql');
const dbConfig = require('../config/dbConfig');
const notificationQueue = require('../queues/notificationQueue');

const NOTIFICATION_TYPE = 'review_escalation';

class ReviewEscalationNotificationJob {
  constructor() {
    this.currentTask = null;
    this.isRunning = false;
  }

  async initialize() {
    try {
      console.log('⏰ Initializing review escalation notification job...');
      await this.reloadSchedule();
      console.log('✅ Review escalation notification job initialized');
    } catch (error) {
      console.error('❌ Failed to initialize review escalation notification job:', error);
    }
  }

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
        console.log(`⚠️  No review escalation notification schedule found (notification_type = '${NOTIFICATION_TYPE}')`);
        return;
      }

      const schedule = result.recordset[0];
      if (!schedule.is_enabled) {
        console.log('⚠️  Review escalation notifications are disabled in database');
        return;
      }

      const cronExpression = schedule.schedule_cron;
      console.log(`📅 Review escalation schedule: ${cronExpression} (${schedule.timezone || 'server timezone'})`);

      if (!cron.validate(cronExpression)) {
        console.error(`❌ Invalid cron expression: ${cronExpression}`);
        return;
      }

      this.currentTask = cron.schedule(
        cronExpression,
        async () => {
          if (this.isRunning) {
            console.log('⚠️  Previous review escalation schedule tick still in progress, skipping enqueue');
            return;
          }

          this.isRunning = true;
          console.log('⏰ Enqueueing scheduled review escalation notification job...');

          try {
            await notificationQueue.addScheduleReviewEscalationJob({ notification_type: NOTIFICATION_TYPE });
          } catch (error) {
            console.error('❌ Error enqueueing review escalation schedule job:', error);
          } finally {
            this.isRunning = false;
          }
        },
        {
          scheduled: true,
          timezone: schedule.timezone || undefined,
        }
      );

      console.log('✅ Review escalation scheduled job started successfully');
    } catch (error) {
      console.error('❌ Error reloading review escalation schedule:', error);
    }
  }

  stop() {
    if (this.currentTask) {
      this.currentTask.stop();
      this.currentTask = null;
      console.log('⏹️  Review escalation notification job stopped');
    }
  }
}

module.exports = new ReviewEscalationNotificationJob();
