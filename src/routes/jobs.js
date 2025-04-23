import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  createJob,
  getJobs,
  applyForJob,
  searchJobs,
  updateJobStatus,
  getJobsByCurrentUser,
  getJobsAppliedByUser,
  getOfferedJobs,
  getApplicantsOfJob,
  updateApplicationStatus,
  getJobsByUserId,
  getJobById
} from '../controllers/jobController.js';

const router = express.Router();

router.post('/', auth, createJob);
router.get('/', auth, getJobs);
router.get('/user/:id', auth, getJobsByUserId);
router.get('/applied', auth, getJobsAppliedByUser);
router.get('/offered', auth, getOfferedJobs);
router.get('/me', auth, getJobsByCurrentUser)
router.get('/:id/applicants', auth, getApplicantsOfJob);
router.get('/search', auth, searchJobs);
router.get('/:id', auth, getJobById);
router.post('/:id/apply', auth, applyForJob);
router.patch('/:id/status', auth, updateJobStatus);
router.patch('/:id/application', auth, updateApplicationStatus);

export default router;