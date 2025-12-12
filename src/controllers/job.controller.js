const jobService = require('../services/job.service');
const logger = require('../utils/logger.util');

async function addJob(req, res) {
  try {
    const { viewIds, email, filters, config, siteName } = req.body;

    if (!viewIds || !Array.isArray(viewIds) || viewIds.length === 0) {
      return res.status(400).json({
        error: 'viewIds is required and must be a non-empty array'
      });
    }

    if (!email) {
      return res.status(400).json({
        error: 'email is required'
      });
    }

    const validSites = [
      'miqdigital-us',
      'miqdigital-anz',
      'miqdigital-ca',
      'miqdigital-emea',
      'miqdigital-sea',
      'miqdigital-global',
      'miqdigital-integration',
      'miqdigital-internal'
    ];
    
    if (!siteName) {
      return res.status(400).json({
        error: 'siteName is required',
        validSites
      });
    }
    
    if (!validSites.includes(siteName)) {
      return res.status(400).json({
        error: `Invalid siteName. Valid sites are: ${validSites.join(', ')}`
      });
    }

    logger.info('Export request received', {
      viewIds,
      email,
      filterCount: filters ? Object.keys(filters).length : 0,
      siteName
    });

    const { jobId, status } = await jobService.addJob({
      viewIds,
      email,
      filters: filters || {},
      config: config || {},
      siteName
    });

    res.status(202).json({
      message: 'Export job queued successfully',
      jobId,
      status
    });
  } catch (error) {
    logger.error('Failed to queue export job', error);
    res.status(500).json({
      error: 'Failed to queue export job',
      message: error.message
    });
  }
}

async function getJobById(req, res) {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        error: 'jobId is required'
      });
    }

    // Validate that jobId is not a reserved key
    const reservedKeys = ['queue', 'processing'];
    if (reservedKeys.includes(jobId)) {
      return res.status(400).json({
        error: `Invalid jobId: "${jobId}" is a reserved key. Please use a valid job ID.`
      });
    }

    const job = await jobService.getJobById(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        jobId
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
      result: job.result
    });
  } catch (error) {
    logger.error('Failed to get job status', error, { jobId: req.params.jobId });
    res.status(500).json({
      error: 'Failed to get job status',
      message: error.message
    });
  }
}

async function getQueueStats(req, res) {
  try {
    const stats = await jobService.getQueueStats();

    res.status(200).json({
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get queue stats', error);
    res.status(500).json({
      error: 'Failed to get queue stats',
      message: error.message
    });
  }
}

async function cleanupStuckJobs(req, res) {
  try {
    const result = await jobService.cleanupStuckJobs();

    res.status(200).json({
      message: 'Cleanup completed',
      cleaned: result.cleaned,
      requeued: result.requeued,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to cleanup stuck jobs', error);
    res.status(500).json({
      error: 'Failed to cleanup stuck jobs',
      message: error.message
    });
  }
}

module.exports = {
  addJob,
  getJobById,
  getQueueStats,
  cleanupStuckJobs
};
