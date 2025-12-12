const express = require('express');
const jobController = require('../controllers/job.controller');

const router = express.Router();

router.post('/jobs', jobController.addJob);
router.get('/jobs/:jobId', jobController.getJobById);
router.get('/jobs/queue/stats', jobController.getQueueStats);
router.post('/jobs/queue/cleanup', jobController.cleanupStuckJobs);

module.exports = router;
