import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  description: { type: String, required: true },

  location: {
    type: String,
    required: true,
    enum: ['remote', 'in-office', 'hybrid']
  },

  jobType: {
    type: String,
    required: true,
    enum: ['full-time', 'part-time', 'contract', 'internship']
  },

  experienceLevel: {
    type: String,
    required: true,
    enum: ['entry', 'mid', 'senior']
  },
  minExperience: { type: Number, required: true }, // years
  applicationDeadline: { type: Date, required: true }, 

  requiredSkills: { type: [String], required: true },
  requiredEducation: {
    degree: { type: String, required: true }, // "Bachelors", "Masters", "PhD"
    branch: { type: String, required: true }  // "CSE", "IT", "ECE", "BBA"
  },

  graduationYear: { type: Number, required: true },

  benefitsOffered: { type: [String] },

  status: {
    type: String,
    enum: ['open', 'closed', 'filled'],
    default: 'open'
  },

  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  applications: [{
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resumeLink: { type: String },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'interviewed', 'rejected', 'accepted'],
      default: 'pending'
    },
    appliedAt: { type: String, default: Date.now }
  }]
}, { timestamps: true });

jobSchema.index({ 'location': 1 });
jobSchema.index({ 'jobType': 1 });
jobSchema.index({ 'minExperience': 1 });
jobSchema.index({ 'requiredEducation.branch': 1 });
jobSchema.index({ status: 1 });

export default mongoose.model('Job', jobSchema);