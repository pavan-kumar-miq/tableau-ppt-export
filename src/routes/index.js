const express = require('express');
const healthRoutes = require('./health.routes');
const exportRoutes = require('./job.routes');

const router = express.Router();

router.use('/', healthRoutes);
router.use('/api/v1', exportRoutes);

module.exports = router;
