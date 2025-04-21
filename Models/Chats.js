import { Schema, model, ObjectId } from "mongoose";

const messageSchema = new Schema({
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
  received: {
    type: Boolean,
    required: true,
  },
  seen: {
    type: Boolean,
    required: true,
    default: false,
  },
});

const chatSchema = new Schema({
  fullName: {
    type: String,
    required: true,
  },
  studentID: {
    type: ObjectId,
    required: true,
    ref: "Students",
  },
  branch: {
    type: String,
    required: true,
  },
  ChatRoom: {
    type: [messageSchema],
    default: [],
  },
});

const Chats = model("Chats", chatSchema);

export default Chats;
