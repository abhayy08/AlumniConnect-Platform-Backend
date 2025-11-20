import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../src/models/User.js";
import Post from "../src/models/Post.js";
import Job from "../src/models/Job.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Please set MONGODB_URI in environment or .env file");
  process.exit(1);
}

const users = [
  {
    email: "alice@example.com",
    password: "Password123!",
    name: "Alice Example",
    graduationYear: 2020,
    currentJob: "Software Engineer",
    major: "Computer Science",
    degree: "BSc",
    university: "Example University",
  },
  {
    email: "bob@example.com",
    password: "Password123!",
    name: "Bob Example",
    graduationYear: 2018,
    currentJob: "Product Manager",
    major: "Business",
    degree: "BBA",
    university: "Example University",
  },
  {
    email: "carol@example.com",
    password: "Password123!",
    name: "Carol Example",
    graduationYear: 2019,
    currentJob: "Data Scientist",
    major: "Statistics",
    degree: "MSc",
    university: "Example University",
  },
  {
    email: "dave@example.com",
    password: "Password123!",
    name: "Dave Example",
    graduationYear: 2017,
    currentJob: "DevOps Engineer",
    major: "Computer Science",
    degree: "BSc",
    university: "Example University",
  },
  {
    email: "eve@example.com",
    password: "Password123!",
    name: "Eve Example",
    graduationYear: 2021,
    currentJob: "UI/UX Designer",
    major: "Design",
    degree: "BDes",
    university: "Example University",
  },
  {
    email: "frank@example.com",
    password: "Password123!",
    name: "Frank Example",
    graduationYear: 2015,
    currentJob: "CTO",
    major: "Electronics",
    degree: "MEng",
    university: "Example University",
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: process.env.MONGODB_DB });
    console.log("Connected to MongoDB for seeding");

    for (const u of users) {
      const exists = await User.findOne({ email: u.email }).lean();
      if (exists) {
        console.log(`Skipping existing user: ${u.email}`);
        continue;
      }

      const hashed = await bcrypt.hash(u.password, 10);
      const userDoc = new User({
        email: u.email,
        password: hashed,
        name: u.name,
        graduationYear: u.graduationYear,
        currentJob: u.currentJob,
        major: u.major,
        degree: u.degree,
        university: u.university,
      });
      await userDoc.save();
      console.log(`Inserted user: ${u.email}`);
    }

    console.log("Seeding complete");

    // Refresh users map for associations
    const allUsers = await User.find({ email: { $in: users.map(u => u.email) } });
    const byEmail = {};
    allUsers.forEach(usr => (byEmail[usr.email] = usr));

    // A small pool of dog images (public URLs) to add to posts as `imageUrl`.
    // These are from dog.ceo (publicly available sample images).
    const dogImages = [
      "https://images.dog.ceo/breeds/hound-afghan/n02088094_1003.jpg",
      "https://images.dog.ceo/breeds/terrier-border/n02093754_1856.jpg",
      "https://images.dog.ceo/breeds/labrador/n02099712_5648.jpg",
      "https://images.dog.ceo/breeds/retriever-golden/n02099601_4009.jpg",
      "https://images.dog.ceo/breeds/puggle/IMG_0696.jpg",
      "https://images.dog.ceo/breeds/terrier-norwich/n02094258_3644.jpg",
    ];

    const getRandomDogImage = () => dogImages[Math.floor(Math.random() * dogImages.length)];

    // Create sample posts
    const samplePosts = [
      {
        content: "Excited to share that I started a new role at ExampleCorp!",
        imageUrl: getRandomDogImage(),
        authorEmail: "alice@example.com",
        likesFrom: ["bob@example.com", "dave@example.com"],
        comments: [{ comment: "Congrats!", authorEmail: "bob@example.com" }],
      },
      {
        content: "Looking for collaborators on an open-source data project.",
        imageUrl: getRandomDogImage(),
        authorEmail: "bob@example.com",
        likesFrom: ["alice@example.com", "carol@example.com"],
        comments: [{ comment: "I can help!", authorEmail: "carol@example.com" }],
      },
      {
        content: "Just published a blog about ML model interpretability.",
        imageUrl: getRandomDogImage(),
        authorEmail: "carol@example.com",
        likesFrom: [],
        comments: [],
      },
      {
        content: "Automating infra tasks saved us 10 hours/week.",
        imageUrl: getRandomDogImage(),
        authorEmail: "dave@example.com",
        likesFrom: ["alice@example.com"],
        comments: [{ comment: "Nice work!", authorEmail: "frank@example.com" }],
      },
      {
        content: "Design critique: new dashboard layout ready for feedback.",
        imageUrl: "",
        authorEmail: "eve@example.com",
        likesFrom: ["bob@example.com", "alice@example.com"],
        comments: [{ comment: "Looks clean", authorEmail: "frank@example.com" }],
      },
      {
        content: "Launching our new product next month — thrilled!",
        imageUrl: getRandomDogImage(),
        authorEmail: "frank@example.com",
        likesFrom: ["alice@example.com", "bob@example.com", "carol@example.com"],
        comments: [{ comment: "Congrats team!", authorEmail: "dave@example.com" }],
      },
    ];

    for (const p of samplePosts) {
      const author = byEmail[p.authorEmail];
      if (!author) {
        console.warn(`Author not found for post: ${p.authorEmail}`);
        continue;
      }

      const exists = await Post.findOne({ content: p.content, author: author._id }).lean();
      if (exists) {
        console.log(`Skipping existing post by ${p.authorEmail}`);
        continue;
      }

      const postDoc = new Post({
        content: p.content,
        imageUrl: p.imageUrl,
        author: author._id,
        likes: (p.likesFrom || []).map(e => byEmail[e]?._id).filter(Boolean),
        comments: (p.comments || []).map(c => ({ comment: c.comment, author: byEmail[c.authorEmail]?._id })),
      });
      await postDoc.save();
      console.log(`Inserted post by: ${p.authorEmail}`);
    }

    // Create sample jobs
    const sampleJobs = [
      {
        title: "Frontend Engineer",
        company: "ExampleCorp",
        description: "Work on React-based web application.",
        location: "remote",
        jobType: "full-time",
        experienceLevel: "mid",
        minExperience: 2,
        applicationDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        requiredSkills: ["JavaScript", "React", "CSS"],
        requiredEducation: [{ degree: "Bachelors", branch: "CSE" }],
        graduationYear: 2018,
        benefitsOffered: ["Health insurance", "Stock options"],
        postedByEmail: "alice@example.com",
        applications: [{ applicantEmail: "bob@example.com", resumeLink: "", status: "pending" }],
      },
      {
        title: "Data Scientist",
        company: "DataWorks",
        description: "Develop ML models and pipelines.",
        location: "hybrid",
        jobType: "full-time",
        experienceLevel: "senior",
        minExperience: 4,
        applicationDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45),
        requiredSkills: ["Python", "PyTorch", "SQL"],
        requiredEducation: [{ degree: "Masters", branch: "Statistics" }],
        graduationYear: 2016,
        benefitsOffered: ["Flexible hours", "Gym stipend"],
        postedByEmail: "carol@example.com",
        applications: [{ applicantEmail: "alice@example.com", resumeLink: "", status: "pending" }],
      },
      {
        title: "DevOps Engineer",
        company: "InfraWorks",
        description: "Build and maintain CI/CD pipelines and cloud infra.",
        location: "in-office",
        jobType: "full-time",
        experienceLevel: "mid",
        minExperience: 3,
        applicationDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
        requiredSkills: ["AWS", "Docker", "Kubernetes"],
        requiredEducation: [{ degree: "Bachelors", branch: "CSE" }],
        graduationYear: 2015,
        benefitsOffered: ["401k", "Health insurance"],
        postedByEmail: "dave@example.com",
        applications: [{ applicantEmail: "eve@example.com", resumeLink: "", status: "pending" }],
      },
      {
        title: "Product Designer",
        company: "Designify",
        description: "Design user interfaces and prototypes.",
        location: "remote",
        jobType: "contract",
        experienceLevel: "entry",
        minExperience: 0,
        applicationDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20),
        requiredSkills: ["Figma", "User Research"],
        requiredEducation: [{ degree: "Bachelors", branch: "Design" }],
        graduationYear: 2020,
        benefitsOffered: ["Flexible schedule"],
        postedByEmail: "eve@example.com",
        applications: [{ applicantEmail: "bob@example.com", resumeLink: "", status: "pending" }],
      },
      {
        title: "CTO Advisor",
        company: "StartupHub",
        description: "Advisor role for technical strategy and hiring.",
        location: "remote",
        jobType: "part-time",
        experienceLevel: "senior",
        minExperience: 8,
        applicationDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
        requiredSkills: ["Leadership", "Architecture"],
        requiredEducation: [{ degree: "Masters", branch: "Electronics" }],
        graduationYear: 2010,
        benefitsOffered: ["Equity"],
        postedByEmail: "frank@example.com",
        applications: [],
      },
    ];

    for (const j of sampleJobs) {
      const poster = byEmail[j.postedByEmail];
      if (!poster) {
        console.warn(`Poster not found for job: ${j.postedByEmail}`);
        continue;
      }

      const existsJob = await Job.findOne({ title: j.title, company: j.company }).lean();
      if (existsJob) {
        console.log(`Skipping existing job: ${j.title} at ${j.company}`);
        continue;
      }

      const jobDoc = new Job({
        title: j.title,
        company: j.company,
        description: j.description,
        location: j.location,
        jobType: j.jobType,
        experienceLevel: j.experienceLevel,
        minExperience: j.minExperience,
        applicationDeadline: j.applicationDeadline,
        requiredSkills: j.requiredSkills,
        requiredEducation: j.requiredEducation,
        graduationYear: j.graduationYear,
        benefitsOffered: j.benefitsOffered,
        postedBy: poster._id,
        applications: (j.applications || []).map(a => ({ applicant: byEmail[a.applicantEmail]?._id, resumeLink: a.resumeLink, status: a.status })),
      });
      await jobDoc.save();
      console.log(`Inserted job: ${j.title} at ${j.company}`);
    }
  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
