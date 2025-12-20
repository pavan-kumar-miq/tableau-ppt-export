const jobService = require("../services/job.service");
const logger = require("../utils/logger.util");

/**
 * Basic health check endpoint.
 * Returns server status, uptime, and environment information.
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function healthCheck(req, res) {
  try {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    logger.error("Health check failed", error);
    res.status(503).json({
      status: "unhealthy",
      error: error.message,
    });
  }
}

/**
 * Readiness check endpoint for Kubernetes/orchestration platforms.
 * Verifies Redis connectivity and queue statistics.
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function readinessCheck(req, res) {
  try {
    const stats = await jobService.getQueueStats();

    res.status(200).json({
      status: "ready",
      redis: "connected",
      queue: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Readiness check failed", error);
    res.status(503).json({
      status: "not ready",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Liveness check endpoint for Kubernetes/orchestration platforms.
 * Simple check to verify the application is running.
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function livenessCheck(req, res) {
  try {
    res.status(200).json({
      status: "alive",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Liveness check failed", error);
    res.status(503).json({
      status: "dead",
      error: error.message,
    });
  }
}

module.exports = {
  healthCheck,
  readinessCheck,
  livenessCheck,
};
