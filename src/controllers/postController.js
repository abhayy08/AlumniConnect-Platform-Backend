import Post from '../models/Post.js';
import User from '../models/User.js';
import shuffleArray from '../utils/shuffleArray.js';
import cloudinary from '../config/cloudinary.js';
import { bufferToStream } from '../utils/helperFunctions.js';

export const createPost = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Create a new post object
    const postData = {
      content,
      author: req.userId
    };

    // Handle image upload if present
    if (req.file) {
      try {
        const folderPath = `alumni_network/post_images/${req.userId}`;
        
        // Upload new image to Cloudinary using stream
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: folderPath,
              resource_type: 'image',
              transformation: [
                { width: 1200, height: 1200, crop: 'limit' },
                { quality: 'auto:good' }
              ]
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          bufferToStream(req.file.buffer).pipe(uploadStream);

        });
        
        // Add imageUrl and imageId to post data
        postData.imageUrl = result.secure_url;
        postData.imageId = result.public_id; // Store public_id for potential deletion later
        
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(400).json({ error: 'Failed to upload image' });
      }
    }

    const post = new Post(postData);
    await post.save();
    
    res.status(201).json({ 
      message: "New post created successfully",
      imageUrl: post.imageUrl || ''
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    
    // Get recent posts from connections
    const recentConnectionPosts = await Post.find({ author: { $in: connectionIds } })
      .sort({ createdAt: -1 })
      .limit(15)
      .populate('author', 'name jobTitle company profileImage');
    
    const shuffledConnectionPosts = shuffleArray(recentConnectionPosts);
      

    const currentUserPosts = await Post.find({ author: userId })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('author', 'name jobTitle company profileImage');
    
    // Get Posts by other users that are not in the user's connection
    const otherPublicPosts = await Post.find({
      author: { $nin: [...connectionIds, userId] }
    })
      .sort({ createdAt: -1 })
      .populate('author', 'name jobTitle company profileImage');
    

    const combinedPosts = [...currentUserPosts, ...shuffledConnectionPosts, ...otherPublicPosts];
    
    const postsWithModifications = combinedPosts.map(post => {
      const postObj = post.toObject();
      
      const isLiked = post.likes.includes(userId);
      const likesCount = post.likes.length;
      const commentsCount = post.comments.length;
      
      return {
        ...postObj,
        likedByCurrentUser: isLiked,
        likesCount,
        commentsCount,
        likes: undefined,
        comments: undefined
      };
    });
    
    const paginatedPosts = postsWithModifications.slice(skip, skip + limit);
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

    const paginatedComments = post.comments
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(skip, skip + limit);


    const populatedComments = await Promise.all(
      paginatedComments.map(async (comment) => {
        const author = await User.findById(comment.author).select('name profileImage');
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