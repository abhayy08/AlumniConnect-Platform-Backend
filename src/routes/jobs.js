import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  createJob,
  getJobs,
  getJob,
  applyForJob,
  searchJobs,
  updateJobStatus,
  updateApplicationStatus,
  getJobsByCurrentUser,
  getJobsAppliedByUser,
  getOfferedJobs
} from '../controllers/jobController.js';

const router = express.Router();

router.post('/', auth, createJob);
router.get('/', auth, getJobs);
router.get('/applied', auth, getJobsAppliedByUser);
router.get('/offered', auth, getOfferedJobs);
router.get('/me', auth, getJobsByCurrentUser)
router.get('/search', auth, searchJobs);
router.get('/:id', auth, getJob);
router.post('/:id/apply', auth, applyForJob);
router.patch('/:id/status', auth, updateJobStatus);
router.patch('/:id/application', auth, updateApplicationStatus);

export default router;