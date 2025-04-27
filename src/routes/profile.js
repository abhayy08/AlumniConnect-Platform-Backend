import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  getProfile,
  getDetailedProfile,
  updateProfile,
  updateWorkExperienceById,
  searchAlumni,
  addConnection,
  removeConnection,
  getConnections,
  getSuggestedConnections,
  addWorkExperience,
  deleteExperienceById,
  uploadProfileImage,
  removeProfileImage
} from '../controllers/profileController.js';
import upload from '../middleware/imageUpload.js';

const router = express.Router();

// Basic profile routes
router.get('/me', auth, getProfile);
router.put('/me', auth, updateProfile);

// Profile image routes with Cloudinary
router.post('/me/profile-image', auth, upload.single('image'), uploadProfileImage);
router.delete('/me/profile-image', auth, removeProfileImage);

// Detailed profile routes
router.get('/detailed/:userId?', auth, getDetailedProfile);
router.put('/work-experience/:experienceId', auth, updateWorkExperienceById);
router.post('/work-experience', auth, addWorkExperience)
router.delete('/work-experience/:id', auth, deleteExperienceById)

// Alumni search
router.get('/search', auth, searchAlumni);
router.get('/suggested', auth, getSuggestedConnections);

// Connection management - simplified, direct connections
router.post('/connect/:connectionId', auth, addConnection);
router.delete('/connect/:connectionId', auth, removeConnection);
router.get('/connections/:id?', auth, getConnections);

export default router;