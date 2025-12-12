require('dotenv').config();
const express = require('express');
const routes = require('./routes');
const logger = require('./utils/logger.util');

class App {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    
    logger.info('Express app initialized');
  }

  setupMiddleware() {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('HTTP Request', {
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip
        });
      });

      next();
    });

    logger.debug('Middleware configured');
  }

  setupRoutes() {
    this.app.use('/', routes);
    logger.debug('Routes configured');
  }

  setupErrorHandling() {
    this.app.use((req, res) => {
      logger.warn('Route not found', {
        method: req.method,
        url: req.url
      });
      
      res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.url}`
      });
    });

    this.app.use((err, req, res, next) => {
      logger.error('Unhandled error', err, {
        method: req.method,
        url: req.url
      });

      const status = err.status || 500;
      res.status(status).json({
        error: err.name || 'Internal Server Error',
        message: err.message || 'An unexpected error occurred'
      });
    });

    logger.debug('Error handling configured');
  }

  getApp() {
    return this.app;
  }
}

module.exports = new App();
