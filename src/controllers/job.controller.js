const jobService = require("../services/job.service");
const logger = require("../utils/logger.util");

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

    const jobId = await jobService.addJob({
      useCase,
      email,
      filters: filters || {},
    });

    res.status(202).json({
      message: "Export job queued successfully",
      jobId,
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

    // Validate that jobId is not a reserved key
    const reservedKeys = ["queue", "processing"];
    if (reservedKeys.includes(jobId)) {
      return res.status(400).json({
        error: `Invalid jobId: "${jobId}" is a reserved key. Please use a valid job ID.`,
      });
    }

    const job = await jobService.getJobById(jobId);

    if (!job) {
      return res.status(404).json({
        error: "Job not found",
        jobId,
      });
    }

    res.status(200).json({
      jobId: job.id,
      status: job.status,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      failedAt: job.failedAt,
      error: job.error,
      result: job.result,
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
    const stats = await jobService.getQueueStats();

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
    const result = await jobService.cleanupStuckJobs();

    res.status(200).json({
      message: "Cleanup completed",
      cleaned: result.cleaned,
      requeued: result.requeued,
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

module.exports = {
  addJob,
  getJobById,
  getQueueStats,
  cleanupStuckJobs,
};
