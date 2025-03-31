import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  sendMessage,
  getConversations,
  markMessageAsRead
} from '../controllers/messageController.js';

const router = express.Router();

router.post('/', auth, sendMessage);
router.get('/conversations', auth, getConversations);
router.put('/:id/read', auth, markMessageAsRead);

export default router;