import { Schema, model } from "mongoose";

const adminSchema = new Schema({
  fullName: {
    type: String,
    required: true,
  },
  branch: {
    type: String,
    required: true,
  },
  Avatar: {
    default: null,
    type: String,
  },
  phone: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  verificationCode: {
    default: 111111,
    type: Number,
  },
});

const Admins = model("Admins", adminSchema);

export default Admins;
