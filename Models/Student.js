import { Schema, model, ObjectId } from "mongoose";

const studentJobSchema = new Schema({
  jobID: {
    type: ObjectId,
    required: true,
  },
  type: {
    type: String,
    required: true,
    trim: true,
  },
  verified: {
    type: Boolean,
    default: false,
    required: true,
  },
  costInUSD: {
    type: Number,
    required: true,
  },
});

const studentCertificateSchema = new Schema({
  certificateID: {
    type: ObjectId,
    required: true,
  },
  verified: {
    type: Boolean,
    default: false,
    required: true,
  },
});

const studentSchema = new Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  branch: {
    type: String,
    required: true,
    trim: true,
  },
  avatar: {
    default: null,
    type: String,
  },
  personalID: {
    type: String,
    required: true,
    unique: true,
  },
  university: {
    type: String,
    required: true,
    trim: true,
  },
  faculty: {
    type: String,
    required: true,
    trim: true,
  },
  trackID: {
    type: ObjectId,
    required: true,
    ref: "Tracks",
  },
  trackName: {
    type: String,
    required: true,
  },
  graduationYear: {
    type: Number,
    required: true,
  },
  graduationGrade: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    default: 12345678,
  },
  verificationCode: {
    default: 111111,
    type: Number,
  },
  gender: {
    type: String,
    required: true,
    trim: true,
  },
  governorate: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  target: {
    type: Boolean,
    default: false,
    required: true,
  },
  jobs: {
    type: [studentJobSchema],
    default: [],
    required: true,
  },
  certificates: {
    type: [studentCertificateSchema],
    default: [],
    required: true,
  },
});

const Students = model("Students", studentSchema);
export default Students;
