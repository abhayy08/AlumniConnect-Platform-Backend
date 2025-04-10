import Post from '../models/Post.js';
import User from '../models/User.js';
import shuffleArray from '../utils/shuffleArray.js';

export const createPost = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const post = new Post({
      content,
      author: req.userId
    });

    await post.save();

    res.status(201).json({ message: "New post created successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(req.userId);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const connectionIds = currentUser.connections.map(id => id.toString());
    const userId = req.userId;

    const recentConnectionPosts = await Post.find({ author: { $in: connectionIds } })
      .sort({ createdAt: -1 })
      .limit(15)
      .populate('author', 'name jobTitle company')
      .populate('likes', 'name')
      .populate('comments.author', 'name');

    const shuffledConnectionPosts = shuffleArray(recentConnectionPosts);

    const otherPublicPosts = await Post.find({
      author: { $nin: [...connectionIds, userId] }
    })
      .sort({ createdAt: -1 })
      .populate('author', 'name jobTitle company')
      .populate('likes', 'name')
      .populate('comments.author', 'name');


    const combinedPosts = [...shuffledConnectionPosts, ...otherPublicPosts];

    const postsWithLikedByCurrentUserBool = combinedPosts.map(post => {
      const isLiked = post.likes.some(like => like._id.toString() === userId);
      return {
        ...post.toObject(),
        likedByCurrentUser: isLiked
      };
    });

    const paginatedPosts = postsWithLikedByCurrentUserBool.slice(skip, skip + limit);

    res.json(paginatedPosts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Apply pagination to comments
    const paginatedComments = post.comments
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(skip, skip + limit);


    const populatedComments = await Promise.all(
      paginatedComments.map(async (comment) => {
        const author = await User.findById(comment.author).select('name');
        return {
          _id: comment._id,
          comment: comment.comment,
          author,
          createdAt: comment.createdAt
        };
      })
    );

    res.json(populatedComments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if already liked
    if (post.likes.includes(req.userId)) {
      // Unlike
      post.likes = post.likes.filter(
        id => id.toString() !== req.userId
      );
    } else {
      // Like
      post.likes.push(req.userId);
    }

    await post.save();

    res.json({message: "Post liked successfully!"});
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const commentOnPost = async (req, res) => {
  try {
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const newComment = {
      comment,
      author: req.userId,
      createdAt: new Date()
    };

    post.comments.push(newComment);
    await post.save();

    res.json({message: "Comment added successfully!"});
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Find the comment
    const commentIndex = post.comments.findIndex(
      comment => comment._id.toString() === commentId
    );

    if (commentIndex === -1) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user is the author of the comment
    if (post.comments[commentIndex].author.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    // Remove the comment
    post.comments.splice(commentIndex, 1);
    await post.save();

    res.json({message: "Comment deleted successfully!"});
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user is the author of the post
    if (post.author.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    await Post.findByIdAndDelete(req.params.id);

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};