import { Schema, model, ObjectId } from "mongoose";

const commentSchema = new Schema({
  content: {
    type: String,
    required: true,
  },
  rate: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

const memberSchema = new Schema({
  studentID: {
    type: ObjectId,
    required: true,
    ref: "Students",
  },
  studentName: {
    type: String,
    required: true,
  },
  studentShare: {
    type: Number,
    required: true,
  },
});

const platformJobSchema = new Schema({
  jobTitle: {
    type: String,
    required: true,
  },
  jobType: {
    type: String,
    required: true,
    default: "Freelancing job on platform",
  },
  uploadedBy: {
    type: ObjectId,
    required: true,
    ref: "Students",
  },
  studentName: {
    type: String,
    required: true,
  },
  branch: {
    type: String,
    required: true,
  },
  jobDescription: {
    type: String,
    required: true,
  },
  startDate: {
    type: String,
    required: true,
  },
  endDate: {
    type: String,
    required: true,
  },
  costInUSD: {
    type: Number,
    required: true,
  },
  costInEGP: {
    type: Number,
    required: true,
  },
  studentShare: {
    type: Number,
    required: true,
  },
  teamMembers: {
    type: [memberSchema],
    default: [],
    required: true,
  },
  studentProfile: {
    type: String,
    required: true,
  },
  clientName: {
    type: String,
    required: true,
  },
  clientCountry: {
    type: String,
    required: true,
  },
  platform: {
    type: String,
    required: true,
  },
  clientProfile: {
    type: String,
    required: true,
  },
  proofOfWork: {
    type: String,
    required: true,
  },
  verified: {
    type: Boolean,
    default: false,
    required: true,
  },
  comments: {
    type: [commentSchema],
    default: [],
    required: true,
  },
});

const PlatformJob = model("Freelancing job on platform", platformJobSchema);

export default PlatformJob;
