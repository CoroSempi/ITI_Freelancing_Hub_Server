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

const remoteJobSchema = new Schema({
  jobTitle: {
    type: String,
    required: true,
  },
  jobType: {
    type: String,
    required: true,
    default: "Remote monthly job",
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
  paymentInUSD: {
    type: Number,
    required: true,
  },
  paymentInEGP: {
    type: Number,
    required: true,
  },
  companytName: {
    type: String,
    required: true,
  },
  companyCountry: {
    type: String,
    required: true,
  },
  companyContact: {
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

const RemoteJob = model("Remote monthly job", remoteJobSchema);

export default RemoteJob;
