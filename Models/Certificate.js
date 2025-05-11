import { Schema, model, ObjectId } from "mongoose";

const CertificateSchema = new Schema({
  certificateId: {
    type: String,
    required: true,
  },
  Type: {
    type: String,
    required: true,
    default: "certificate",
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
  certificateDescription: {
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
  Company: {
    type: String,
    required: true,
  },
  approach: {
    type: String,
    required: true,
  },
  proofOfCertificate: {
    type: String,
    required: true,
  },
  verified: {
    type: Boolean,
    default: false,
    required: true,
  },
});

const Certificate = model("Certificate", CertificateSchema);

export default Certificate;
