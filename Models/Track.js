import { Schema, model } from "mongoose";

const trackSchema = new Schema({
  branch: {
    type: String,
    required: true,
  },
  trackName: {
    type: String,
    required: true,
  },
  numberOfStudent: {
    type: Number,
    required: true,
  },
  numberOfAchievers: {
    type: Number,
    required: true,
    default: 0,
  },
  startDate: {
    type: String,
    required: true,
  },
});

const Tracks = model("Tracks", trackSchema);

export default Tracks;
