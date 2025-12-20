const { Redis } = require("ioredis");
const logger = require("../utils/logger.util");

const MAX_PROCESSING_TIME_MS = 30 * 60 * 1000;
const JOB_TTL_SECONDS = 24 * 60 * 60;
const RETRY_BASE_DELAY_MS = 50;
const MAX_RETRY_DELAY_MS = 2000;
const WORKER_POLL_INTERVAL_MS = 1000;
const ERROR_BACKOFF_MS = 5000;

/**
 * Service for managing job queue operations using Redis.
 * Provides job lifecycle management, queue processing, and monitoring.
 */
class JobService {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT, 10),
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        const delay = Math.min(times * RETRY_BASE_DELAY_MS, MAX_RETRY_DELAY_MS);
        logger.warn(`Redis connection retry attempt ${times}`, { delay });
        return delay;
      },
    });

    this.redis.on("connect", () => {
      logger.info("Redis connected for job service", {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
      });
    });

    this.redis.on("error", (err) => {
      logger.error("Redis connection error", err);
    });

    this.jobPrefix = "job:";
    this.queueKey = "job:queue";
    this.processingKey = "job:processing";

    this.isProcessing = false;
    this.concurrency = parseInt(process.env.QUEUE_CONCURRENCY, 10);
    this.maxAttempts = parseInt(process.env.QUEUE_ATTEMPTS, 10);

    logger.info("Job Service initialized", {
      concurrency: this.concurrency,
      maxAttempts: this.maxAttempts,
    });
  }

  _generateJobId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  async addJob(jobData) {
    const jobId = this._generateJobId();

    const job = {
      id: jobId,
      data: jobData,
      status: "pending",
      attempts: 0,
      maxAttempts: this.maxAttempts,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      error: null,
    };

    try {
      await this.redis.set(
        `${this.jobPrefix}${jobId}`,
        JSON.stringify(job),
        "EX",
        24 * 60 * 60 // Expire after 24 hours
      );

      await this.redis.rpush(this.queueKey, jobId);

      logger.info("Job added to queue", {
        jobId,
        queueLength: await this.redis.llen(this.queueKey),
      });

      return jobId;
    } catch (error) {
      logger.error("Failed to add job", error, { jobId });
      throw new Error(`Failed to add job: ${error.message}`);
    }
  }

  async getJobById(jobId) {
    try {
      const reservedKeys = ["queue", "processing"];
      if (reservedKeys.includes(jobId)) {
        logger.warn("Attempted to get job with reserved key", { jobId });
        return null;
      }

      const key = `${this.jobPrefix}${jobId}`;
      const keyType = await this.redis.type(key);

      if (keyType === "none") {
        return null;
      }

      if (keyType !== "string") {
        logger.warn("Key exists but is not a string type", { jobId, keyType });
        return null;
      }

      const jobData = await this.redis.get(key);

      if (!jobData) {
        return null;
      }

      return JSON.parse(jobData);
    } catch (error) {
      if (error.message && error.message.includes("WRONGTYPE")) {
        logger.warn("Key exists but has wrong type", {
          jobId,
          error: error.message,
        });
        return null;
      }
      logger.error("Failed to get job by id", error, { jobId });
      throw new Error(`Failed to get job by id: ${error.message}`);
    }
  }

  async updateJobById(jobId, updates) {
    try {
      const job = await this.getJobById(jobId);

      if (!job) {
        throw new Error(`Job with id ${jobId} not found`);
      }

      const updatedJob = {
        ...job,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await this.redis.set(
        `${this.jobPrefix}${jobId}`,
        JSON.stringify(updatedJob),
        "EX",
        24 * 60 * 60
      );

      logger.debug("Job with id updated", { jobId, updates });

      return updatedJob;
    } catch (error) {
      logger.error("Failed to update job with id", error, { jobId, updates });
      throw new Error(
        `Failed to update job with id ${jobId}: ${error.message}`
      );
    }
  }

  async _getNextJobFromQueue() {
    try {
      const jobId = await this.redis.lpop(this.queueKey);

      if (!jobId) {
        return null;
      }

      await this.redis.sadd(this.processingKey, jobId);

      const job = await this.getJobById(jobId);

      if (!job) {
        logger.warn(`Job with id ${jobId} not found in storage`);
        await this.redis.srem(this.processingKey, jobId);
        return null;
      }

      return job;
    } catch (error) {
      logger.error("Failed to get next job from queue", error);
      return null;
    }
  }

  async completeJobById(jobId, result = {}) {
    try {
      await this.updateJobById(jobId, {
        status: "completed",
        result,
        completedAt: new Date().toISOString(),
      });

      await this.redis.srem(this.processingKey, jobId);

      logger.info("Job with id completed", { jobId });
    } catch (error) {
      logger.error("Failed to complete job with id", error, { jobId });
    }
  }

  async failJobById(jobId, error) {
    try {
      const job = await this.getJobById(jobId);

      if (!job) {
        return;
      }

      const attempts = job.attempts + 1;
      const shouldRetry = attempts < job.maxAttempts;

      if (shouldRetry) {
        await this.updateJobById(jobId, {
          status: "pending",
          attempts,
          error: error.message,
        });

        await this.redis.srem(this.processingKey, jobId);
        await this.redis.rpush(this.queueKey, jobId);

        logger.warn("Job failed, will retry", {
          jobId,
          attempts,
          maxAttempts: job.maxAttempts,
          error: error.message,
        });
      } else {
        await this.updateJobById(jobId, {
          status: "failed",
          attempts,
          error: error.message,
          failedAt: new Date().toISOString(),
        });

        await this.redis.srem(this.processingKey, jobId);

        logger.error("Job with id failed permanently", null, {
          jobId,
          attempts,
          error: error.message,
        });
      }
    } catch (err) {
      logger.error("Failed to handle job with id failure", err, { jobId });
    }
  }

  async _executeJobById(job, processor) {
    const { id: jobId } = job;

    try {
      logger.info("Executing job with id", { jobId });

      await this.updateJobById(jobId, {
        status: "processing",
        startedAt: new Date().toISOString(),
      });

      const result = await processor(job);

      await this.completeJobById(jobId, result);

      return { success: true, jobId };
    } catch (error) {
      logger.error("Job execution with id failed", error, { jobId });
      await this.failJobById(jobId, error);
      return { success: false, jobId, error: error.message };
    }
  }

  async startWorker(processor) {
    if (this.isProcessing) {
      logger.warn("Worker already running");
      return;
    }

    // Clean up any orphaned jobs before starting
    await this._cleanupOrphanedJobs();

    this.isProcessing = true;
    logger.info("Starting job worker", { concurrency: this.concurrency });

    const processLoop = async () => {
      while (this.isProcessing) {
        try {
          const job = await this._getNextJobFromQueue();

          if (job) {
            await this._executeJobById(job, processor);
          } else {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (error) {
          logger.error(
            "Error in worker loop for getting next job from queue",
            error
          );
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    };

    for (let i = 0; i < this.concurrency; i++) {
      processLoop().catch((err) => {
        logger.error(
          "Worker loop for getting next job from queue crashed",
          err,
          { workerIndex: i }
        );
      });
    }
  }

  async stopWorker() {
    logger.info("Stopping job worker");
    this.isProcessing = false;
  }

  async _cleanupOrphanedJobs() {
    try {
      const processingJobIds = await this.redis.smembers(this.processingKey);

      if (!processingJobIds || processingJobIds.length === 0) {
        return { cleaned: 0, requeued: 0 };
      }

      let cleaned = 0;
      let requeued = 0;
      const maxProcessingTime = 30 * 60 * 1000; // 30 minutes
      const now = Date.now();

      for (const jobId of processingJobIds) {
        try {
          const job = await this.getJobById(jobId);

          if (!job) {
            // Job doesn't exist in storage, remove from processing set
            await this.redis.srem(this.processingKey, jobId);
            cleaned++;
            logger.warn(
              "Removed orphaned job from processing set (job not found)",
              { jobId }
            );
            continue;
          }

          // If job is already completed or failed, remove from processing set
          if (job.status === "completed" || job.status === "failed") {
            await this.redis.srem(this.processingKey, jobId);
            cleaned++;
            logger.warn("Removed completed/failed job from processing set", {
              jobId,
              status: job.status,
            });
            continue;
          }

          // If job has been processing for too long, requeue it
          if (job.status === "processing" && job.startedAt) {
            const startedAt = new Date(job.startedAt).getTime();
            const processingTime = now - startedAt;

            if (processingTime > maxProcessingTime) {
              await this.redis.srem(this.processingKey, jobId);
              await this.updateJobById(jobId, {
                status: "pending",
                error:
                  "Job was stuck in processing state and has been requeued",
              });
              await this.redis.rpush(this.queueKey, jobId);
              requeued++;
              logger.warn("Requeued stuck job", {
                jobId,
                processingTimeMinutes: Math.round(processingTime / 60000),
              });
            }
          }
        } catch (error) {
          logger.error("Error cleaning up orphaned job", error, { jobId });
        }
      }

      if (cleaned > 0 || requeued > 0) {
        logger.info("Cleaned up orphaned jobs", { cleaned, requeued });
      }

      return { cleaned, requeued };
    } catch (error) {
      logger.error("Failed to cleanup orphaned jobs", error);
      return { cleaned: 0, requeued: 0 };
    }
  }

  async cleanupStuckJobs() {
    return await this._cleanupOrphanedJobs();
  }

  async getQueueStats() {
    try {
      const queueLength = await this.redis.llen(this.queueKey);
      const processingCount = await this.redis.scard(this.processingKey);

      // Get all pending job IDs from queue
      const pendingJobIds = await this.redis.lrange(this.queueKey, 0, -1);
      // Get all processing job IDs
      const processingJobIds = await this.redis.smembers(this.processingKey);

      // Get details about pending jobs
      let oldestPendingJob = null;
      let pendingJobsDetails = [];
      if (pendingJobIds.length > 0) {
        for (const jobId of pendingJobIds.slice(0, 100)) {
          // Limit to first 100 for performance
          try {
            const job = await this.getJobById(jobId);
            if (job) {
              pendingJobsDetails.push(job);
              const createdAt = new Date(job.createdAt).getTime();
              if (!oldestPendingJob || createdAt < oldestPendingJob.createdAt) {
                oldestPendingJob = { ...job, createdAt: createdAt };
              }
            }
          } catch (error) {
            logger.debug("Error getting pending job details", {
              jobId,
              error: error.message,
            });
          }
        }
      }

      // Get details about processing jobs
      let processingJobsDetails = [];
      let totalProcessingTime = 0;
      let processingCountWithTime = 0;
      let stuckJobsCount = 0;
      const maxProcessingTime = 30 * 60 * 1000; // 30 minutes
      const now = Date.now();

      if (processingJobIds.length > 0) {
        for (const jobId of processingJobIds) {
          try {
            const job = await this.getJobById(jobId);
            if (job) {
              processingJobsDetails.push(job);
              if (job.startedAt) {
                const startedAt = new Date(job.startedAt).getTime();
                const processingTime = now - startedAt;
                totalProcessingTime += processingTime;
                processingCountWithTime++;

                if (processingTime > maxProcessingTime) {
                  stuckJobsCount++;
                }
              }
            }
          } catch (error) {
            logger.debug("Error getting processing job details", {
              jobId,
              error: error.message,
            });
          }
        }
      }

      // Calculate average processing time
      const avgProcessingTime =
        processingCountWithTime > 0
          ? Math.round(totalProcessingTime / processingCountWithTime)
          : 0;

      // Calculate oldest pending job wait time
      const oldestPendingWaitTime = oldestPendingJob
        ? Math.round((now - oldestPendingJob.createdAt) / 1000)
        : 0;

      // Get status breakdown from sample of jobs
      const statusBreakdown = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      };

      // Count statuses from processing jobs
      processingJobsDetails.forEach((job) => {
        if (job.status && statusBreakdown.hasOwnProperty(job.status)) {
          statusBreakdown[job.status]++;
        }
      });

      // Count pending jobs (those in queue)
      statusBreakdown.pending = queueLength;

      // Calculate retry statistics
      const jobsWithRetries = [
        ...pendingJobsDetails,
        ...processingJobsDetails,
      ].filter((job) => job.attempts > 0);
      const totalRetries = jobsWithRetries.reduce(
        (sum, job) => sum + job.attempts,
        0
      );
      const avgRetries =
        jobsWithRetries.length > 0
          ? (totalRetries / jobsWithRetries.length).toFixed(2)
          : 0;

      // Get configuration
      const config = {
        concurrency: this.concurrency,
        maxAttempts: this.maxAttempts,
        workerRunning: this.isProcessing,
      };

      return {
        queue: {
          pending: queueLength,
          processing: processingCount,
          total: queueLength + processingCount,
        },
        statusBreakdown,
        timing: {
          oldestPendingWaitTimeSeconds: oldestPendingWaitTime,
          oldestPendingJobCreatedAt: oldestPendingJob
            ? new Date(oldestPendingJob.createdAt).toISOString()
            : null,
          averageProcessingTimeMs: avgProcessingTime,
          averageProcessingTimeSeconds: Math.round(avgProcessingTime / 1000),
          stuckJobsCount,
        },
        retries: {
          jobsWithRetries: jobsWithRetries.length,
          totalRetries,
          averageRetries: parseFloat(avgRetries),
        },
        config,
        sample: {
          pendingJobsSampled: pendingJobsDetails.length,
          processingJobsSampled: processingJobsDetails.length,
        },
      };
    } catch (error) {
      logger.error("Failed to get queue stats", error);
      return {
        queue: { pending: 0, processing: 0, total: 0 },
        statusBreakdown: { pending: 0, processing: 0, completed: 0, failed: 0 },
        timing: {
          oldestPendingWaitTimeSeconds: 0,
          oldestPendingJobCreatedAt: null,
          averageProcessingTimeMs: 0,
          averageProcessingTimeSeconds: 0,
          stuckJobsCount: 0,
        },
        retries: {
          jobsWithRetries: 0,
          totalRetries: 0,
          averageRetries: 0,
        },
        config: {
          concurrency: this.concurrency,
          maxAttempts: this.maxAttempts,
          workerRunning: this.isProcessing,
        },
        sample: {
          pendingJobsSampled: 0,
          processingJobsSampled: 0,
        },
        error: error.message,
      };
    }
  }

  async close() {
    logger.info("Closing job service");
    await this.stopWorker();
    await this.redis.quit();
  }
}

module.exports = new JobService();
