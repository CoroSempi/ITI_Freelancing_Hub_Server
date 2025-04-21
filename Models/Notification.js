import { Schema, model, ObjectId } from "mongoose";

const notificationSchema = new Schema({
  type: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  seen: {
    type: Boolean,
    default: false,
    required: true,
  },
});

const studentNotificationsSchema = new Schema({
  studentID: {
    type: ObjectId,
    required: true,
    ref: "Students",
  },
  notifications: {
    type: [notificationSchema],
    default: [],
    required: true,
  },
});

const Notifications = model("Notifications", studentNotificationsSchema);

export default Notifications;
