require('dotenv').config();
const jobService = require('./src/services/job.service');
const exportPptService = require('./src/services/export-ppt.service');
const logger = require('./src/utils/logger.util');

logger.info('Worker starting...', {
  nodeVersion: process.version,
  environment: process.env.NODE_ENV
});

async function processPptExport(job) {
  logger.info('Processing job', {
    jobId: job.id,
    viewIds: job.data.viewIds,
    email: job.data.email
  });

  try {
    const result = await exportPptService.processExport(job.data);
    
    logger.info('Job processed successfully', {
      jobId: job.id,
      result
    });

    return result;
  } catch (error) {
    logger.error('Job processing failed', error, {
      jobId: job.id
    });
    throw error;
  }
}

jobService.startWorker(processPptExport)
  .then(() => {
    logger.info('Worker started successfully');
  })
  .catch((error) => {
    logger.error('Failed to start worker', error);
    process.exit(1);
  });

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    await jobService.stopWorker();
    await jobService.close();
    logger.info('Worker shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception in worker', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection in worker', reason, { promise });
  gracefulShutdown('unhandledRejection');
});
