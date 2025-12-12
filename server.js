require('dotenv').config();
const app = require('./src/app');
const logger = require('./src/utils/logger.util');

const PORT = process.env.PORT;
const NODE_ENV = process.env.NODE_ENV;

const server = app.getApp().listen(PORT, () => {
  logger.info('Server started successfully', {
    port: PORT,
    environment: NODE_ENV,
    nodeVersion: process.version
  });
});

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      const jobService = require('./src/services/job.service');
      await jobService.close();
      logger.info('Job service closed');
    } catch (error) {
      logger.error('Error closing job service', error);
    }

    logger.info('Graceful shutdown completed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', reason, { promise });
  gracefulShutdown('unhandledRejection');
});
