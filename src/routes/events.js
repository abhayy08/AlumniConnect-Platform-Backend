import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  createEvent,
  getEvents,
  registerForEvent
} from '../controllers/eventController.js';

const router = express.Router();

router.post('/', auth, createEvent);
router.get('/', auth, getEvents);
router.post('/:id/register', auth, registerForEvent);

export default router;