const express = require('express');
const jobController = require('../controllers/job.controller');

const router = express.Router();

router.post('/jobs', jobController.addJob);
// More specific routes must come before parameterized routes
router.post('/jobs/:jobId/retry', jobController.retryJob);
router.get('/jobs/queue/stats', jobController.getQueueStats);
router.post('/jobs/queue/cleanup', jobController.cleanupStuckJobs);
router.get('/jobs/:jobId', jobController.getJobById);

module.exports = router;
