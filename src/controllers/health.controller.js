const jobService = require('../services/job.service');
const logger = require('../utils/logger.util');

async function healthCheck(req, res) {
  try {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
}

async function readinessCheck(req, res) {
  try {
    const stats = await jobService.getQueueStats();
    
    res.status(200).json({
      status: 'ready',
      redis: 'connected',
      queue: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check failed', error);
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

async function livenessCheck(req, res) {
  try {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Liveness check failed', error);
    res.status(503).json({
      status: 'dead',
      error: error.message
    });
  }
}

module.exports = {
  healthCheck,
  readinessCheck,
  livenessCheck
};
