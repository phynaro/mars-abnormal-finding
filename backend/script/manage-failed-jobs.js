/**
 * Manage failed notification queue jobs: list, retry, or remove.
 * Run from backend: node script/manage-failed-jobs.js [command] [jobId|all]
 *
 * Commands:
 *   list              List failed jobs (default). Optional: list 50
 *   retry [id|all]    Retry one job by id or all failed jobs
 *   remove [id|all]   Remove one job or all failed jobs from the queue
 *
 * Examples:
 *   node script/manage-failed-jobs.js
 *   node script/manage-failed-jobs.js list 30
 *   node script/manage-failed-jobs.js retry 1540
 *   node script/manage-failed-jobs.js retry all
 *   node script/manage-failed-jobs.js remove 1540
 *   node script/manage-failed-jobs.js remove all
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Queue } = require('bullmq');

const QUEUE_NAME = 'notifications';
const connection = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : { host: 'localhost', port: 6379 };

const DEFAULT_LIST_LIMIT = 50;

async function getFailedJobs(queue, limit = DEFAULT_LIST_LIMIT) {
  const end = limit <= 0 ? -1 : limit - 1;
  return queue.getJobs(['failed'], 0, end, false);
}

async function main() {
  const args = process.argv.slice(2);
  const command = (args[0] || 'list').toLowerCase();
  const target = args[1]; // job id or "all"
  const queue = new Queue(QUEUE_NAME, { connection });

  try {
    if (command === 'list') {
      const limitArg = args[1];
      const limit = (limitArg != null && String(limitArg) !== 'all' && !Number.isNaN(parseInt(limitArg, 10)))
        ? parseInt(limitArg, 10)
        : DEFAULT_LIST_LIMIT;
      const failed = await getFailedJobs(queue, limit);
      console.log('Notification queue:', QUEUE_NAME);
      console.log('Failed jobs:', failed.length);
      if (failed.length === 0) {
        await queue.close();
        return;
      }
      console.log('');
      for (const job of failed) {
        console.log(`  id=${job.id} name=${job.name} attemptsMade=${job.attemptsMade} failedReason=${(job.failedReason || '(none)').slice(0, 80)}`);
      }
      await queue.close();
      return;
    }

    if (command === 'retry' || command === 'remove') {
      if (!target) {
        console.error('Usage: retry <jobId|all> or remove <jobId|all>');
        process.exit(1);
      }
      const failed = await getFailedJobs(queue, 10000);
      const toAct = target.toLowerCase() === 'all'
        ? failed
        : failed.filter((j) => String(j.id) === String(target));

      if (toAct.length === 0) {
        console.error(target === 'all' ? 'No failed jobs found.' : `No failed job with id "${target}" found.`);
        process.exit(1);
      }

      const action = command === 'retry' ? 'retry' : 'remove';
      for (const job of toAct) {
        try {
          if (command === 'retry') {
            await job.retry('failed', { resetAttemptsMade: true });
            console.log(`Retried job ${job.id} (${job.name})`);
          } else {
            await job.remove();
            console.log(`Removed job ${job.id} (${job.name})`);
          }
        } catch (err) {
          console.error(`Failed to ${action} job ${job.id}:`, err.message);
        }
      }
      console.log(`Done: ${action} ${toAct.length} job(s).`);
      await queue.close();
      return;
    }

    console.error('Unknown command. Use: list | retry <id|all> | remove <id|all>');
    process.exit(1);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await queue.close();
  }
}

main();
