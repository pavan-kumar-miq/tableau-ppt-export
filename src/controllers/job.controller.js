const { exportQueue, getJobById: getQueueJobById, getQueueStats: getQueueStatsFromProvider } = require("../services/worker.service");
const logger = require("../utils/logger.util");

/**
 * Maps BullMQ job states to legacy status values for backward compatibility.
 * @param {string} bullmqState - BullMQ job state (waiting, active, completed, failed, delayed, paused)
 * @returns {string} Legacy status (pending, processing, completed, failed)
 */
function mapBullMQStateToLegacyStatus(bullmqState) {
  const stateMap = {
    waiting: "pending",
    active: "processing",
    completed: "completed",
    failed: "failed",
    delayed: "pending",
    paused: "pending",
  };
  return stateMap[bullmqState] || bullmqState;
}

/**
 * Validates and queues a new export job.
 *
 * @param {object} req - Express request object
 * @param {object} req.body - Request body
 * @param {string} req.body.useCase - Use case identifier
 * @param {string} req.body.email - Recipient email address
 * @param {object} [req.body.filters] - Optional filters for data export
 * @param {object} res - Express response object
 */
async function addJob(req, res) {
  try {
    const { useCase, email, filters } = req.body;

    if (!useCase) {
      return res.status(400).json({
        error: "useCase is required",
        validUseCases: ["POLITICAL_SNAPSHOT"],
      });
    }

    if (!email) {
      return res.status(400).json({
        error: "email is required",
      });
    }

    // Validate useCase exists in mapping
    const usecaseMapping = require("../config/usecase-mapping.json");
    if (!usecaseMapping[useCase]) {
      return res.status(400).json({
        error: `Invalid useCase: ${useCase}. Valid use cases are: ${Object.keys(
          usecaseMapping
        ).join(", ")}`,
      });
    }

    logger.info("Export request received", {
      useCase,
      email,
      filterCount: filters ? Object.keys(filters).length : 0,
    });

    // Add job to BullMQ queue
    const job = await exportQueue.add("political-snapshot", {
      useCase,
      email,
      filters: filters || {},
    });

    res.status(202).json({
      message: "Export job queued successfully",
      jobId: job.id,
    });
  } catch (error) {
    logger.error("Failed to queue export job", error);
    res.status(500).json({
      error: "Failed to queue export job",
      message: error.message,
    });
  }
}

/**
 * Retrieves job status and details by job ID.
 *
 * @param {object} req - Express request object
 * @param {object} req.params - URL parameters
 * @param {string} req.params.jobId - Job identifier
 * @param {object} res - Express response object
 */
async function getJobById(req, res) {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        error: "jobId is required",
      });
    }

    const job = await getQueueJobById(jobId);

    if (!job) {
      return res.status(404).json({
        error: "Job not found",
        jobId,
      });
    }

    // Map BullMQ state to legacy status for backward compatibility
    const legacyStatus = mapBullMQStateToLegacyStatus(job.status);

    res.status(200).json({
      jobId: job.id,
      status: legacyStatus,
      attempts: job.attemptsMade,
      maxAttempts: job.maxAttempts,
      createdAt: job.createdAt,
      updatedAt: job.processedOn || job.createdAt,
      startedAt: job.processedOn,
      completedAt: job.finishedOn,
      failedAt: legacyStatus === "failed" ? job.finishedOn : null,
      error: job.failedReason,
      result: job.returnValue,
    });
  } catch (error) {
    logger.error("Failed to get job status", error, {
      jobId: req.params.jobId,
    });
    res.status(500).json({
      error: "Failed to get job status",
      message: error.message,
    });
  }
}

async function getQueueStats(req, res) {
  try {
    const stats = await getQueueStatsFromProvider();

    res.status(200).json({
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to get queue stats", error);
    res.status(500).json({
      error: "Failed to get queue stats",
      message: error.message,
    });
  }
}

async function cleanupStuckJobs(req, res) {
  try {
    // BullMQ handles stuck jobs automatically, but we can clean failed jobs if needed
    // This is a placeholder - BullMQ doesn't have a direct equivalent to cleanupStuckJobs
    // You can implement custom cleanup logic here if needed
    res.status(200).json({
      message: "Cleanup completed (BullMQ handles stuck jobs automatically)",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to cleanup stuck jobs", error);
    res.status(500).json({
      error: "Failed to cleanup stuck jobs",
      message: error.message,
    });
  }
}

/**
 * Retries a failed job by job ID.
 * Only jobs in "failed" state can be retried.
 *
 * @param {object} req - Express request object
 * @param {object} req.params - URL parameters
 * @param {string} req.params.jobId - Job identifier
 * @param {object} res - Express response object
 */
async function retryJob(req, res) {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        error: "jobId is required",
      });
    }

    logger.info("Retry job request received", { jobId });

    // Get the job from BullMQ
    const job = await exportQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        error: "Job not found",
        jobId,
      });
    }

    // Check job state
    const state = await job.getState();

    if (state !== "failed") {
      return res.status(400).json({
        error: `Job cannot be retried. Current status: ${state}`,
        jobId,
        status: state,
        message: "Only failed jobs can be retried. Use the job status endpoint to check the current state.",
      });
    }

    // Retry the job
    await job.retry();

    logger.info("Job queued for retry", {
      jobId: job.id,
      previousAttempts: job.attemptsMade,
    });

    res.status(200).json({
      message: "Job queued for retry successfully",
      jobId: job.id,
      previousAttempts: job.attemptsMade,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to retry job", error, {
      jobId: req.params.jobId,
    });
    res.status(500).json({
      error: "Failed to retry job",
      message: error.message,
    });
  }
}

module.exports = {
  addJob,
  getJobById,
  getQueueStats,
  cleanupStuckJobs,
  retryJob,
};
