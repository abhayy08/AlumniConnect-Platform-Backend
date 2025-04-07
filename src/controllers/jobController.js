import mongoose from 'mongoose';
import Job from '../models/Job.js';

export const getJobsByCurrentUser = async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.userId })
      .populate('applications.applicant', 'name email')
      .sort({ createdAt: -1 });

    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const createJob = async (req, res) => {
  try {
    const {
      title, company, description, location, jobType,
      experienceLevel, minExperience, applicationDeadline,
      requiredSkills, requiredEducation, graduationYear, benefitsOffered
    } = req.body;

    const job = new Job({
      title,
      company,
      description,
      location,
      jobType,
      experienceLevel,
      minExperience,
      applicationDeadline,
      requiredSkills,
      requiredEducation,
      graduationYear,
      benefitsOffered,
      postedBy: req.userId
    });

    await job.save();
    res.status(201).json(job);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getJobs = async (req, res) => {
  try {
    const userId = req.userId;
    
    const jobs = await Job.find({
      status: 'open',
      applicationDeadline: { $gte: new Date() },
      'applications.applicant': { $ne: new mongoose.Types.ObjectId(userId) }
    })
      .populate('postedBy', 'name')
      .select('-applications')
      .sort({ createdAt: -1 });
    
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getJobsAppliedByUser = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User Id is required' });
    }

    const jobs = await Job.find({ 'applications.applicant': userId })
      .populate('postedBy', 'name email')
      .lean();

    const filteredJobs = jobs.map(job => {
      const userApplications = job.applications.filter(app => app.applicant._id.toString() === userId.toString());
      return {
        ...job,
        applications: userApplications
      };
    });

    res.status(200).json(filteredJobs);
  } catch (error) {
    console.error('Error fetching jobs applied by user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


export const getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('postedBy', 'name')
      .populate('applications.applicant', 'name ');

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const applyForJob = async (req, res) => {
  try {
    const { resumeLink } = req.body;
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if already applied
    if (job.applications.some(app => app.applicant.toString() === req.userId)) {
      return res.status(400).json({ error: 'Already applied' });
    }

    job.applications.push({
      applicant: req.userId,
      resumeLink
    });

    await job.save();
    res.json({ message: 'Application submitted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const searchJobs = async (req, res) => {
  try {
    const {
      location,
      minExperience,
      graduationYear,
      jobType,
      branch,
      degree
    } = req.query;

    const filter = { status: 'open' };

    if (location) {
      filter.location = location; // values : 'remote', 'in-office', or 'hybrid'
    }

    if (minExperience) {
      filter.minExperience = { $lte: parseInt(minExperience) };
    }

    if (graduationYear) {
      filter.graduationYear = parseInt(graduationYear);
    }

    if (jobType) {
      filter.jobType = jobType; // values: 'full-time', 'part-time', etc.
    }

    if (branch) {
      filter['requiredEducation.branch'] = branch;
    }
    
    if (degree) {
      filter['requiredEducation.degree'] = degree;
    }

    const jobs = await Job.find(filter)
      .populate('postedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateJobStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to update this job' });
    }

    job.status = status;
    await job.save();

    res.json(job);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId, status } = req.body;
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if the request is from the job poster
    if (job.postedBy.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to update applications' });
    }

    const application = job.applications.id(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    application.status = status;
    await job.save();

    res.json(job);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};