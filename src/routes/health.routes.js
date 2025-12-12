const express = require('express');
const healthController = require('../controllers/health.controller');

const router = express.Router();

/**
 * Health Check Routes
 */

// Basic health check
router.get('/health', healthController.healthCheck);

// Readiness check (includes Redis)
router.get('/health/ready', healthController.readinessCheck);

// Liveness check
router.get('/health/live', healthController.livenessCheck);

module.exports = router;
