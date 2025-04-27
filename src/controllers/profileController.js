import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';
import { bufferToStream } from '../utils/helperFunctions.js';

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDetailedProfile = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const userId = req.params.userId || currentUserId;

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const connectionCount = user.connections.length;

    const isConnected = user.connections.some(
      connectionId => connectionId.toString() === currentUserId
    );

    const userObj = user.toObject();

    // Replace connections with connectionCount and isConnected
    userObj.connectionCount = connectionCount;
    userObj.isConnected = isConnected;
    delete userObj.connections;

    res.json(userObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.profileImageId) {
      try {
        await cloudinary.uploader.destroy(user.profileImageId);
      } catch (err) {
        console.error('Failed to delete previous image:', err);
      }
    }
    
    const folderPath = `alumni_network/profile_images/${req.userId}`;
    
    // Upload new image to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folderPath,
          resource_type: 'image',
          transformation: [
            { width: 400, height: 400, crop: 'limit' },
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

    user.profileImage = result.secure_url;
    user.profileImageId = result.public_id;
    await user.save();

    res.json({
      message: 'Profile image uploaded successfully',
      profileImage: user.profileImage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const removeProfileImage = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete image from Cloudinary if it exists
    if (user.profileImageId) {
      try {
        await cloudinary.uploader.destroy(user.profileImageId);
      } catch (err) {
        console.error('Failed to delete image from Cloudinary:', err);
        // Continue with profile update even if Cloudinary deletion fails
      }
    }

    // Reset profile image to default
    user.profileImage = 'https://res.cloudinary.com/demo/image/upload/v1/sample/default-profile';
    user.profileImageId = '';
    await user.save();

    res.json({
      message: 'Profile image removed successfully',
      profileImage: user.profileImage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    // Find the current user
    const currentUser = await User.findById(req.userId).select('-password').populate('connections', 'name jobTitle company');
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const allowedFields = [
      'name', 'graduationYear', 'currentJob',
      'bio', 'location', 'company', 'jobTitle', 'linkedInProfile',
      'university', 'degree', 'major', 'minor',
      'skills', 'achievements', 'interests',
      'privacySettings'
    ];

    const updates = {};

    // Filter only valid fields from request body
    for (const field of allowedFields) {
      const value = req.body[field];

      // Skip empty values
      if (value === undefined || value === null || value === '') {
        continue;
      }

      // For arrays, only include non-empty arrays
      if (Array.isArray(value) && value.length === 0) {
        continue;
      }

      // For objects (like privacySettings), only include non-empty objects
      if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
        continue;
      }

      updates[field] = value;
    }

    // If no valid updates, return current user
    if (Object.keys(updates).length === 0) {
      return res.json({ user: updatedUser });
    }

    // Update user with valid fields
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password').populate('connections', 'name jobTitle company');

    return res.json({ user: updatedUser });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateWorkExperienceById = async (req, res) => {
  try {
    const workExperienceId = req.params.experienceId;
    const updatedWorkExperience = req.body;

    const user = await User.findById(req.userId)
      .select('-password')
      .populate('connections', 'name jobTitle company');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const workExperienceIndex = user.workExperience.findIndex(exp => exp._id.toString() === workExperienceId);
    if (workExperienceIndex === -1) {
      return res.status(404).json({ error: 'Work experience not found' });
    }

    user.workExperience[workExperienceIndex] = {
      ...user.workExperience[workExperienceIndex].toObject(),
      ...updatedWorkExperience
    };

    await user.save();
    res.status(200).json({ message: 'Work experience updated successfully', user: user });
  } catch (error) {
    res.status(500).json({ error: 'Server error', error: error.message });
  }
};


export const addWorkExperience = async (req, res) => {
  try {
    const userId = req.userId;
    const newWorkExperience = req.body;

    const user = await User.findById(userId)
      .select('-password')
      .populate('connections', 'name jobTitle company');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.workExperience.push(newWorkExperience);
    await user.save();

    res.status(201).json({ message: 'Work experience added successfully', user: user });
  } catch (error) {
    res.status(500).json({ error: 'Server error', error: error.message });
  }
};

export const deleteExperienceById = async (req, res) => {
  try {
    const userId = req.userId;
    const workExperienceId = req.params.id;

    const user = await User.findById(userId)
      .select('-password')
      .populate('connections', 'name jobTitle company');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const experienceIndex = user.workExperience.findIndex(
      exp => exp._id.toString() === workExperienceId
    );

    if (experienceIndex === -1) {
      return res.status(404).json({ error: 'Work experience not found' });
    }

    user.workExperience.splice(experienceIndex, 1);

    await user.save();

    res.json({ message: 'Work experience deleted successfully', user: user });

  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

export const searchAlumni = async (req, res) => {
  try {
    const {
      name,
      graduationYear,
      major,
      company,
      jobTitle,
      skills,
      university,
      location
    } = req.query;

    const query = {};

    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }
    if (graduationYear) {
      query.graduationYear = graduationYear;
    }
    if (major) {
      query.major = { $regex: major, $options: 'i' };
    }
    if (company) {
      query.company = { $regex: company, $options: 'i' };
    }
    if (jobTitle) {
      query.jobTitle = { $regex: jobTitle, $options: 'i' };
    }
    if (skills) {
      query.skills = { $in: [new RegExp(skills, 'i')] };
    }
    if (university) {
      query.university = { $regex: university, $options: 'i' };
    }
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    const alumni = await User.find(query)
      .select('-password -connections')
      .limit(20);

    res.json(alumni);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addConnection = async (req, res) => {
  try {
    const { connectionId } = req.params;
    // Validate connectionId
    if (!connectionId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }
    // Check if users exist
    const [currentUser, targetUser] = await Promise.all([
      User.findById(req.userId),
      User.findById(connectionId)
    ]);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Check if already connected
    if (currentUser.connections.includes(connectionId)) {
      return res.status(400).json({ error: 'Already connected' });
    }
    if (req.userId === connectionId) {
      return res.status(400).json({ error: 'Cannot connect to yourself' });
    }
    // Add connection for both users (mutual connection)
    currentUser.connections.push(connectionId);
    targetUser.connections.push(req.userId);
    await Promise.all([
      currentUser.save(),
      targetUser.save()
    ]);
    res.json({ message: 'Connection established successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const removeConnection = async (req, res) => {
  try {
    const { connectionId } = req.params;

    const [currentUser, targetUser] = await Promise.all([
      User.findById(req.userId),
      User.findById(connectionId)
    ]);

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!targetUser) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Remove from both users' connections
    currentUser.connections = currentUser.connections.filter(
      id => id.toString() !== connectionId
    );

    targetUser.connections = targetUser.connections.filter(
      id => id.toString() !== req.userId
    );

    await Promise.all([
      currentUser.save(),
      targetUser.save()
    ]);

    res.json({ message: 'Connection removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getConnections = async (req, res) => {
  try {
    const userId = req.params.id || req.userId;

    const user = await User.findById(userId)
      .populate('connections', 'name email jobTitle company location')
      .select('connections');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const filteredConnections = user.connections.filter(
      connection => connection._id.toString() !== req.userId
    );

    res.json(filteredConnections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getSuggestedConnections = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find alumni with similar background or field
    const suggestions = await User.find({
      _id: { $ne: req.userId, $nin: user.connections },
      $or: [
        { major: user.major },
        { graduationYear: user.graduationYear },
        { company: user.company },
        { university: user.university }
      ]
    })
      .select('name jobTitle company major graduationYear')
      .limit(10);

    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};