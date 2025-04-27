import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    graduationYear: { type: Number, required: true },
    currentJob: { type: String },

    // Additional alumni details
    bio: { type: String },
    location: { type: String },
    company: { type: String },
    jobTitle: { type: String },
    linkedInProfile: { type: String },
    skills: [{ type: String }],
    achievements: [{ type: String }],
    interests: [{ type: String }],

    // Academic details
    university: { type: String, required: true },
    degree: { type: String, required: true },
    major: { type: String, required: true },
    minor: { type: String },

    // Professional experience
    workExperience: [{
        company: { type: String, required: true },
        position: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date },
        description: { type: String }
    }],

    // Profile image fields
    profileImage: { 
        type: String, 
        default: "" 
    },

    // Store Cloudinary public_id for easier image management
    profileImageId: {
        type: String,
        default: ""
    },

    // Networking - direct connections only, no requests
    connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Privacy settings
    privacySettings: {
        showEmail: { type: Boolean, default: false },
        showPhone: { type: Boolean, default: false },
        showLocation: { type: Boolean, default: true },
    },

    isVerifiedUser: { type: Boolean, default: false }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

export default mongoose.model('User', userSchema);