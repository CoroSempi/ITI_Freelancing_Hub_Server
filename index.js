import express, { json, urlencoded } from "express";
import cors from "cors";
import { connect } from "mongoose";

// Conrollers
import dashboard from "./Controllers/Dashboard.js";
import client from "./Controllers/Students.js";

const app = express();

// Middleware for parsing JSON
app.use(json());
app.use(urlencoded({ extended: true }));
app.use(cors({ origin: "*" }));

// Routes
app.use("/dashboard", dashboard);
app.use("/students", client);
let port = process.env.PORT || 3000;

run();

// Start server
app.listen(port, () => {
  console.log(`SERVER RUN ON PORT ${port}`);
});

// MongoDB connection
async function run() {
  try {
    await connect(
      `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@iti.fbxvxg7.mongodb.net/ITI_Freelancing_Hub`
    );
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
  }
}

// Root route
app.get("/", (req, res) => {
  res.status(200).send("ITI Freelancing Hub's Server");
});
