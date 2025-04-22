import mongoose from 'mongoose';
import Job from '../models/Job.js';

export const getJobsByCurrentUser = async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.userId })
      .populate('applications.applicant', 'name email')
      .populate('postedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(jobs);
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
    res.status(201).json({ message: "New job created successfully" });
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
      'applications.applicant': { $ne: new mongoose.Types.ObjectId(userId) },
      'postedBy': { $ne: new mongoose.Types.ObjectId(userId) }
    })
      .populate('postedBy', 'name')
      .select('-applications')
      .sort({ createdAt: -1 });

    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getOfferedJobs = async (req, res) => {
  try {
    const userId = req.userId;
    const offeredJobs = await Job.find({
      applications: {
        $elemMatch: {
          applicant: userId,
          status: 'accepted'
        }
      }
    })
      .populate('postedBy', 'name email')
      .lean();
    const filteredJobs = offeredJobs.map(job => {
      const userApplications = job.applications.filter(app => app.applicant._id.toString() === userId.toString());
      return {
        ...job,
        applications: userApplications
      };
    });

    return res.status(200).json(filteredJobs);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

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
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};

export const getJobsByUserId = async (req, res) => {
  try {

    const userIdToFindFor = req.params.id;

    const jobs = await Job.find({
      postedBy: { $eq: new mongoose.Types.ObjectId(userIdToFindFor) }
    })
      .sort({ createdAt: -1 })
      .populate('postedBy', 'name email')
      .select('-applications')
      .lean();

    res.status(200).json(jobs)
  } catch (error) {
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}

export const getApplicantsOfJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.userId;

    const job = await Job.findById(jobId)
      .populate({
        path: 'applications.applicant',
        select: '_id name email'
      });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.postedBy.toString() !== userId.toString()) {
      return res.status(403).json({
        error: 'Unauthorized: You can only view applicants for jobs you posted'
      });
    }

    const applicants = job.applications.map(application => ({
      _userId: application.applicant._id,
      name: application.applicant.name,
      email: application.applicant.email,
      _applicationId: application._id,
      status: application.status,
      appliedAt: application.appliedAt,
      resumeLink: application.resumeLink
    }));

    return res.status(200).json(applicants);
  } catch (error) {
    console.error('Error fetching jobs applied by user:', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}

export const getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('postedBy', 'name')
      .populate({
        path: 'applications.applicant',
        select: 'name email'
      });

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
      title,
      location,
      minExperience,
      graduationYear,
      jobType,
      branch,
      degree
    } = req.query;

    const currentUserId = req.userId;

    const filter = { status: 'open' };

    if (title) {
      filter.title = { $regex: title, $options: 'i' };
    }

    if (location) {
      filter.location = location; // values : 'remote', 'in-office', or 'hybrid'
    }

    if (minExperience) {
      filter.minExperience = { $lte: parseInt(minExperience) };
    }

    if (graduationYear) {
      filter.graduationYear = { $gte: parseInt(graduationYear) };
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

    const jobsWithApplicationStatus = jobs.map(job => {
      const jobObj = job.toObject();

      const alreadyApplied = currentUserId ?
        jobObj.applications.some(app =>
          app.applicant.toString() === currentUserId.toString()
        ) : false;

      jobObj.alreadyApplied = alreadyApplied;
      delete jobObj.applications;

      return jobObj;
    });

    res.json(jobsWithApplicationStatus);
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

    if (job.postedBy.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to update applications' });
    }

    const application = job.applications.id(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    application.status = status;
    await job.save();

    res.json({ message: 'Application status updated successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};