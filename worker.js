require("dotenv").config();
const jobService = require("./src/services/job.service");
const exportPptService = require("./src/services/export-ppt.service");
const logger = require("./src/utils/logger.util");

logger.info("Worker starting...", {
  nodeVersion: process.version,
  environment: process.env.NODE_ENV,
});

/**
 * Processes PowerPoint export jobs from the queue.
 * Handles job execution and sends failure notifications on error.
 *
 * @param {object} job - Job data from queue
 * @param {string} job.id - Job identifier
 * @param {object} job.data - Job payload
 * @param {string} job.data.useCase - Use case identifier
 * @param {string} job.data.email - Recipient email
 * @param {object} job.data.filters - Optional filters
 * @returns {Promise<object>} Processing result
 * @throws {Error} If processing fails
 */
async function processPptExport(job) {
  logger.info("Processing job", {
    jobId: job.id,
    useCase: job.data.useCase,
    email: job.data.email,
    filterCount: Object.keys(job.data.filters || {}).length,
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
    });

    if (job.data.email && job.data.useCase) {
      try {
        await exportPptService.sendFailureEmail(
          job.data.email,
          job.data.useCase,
          error
        );
        logger.info("Failure notification email sent", {
          jobId: job.id,
          email: job.data.email,
        });
      } catch (emailError) {
        logger.error("Failed to send failure notification email", emailError, {
          jobId: job.id,
          originalError: error.message,
        });
      }
    }

    throw error;
  }
}

jobService
  .startWorker(processPptExport)
  .then(() => {
    logger.info("Worker started successfully");
  })
  .catch((error) => {
    logger.error("Failed to start worker", error);
    process.exit(1);
  });

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    await jobService.stopWorker();
    await jobService.close();
    logger.info("Worker shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception in worker", error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection in worker", reason, { promise });
  gracefulShutdown("unhandledRejection");
});
