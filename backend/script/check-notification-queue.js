/**
 * Check notification queue status (BullMQ).
 * Run from backend: node script/check-notification-queue.js
 * Uses same Redis as notificationQueue (REDIS_URL or redis://localhost:6379).
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Queue } = require('bullmq');

const QUEUE_NAME = 'notifications';
const connection = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : { host: 'localhost', port: 6379 };

async function main() {
  const queue = new Queue(QUEUE_NAME, { connection });

  try {
    const counts = await queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused'
    );
    console.log('Notification queue:', QUEUE_NAME);
    console.log('Redis:', process.env.REDIS_URL || 'localhost:6379');
    console.log('');
    console.log('Job counts:');
    console.log('  waiting:', counts.waiting ?? 0);
    console.log('  active:', counts.active ?? 0);
    console.log('  delayed:', counts.delayed ?? 0);
    console.log('  paused:', counts.paused ?? 0);
    console.log('  completed:', counts.completed ?? 0);
    console.log('  failed:', counts.failed ?? 0);
    console.log('');

    if ((counts.failed ?? 0) > 0) {
      const failed = await queue.getJobs(['failed'], 0, 20, false);
      console.log('Recent failed jobs (up to 20):');
      for (const job of failed) {
        console.log(
          `  id=${job.id} name=${job.name} failedReason=${job.failedReason || '(none)'} attemptsMade=${job.attemptsMade}`
        );
      }
      console.log('');
    }

    if ((counts.waiting ?? 0) > 0) {
      const waiting = await queue.getJobs(['waiting'], 0, 20, false);
      console.log('Waiting jobs (up to 20):');
      for (const job of waiting) {
        console.log(`  id=${job.id} name=${job.name}`);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await queue.close();
  }
}

main();
