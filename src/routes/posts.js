import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  createPost,
  getPosts,
  likePost,
  commentOnPost,
  deleteComment,
  deletePost,
  getPostComments
} from '../controllers/postController.js';
import upload from '../middleware/imageUpload.js';

const router = express.Router();

// Post routes
router.post('/', auth, upload.single('image'), createPost);
router.get('/', auth, getPosts);
router.post('/:id/like', auth, likePost);
router.post('/:id/comment', auth, commentOnPost);
router.get('/:postId/comment', auth, getPostComments)
router.delete('/:postId/comment/:commentId', auth, deleteComment);
router.delete('/:id', auth, deletePost);

export default router;