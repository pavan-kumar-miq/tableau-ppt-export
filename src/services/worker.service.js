const { Queue, Worker } = require("bullmq");
const logger = require("../utils/logger.util");
const exportPptService = require("./export-ppt.service");

// Redis connection configuration
const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
};

const QUEUE_NAME = "tableau-ppt-export";

// The Queue (Publisher) - Used by API to add jobs
const exportQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: parseInt(process.env.QUEUE_ATTEMPTS, 10) || 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: {
      age: 24 * 60 * 60, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60, // Keep failed jobs for 7 days
    },
  },
});

// Worker instance (will be initialized by initWorker)
let worker = null;

/**
 * Initializes the BullMQ Worker to process jobs from the queue.
 * This function should be called once when the application starts.
 * The worker will process jobs with the configured concurrency.
 *
 * @returns {Worker} The initialized worker instance
 */
function initWorker() {
  if (worker) {
    logger.warn("Worker already initialized");
    return worker;
  }

  const concurrency = parseInt(process.env.QUEUE_CONCURRENCY, 10) || 5;

  logger.info("Initializing BullMQ worker", {
    queueName: QUEUE_NAME,
    concurrency,
    redisHost: connection.host,
    redisPort: connection.port,
  });

  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      logger.info("Processing job", {
        jobId: job.id,
        useCase: job.data.useCase,
        email: job.data.email,
        filterCount: Object.keys(job.data.filters || {}).length,
        attempt: job.attemptsMade + 1,
      });

      try {
        const result = await exportPptService.processExport(job.data);

        logger.info("Job processed successfully", {
          jobId: job.id,
          result,
        });

        return result;
      } catch (error) {
        logger.error("Job processing failed", error, {
          jobId: job.id,
          useCase: job.data.useCase,
          email: job.data.email,
          attempt: job.attemptsMade + 1,
        });

        // Send failure email if this is the final attempt
        if (
          job.attemptsMade + 1 >= job.opts.attempts &&
          job.data.email &&
          job.data.useCase
        ) {
          try {
            await exportPptService.sendFailureEmail(
              job.data.email,
              job.data.useCase,
              error,
              job.id
            );
            logger.info("Failure notification email sent", {
              jobId: job.id,
              email: job.data.email,
            });
          } catch (emailError) {
            logger.error(
              "Failed to send failure notification email",
              emailError,
              {
                jobId: job.id,
                originalError: error.message,
              }
            );
          }
        }

        throw error;
      }
    },
    {
      connection,
      concurrency,
      // Optional: Use worker threads to prevent blocking the main event loop
      // This is useful for CPU-intensive tasks
      // useWorkerThreads: true,
    }
  );

  // Worker event handlers
  worker.on("completed", (job) => {
    logger.info("Job completed", {
      jobId: job.id,
      duration: job.finishedOn - job.processedOn,
    });
  });

  worker.on("failed", (job, err) => {
    logger.error("Job failed", err, {
      jobId: job?.id,
      attemptsMade: job?.attemptsMade,
      maxAttempts: job?.opts?.attempts,
    });
  });

  worker.on("error", (err) => {
    logger.error("Worker error", err);
  });

  worker.on("stalled", (jobId) => {
    logger.warn("Job stalled", { jobId });
  });

  logger.info("BullMQ worker started successfully", {
    queueName: QUEUE_NAME,
    concurrency,
  });

  return worker;
}

/**
 * Closes the worker and queue connections gracefully.
 * Should be called during application shutdown.
 *
 * @returns {Promise<void>}
 */
async function close() {
  logger.info("Closing BullMQ connections");

  if (worker) {
    await worker.close();
    worker = null;
    logger.info("Worker closed");
  }

  await exportQueue.close();
  logger.info("Queue closed");
}

/**
 * Gets queue statistics for monitoring and health checks.
 *
 * @returns {Promise<object>} Queue statistics
 */
async function getQueueStats() {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      exportQueue.getWaitingCount(),
      exportQueue.getActiveCount(),
      exportQueue.getCompletedCount(),
      exportQueue.getFailedCount(),
      exportQueue.getDelayedCount(),
    ]);

    const isWorkerActive = worker !== null;

    return {
      queue: {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      },
      config: {
        concurrency: parseInt(process.env.QUEUE_CONCURRENCY, 10) || 5,
        maxAttempts: parseInt(process.env.QUEUE_ATTEMPTS, 10) || 3,
        workerRunning: isWorkerActive,
      },
    };
  } catch (error) {
    logger.error("Failed to get queue stats", error);
    throw error;
  }
}

/**
 * Gets a job by ID from the queue.
 *
 * @param {string} jobId - The job ID
 * @returns {Promise<object|null>} Job data or null if not found
 */
async function getJobById(jobId) {
  try {
    const job = await exportQueue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress;
    const returnValue = job.returnvalue;
    const failedReason = job.failedReason;

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      status: state,
      progress,
      attemptsMade: job.attemptsMade,
      maxAttempts: job.opts?.attempts || 3,
      createdAt: new Date(job.timestamp).toISOString(),
      processedOn: job.processedOn ? new Date(job.processedOn).toISOString() : null,
      finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
      failedReason,
      returnValue,
    };
  } catch (error) {
    logger.error("Failed to get job by id", error, { jobId });
    throw error;
  }
}

module.exports = {
  exportQueue,
  initWorker,
  close,
  getQueueStats,
  getJobById,
};

