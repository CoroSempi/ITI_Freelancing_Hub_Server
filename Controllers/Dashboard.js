import { Router, json, urlencoded } from "express";
import jwt from "jsonwebtoken";
import { compare, hash } from "bcrypt";
import { config } from "dotenv";
import multer from "multer";
import { ObjectId } from "mongodb";

config();

//Middlewares
import setHeadersMiddleware from "../Middlewares/Headers.js";
import TokenMiddleware from "../Middlewares/Tokens.js";
import sendEmail from "../Middlewares/emailVerification .js";
import sendNotification from "../Middlewares/Notification.js";
import handleExcelSheet from "../Middlewares/excelSheet.js";
import toBase64 from "../Middlewares/Base64.js";
import jobApprovedEmail from "../Middlewares/jobApprovedEmail.js";

// Set up multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

//Models
import Admins from "../Models/Admin.js";
import Tracks from "../Models/Track.js";
import Students from "../Models/Student.js";
import Notifications from "../Models/Notification.js";
import Chats from "../Models/Chats.js";
import DirectJob from "../Models/DirectJob.js";
import RemoteJob from "../Models/RemoteJob.js";
import PlatformJob from "../Models/PlatformJob.js";
import Certificate from "../Models/Certificate.js";
import sendMessage from "../Middlewares/messageEmail.js";

const dashboard = Router();

dashboard.use(json());
dashboard.use(urlencoded({ extended: true }));
dashboard.use(setHeadersMiddleware);

// Dashboard Sign In
dashboard.post("/signIn", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please enter both email and password" });
    }

    const admin = await Admins.findOne({ email });
    if (admin) {
      const isMatch = await compare(password, admin.password);
      if (isMatch) {
        // Generate token
        const token = jwt.sign(
          {
            name: admin.fullName,
            id: admin._id,
            branch: admin.branch,
            role: "admin",
          },
          process.env.TOKEN_ACCESS,
          { expiresIn: "12h" }
        );
        return res.status(200).json({
          AccessToken: token,
          adminData: {
            fullName: admin.fullName,
            branch: admin.branch,
            Avatar: admin.Avatar,
          },
        });
      } else {
        return res.status(401).json({ message: "Invalid password" });
      }
    } else {
      return res.status(404).json({ message: "Admin not found" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred while fetching data" });
  }
});

// Client Check Token
dashboard.get("/checkToken", TokenMiddleware, async (req, res) => {
  try {
    res.status(200).json({ message: "Token is valid" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred while fetching data" });
  }
});

// Dashboard Forget Password
dashboard.post("/forgetPassword", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "All fields are required." });
    }
    const admin = await Admins.findOne({ email: email });
    if (!admin) {
      return res.status(409).json({ message: "Admin not found." });
    }

    admin.verificationCode = Math.floor(100000 + Math.random() * 900000);
    await admin.save().then(() => {
      sendEmail(
        admin.fullName.split(" ")[0] + " " + admin.fullName.split(" ")[1],
        admin.email,
        admin.verificationCode
      ).then(() => {
        return res.status(200).json({ message: "Email sent successfully" });
      });
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Dashboard Verfiy Code
dashboard.post("/verifyCode", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: "All fields are required." });
    }
    const admin = await Admins.findOne({ email: email });
    if (!admin) {
      return res.status(409).json({ message: "Admin not found." });
    } else {
      if (admin.verificationCode == code) {
        // Generate token
        const token = jwt.sign(
          {
            name: admin.fullName,
            id: admin._id,
            branch: admin.branch,
            role: "admin",
          },
          process.env.TOKEN_ACCESS,
          { expiresIn: "12h" }
        );
        return res.status(200).json({
          AccessToken: token,
        });
      } else {
        return res.status(400).json({ message: "Invalid code." });
      }
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Dashboard Reset password
dashboard.post("/resetPassword", TokenMiddleware, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const { id } = req.user;
    const admin = await Admins.findOne({ _id: id });
    if (!admin) {
      return res.status(409).json({ message: "Admin not found." });
    } else {
      const hashedPassword = await hash(newPassword, 10);
      admin.password = hashedPassword;
      await admin.save();
      return res
        .status(200)
        .json({ message: "Password updated successfully." });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Dashboard Change password
dashboard.patch("/changePassword", TokenMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id } = req.user;
    const admin = await Admins.findById(id);

    if (admin) {
      const isMatch = await compare(currentPassword, admin.password);
      if (isMatch) {
        const hashPassword = await hash(newPassword, 10);
        admin.password = hashPassword;
        admin.save();
        return res
          .status(200)
          .json({ message: "password changed successfully" });
      } else {
        return res.status(401).json({ message: "Invalid password" });
      }
    } else {
      return res.status(404).json({ message: "Admin not found" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Dashboard Change Avatar
dashboard.patch(
  "/changeAvatar",
  TokenMiddleware,
  upload.single("avatar"),
  async (req, res) => {
    try {
      const { id } = req.user;
      const avatar = req.file;

      if (!avatar) {
        return res.status(400).json({ message: "All fields are required" });
      }
      const admin = await Admins.findById(id);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }
      const avatar64 = await toBase64(avatar);
      admin.Avatar = avatar64;
      admin.save();
      return res
        .status(200)
        .json({ message: "Avatar changed successfully", Avatar: avatar64 });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "An error occurred: " + error.message });
    }
  }
);

// Dashboard Round Analytics
dashboard.get("/roundAnalytics", TokenMiddleware, async (req, res) => {
  try {
    const { branch } = req.user;

    const numberOfTracks = (await Tracks.find({ branch })).length;
    const numberOfStudents = (await Students.find({ branch })).length;
    const numberOfJobs =
      (await DirectJob.find({ branch })).length +
      (await RemoteJob.find({ branch })).length +
      (await PlatformJob.find({ branch })).length;
    const numberOfTargetAchievers = (
      await Students.find({ branch, target: true })
    ).length;

    const direct = await DirectJob.find({ branch, verified: true });
    const plat = await PlatformJob.find({ branch, verified: true });
    const remote = await RemoteJob.find({ branch, verified: true });

    const numberOfApprovedJobs = direct.length + plat.length + remote.length;
    let totalProfit = 0;
    [...direct, ...plat, ...remote].forEach((job) => {
      totalProfit =
        Number(totalProfit) + Number(job.costInUSD || job.paymentInUSD);
    });
    return res.status(200).json({
      numberOfTracks,
      numberOfStudents,
      numberOfJobs,
      numberOfTargetAchievers,
      numberOfApprovedJobs,
      totalProfit,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Dashboard Add Track
dashboard.post(
  "/addTrack",
  TokenMiddleware,
  upload.single("sheet"),
  async (req, res) => {
    try {
      const { trackName, startDate } = req.body;
      const { branch } = req.user;
      const sheet = req.file;

      if (!trackName || !sheet || !startDate) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (
        !sheet.mimetype.includes("excel") &&
        !sheet.mimetype.includes("spreadsheet")
      ) {
        return res.status(400).json({ message: "Please upload an Excel file" });
      }

      const existingTrack = await Tracks.findOne({ trackName, branch });
      if (existingTrack) {
        return res.status(400).json({ message: "Track already exists" });
      }

      let trackData = await handleExcelSheet(sheet.buffer);
      trackData = trackData.filter((std) => std.university && true);
      trackData = trackData.map(({ "#": _, ...rest }) => rest);

      const hashed = await hash("12345678", 10);
      const tempTrackId = new ObjectId();
      const previewData = [];

      console.log(tempTrackId);

      for (const std of trackData) {
        const studentDoc = new Students({
          ...std,
          branch,
          password: hashed,
          trackName,
          trackID: tempTrackId,
        });

        const validationError = studentDoc.validateSync();
        if (validationError) {
          return res.status(400).json({
            message: "Student schema validation failed",
            errors: validationError.errors,
            student: std,
          });
        }

        previewData.push(studentDoc.toObject());
      }

      const newTrack = await Tracks.insertOne({
        branch,
        numberOfStudent: previewData.length,
        trackName,
        startDate,
      });

      const studentsWithTrack = previewData.map((std) => ({
        ...std,
        trackID: newTrack._id,
      }));

      const students = await Students.insertMany(studentsWithTrack);

      const notificationAndChatTasks = students.map((std) =>
        Promise.all([
          Notifications.insertOne({ studentID: std._id }),
          Chats.insertOne({
            studentID: std._id,
            branch: std.branch,
            fullName: std.fullName,
            track: std.trackName,
          }),
        ])
      );
      await Promise.all(notificationAndChatTasks);

      return res.status(200).json({ message: "Track added successfully." });
    } catch (error) {
      console.error("Error while adding track:", error);
      return res
        .status(500)
        .json({ message: "An error occurred: " + error.message });
    }
  }
);

// Dashboard Get All Tracks
dashboard.get("/allTracks", TokenMiddleware, async (req, res) => {
  try {
    const tracks = await Tracks.find({
      branch: { $regex: req.user.branch, $options: "i" },
    });
    if (tracks) {
      return res.status(200).json(tracks);
    } else {
      return res.status(404).json({ message: "No tracks found" });
    }
  } catch (error) {
    res.status(500).json({ message: "An error occurred: " + error.message });
  }
});

// Dashboard Get Track's Students By Id
dashboard.get("/Track/:id", async (req, res) => {
  try {
    const students = await Students.find({ trackID: req.params.id });
    if (students) {
      return res.status(200).json(students);
    } else {
      return res.status(404).json({ message: "No students found" });
    }
  } catch (error) {
    res.status(500).json({ message: "An error occurred: " + error.message });
  }
});

// Dashboard Delete Track
dashboard.delete("/Track/:id", async (req, res) => {
  try {
    const TrackID = req.params.id;
    const deletedTrack = await Tracks.findByIdAndDelete(TrackID);

    if (!deletedTrack) {
      return res.status(404).json({ message: "Track not found." });
    }

    const students = await Students.find({ trackID: TrackID });
    await Students.deleteMany({ trackID: TrackID });

    for (const std of students) {
      await Notifications.deleteOne({ studentID: std._id });
      await Chats.deleteOne({ studentID: std._id });
      await DirectJob.deleteMany({ uploadedBy: std._id });
      await PlatformJob.deleteMany({ uploadedBy: std._id });
      await RemoteJob.deleteMany({ uploadedBy: std._id });
      await Certificate.deleteMany({ uploadedBy: std._id });
    }

    return res.status(200).json({ message: "Track deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred: " + error.message });
  }
});

// Dashboard Search Users
dashboard.get("/search", TokenMiddleware, async (req, res) => {
  try {
    const keyword = req.query.keyword;
    const searchResults = await Students.find({
      fullName: { $regex: keyword, $options: "i" },
      branch: { $regex: req.user.branch, $options: "i" },
    });
    return res.status(200).json(searchResults);
  } catch (error) {
    res.status(500).json({ message: "An error occurred: " + error.message });
  }
});

// Dashboard Get User By Id
dashboard.get("/getUserByID/:id", TokenMiddleware, async (req, res) => {
  try {
    const student = await Students.findById(req.params.id);
    if (student) {
      return res.status(200).json(student);
    } else {
      return res.status(404).json({ message: "Student not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "An error occurred: " + error.message });
  }
});

// Dashboard Update User By Id
dashboard.put("/UpdateUser/:id", TokenMiddleware, async (req, res) => {
  try {
    const { id: targetUserId } = req.params;

    const student = await Students.findById(targetUserId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (student.trackName != req.body.trackName) {
      const currentTrack = await Tracks.findOne({ _id: student.trackID });
      const newTrack = await Tracks.findOne({ trackName: req.body.trackName });

      if (currentTrack && newTrack) {
        currentTrack.numberOfStudent = currentTrack.numberOfStudent - 1;
        newTrack.numberOfStudent = newTrack.numberOfStudent + 1;
        if (student.target) {
          currentTrack.numberOfAchievers = currentTrack.numberOfAchievers - 1;
          newTrack.numberOfAchievers = newTrack.numberOfAchievers + 1;
        }
        await Promise.all([currentTrack.save(), newTrack.save()]);
        await Students.updateOne(
          { _id: targetUserId },
          { $set: { trackID: newTrack._id, trackName: newTrack.trackName } }
        );
        await Chats.updateOne(
          { studentID: targetUserId },
          { $set: { track: newTrack.trackName } }
        );
      }
    }

    const allowedFields = [
      "fullName",
      "email",
      "phone",
      "personalID",
      "graduationGrade",
      "faculty",
      "university",
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update." });
    }

    const updatedStudent = await Students.findOneAndUpdate(
      { _id: targetUserId },
      { $set: updates },
      { new: true }
    );

    const syncFields = {};
    if (updates.fullName) syncFields.studentName = updates.fullName;
    if (updates.branch) syncFields.branch = updates.branch;

    const chatSync = {};
    if (updates.fullName) chatSync.fullName = updates.fullName;
    if (updates.branch) chatSync.branch = updates.branch;

    await Promise.all([
      Object.keys(chatSync).length > 0 &&
        Chats.updateMany({ studentID: targetUserId }, { $set: chatSync }),

      Object.keys(syncFields).length > 0 &&
        Certificate.updateMany(
          { uploadedBy: targetUserId },
          { $set: syncFields }
        ),

      Object.keys(syncFields).length > 0 &&
        DirectJob.updateMany(
          { uploadedBy: targetUserId },
          { $set: syncFields }
        ),
      Object.keys(syncFields).length > 0 &&
        PlatformJob.updateMany(
          { uploadedBy: targetUserId },
          { $set: syncFields }
        ),
      Object.keys(syncFields).length > 0 &&
        RemoteJob.updateMany(
          { uploadedBy: targetUserId },
          { $set: syncFields }
        ),
    ]);

    return res.status(200).json(updatedStudent);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Dashboard Broadcasting Notification
dashboard.post(
  "/broadcastingNotification",
  TokenMiddleware,
  async (req, res) => {
    try {
      const { trackName, title, content } = req.body;
      const students = await Students.find({ trackName });
      if (students.length > 0) {
        students.forEach((student) => {
          sendNotification(student.fullName, student.email, title, content);
        });
        return res.status(201).json({ message: "emails send successfully" });
      } else {
        return res.status(404).json({ message: "No students found" });
      }
    } catch (error) {
      res.status(500).json({ message: "An error occurred: " + error.message });
    }
  }
);

// Dashboard Send Notification
dashboard.post("/sendNotification", TokenMiddleware, async (req, res) => {
  try {
    const { studentsIDs, title, content } = req.body;
    const students = await Students.find({ _id: { $in: studentsIDs } });
    if (students.length > 0) {
      students.forEach((student) => {
        sendNotification(student.fullName, student.email, title, content);
      });
      return res.status(201).json({ message: "emails send successfully" });
    } else {
      return res.status(404).json({ message: "No students found" });
    }
  } catch (error) {
    res.status(500).json({ message: "An error occurred: " + error.message });
  }
});

// Dashboard Get All Chats
dashboard.get("/getChats", TokenMiddleware, async (req, res) => {
  try {
    const { branch } = req.user;
    const adminChats = await Chats.find({
      branch: { $regex: branch, $options: "i" },
    });

    if (adminChats) {
      const chats = adminChats.filter((chat) => chat.ChatRoom.length > 0);
      return res.status(200).send(chats);
    } else {
      return res.status(404).json({ message: "Chats not found." });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Dashboard Get student Chat
dashboard.get("/getChat/:id", TokenMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const studentChat = await Chats.findOne({ studentID: id });

    if (studentChat) {
      studentChat.ChatRoom = studentChat.ChatRoom.map((message) => {
        if (message.received == false) {
          message.seen = true;
        }
        return message;
      });
      studentChat.save();

      return res.status(201).send(studentChat);
    } else {
      return res.status(404).json({ message: "Chat not found." });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Dashboard Send message
dashboard.post("/sendMessage", TokenMiddleware, async (req, res) => {
  try {
    const { content, studentID } = req.body;
    const studentChat = await Chats.findOne({ studentID });
    const student = await Students.findOne({ _id: studentID });
    if (studentChat && student) {
      studentChat.ChatRoom.push({ content, received: true });
      studentChat.save();

      sendMessage(student.fullName, student.email);

      return res.status(201).send(studentChat);
    } else {
      return res.status(404).json({ message: "Chat not found" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Dashboard Get all Jobs
dashboard.get("/jobs", TokenMiddleware, async (req, res) => {
  try {
    const { branch } = req.user;
    const directJobs = await DirectJob.find({ branch });
    const remoteJobs = await RemoteJob.find({ branch });
    const platformJobs = await PlatformJob.find({ branch });
    const jobs = [...directJobs, ...remoteJobs, ...platformJobs];
    return res.status(200).send(jobs);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Dashboard Get job By ID
dashboard.get("/jobs/:jobId", TokenMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const directJob = await DirectJob.findById(jobId);
    if (directJob) {
      const std = await Students.findById(directJob.uploadedBy);
      return res.status(200).json({ directJob, avatar: std.avatar });
    }
    const platformJob = await PlatformJob.findById(jobId);
    if (platformJob) {
      const std = await Students.findById(platformJob.uploadedBy);
      return res.status(200).json({ platformJob, avatar: std.avatar });
    }
    const remoteJob = await RemoteJob.findById(jobId);
    if (remoteJob) {
      const std = await Students.findById(remoteJob.uploadedBy);
      return res.status(200).json({ remoteJob, avatar: std.avatar });
    }
    return res.status(404).json({ message: "Job not found." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Dashboard Delete job
dashboard.delete("/jobs/:jobId", TokenMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const jobObjectId = new ObjectId(jobId);

    let jobDeleted = await DirectJob.findByIdAndDelete(jobObjectId);
    if (jobDeleted) {
      await Students.updateMany(
        { "jobs.jobID": jobObjectId },
        { $pull: { jobs: { jobID: jobObjectId } } }
      );
      return res.status(200).json({ message: "Job deleted successfully." });
    }

    jobDeleted = await PlatformJob.findByIdAndDelete(jobObjectId);
    if (jobDeleted) {
      await Students.updateMany(
        { "jobs.jobID": jobObjectId },
        { $pull: { jobs: { jobID: jobObjectId } } }
      );
      return res.status(200).json({ message: "Job deleted successfully." });
    }

    jobDeleted = await RemoteJob.findByIdAndDelete(jobObjectId);
    if (jobDeleted) {
      await Students.updateMany(
        { "jobs.jobID": jobObjectId },
        { $pull: { jobs: { jobID: jobObjectId } } }
      );
      return res.status(200).json({ message: "Job deleted successfully." });
    }

    return res.status(404).json({ message: "Job not found." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Dashboard Approve job
dashboard.post("/approveJob/:jobId", TokenMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const jobObjectId = new ObjectId(jobId);

    // === 1. DIRECT JOB ===
    let job = await DirectJob.findOne({ _id: jobObjectId });
    if (job) {
      job.verified = true;
      await job.save();

      const uploader = await Students.findById(job.uploadedBy);
      if (!uploader)
        return res.status(404).json({ message: "Uploader not found." });

      if (uploader.target !== true) {
        const track = await Tracks.findById(uploader.trackID);
        console.log(track);
        if (track) {
          track.numberOfAchievers = (track.numberOfAchievers || 0) + 1;
          await track.save();
        }
      }

      await Students.updateOne(
        { _id: uploader._id, "jobs.jobID": jobObjectId },
        { $set: { "jobs.$.verified": true, target: true } }
      );

      const students = await Students.find({ "jobs.jobID": jobObjectId });

      for (const student of students) {
        if (student.target !== true) {
          const track = await Tracks.findById(student.trackID);
          if (track) {
            track.numberOfAchievers = (track.numberOfAchievers || 0) + 1;
            await track.save();
          }
        }
      }

      await Students.updateMany(
        { "jobs.jobID": jobObjectId },
        { $set: { "jobs.$.verified": true }, target: true }
      );

      let userNoti = await Notifications.findOne({ studentID: uploader._id });
      if (!userNoti) {
        userNoti = new Notifications({
          studentID: uploader._id,
          notifications: [],
        });
      }
      userNoti.notifications.push({
        content: `We are thrilled to inform you that your ${job.jobTitle} has been officially approved!`,
        type: "job",
      });
      await userNoti.save();

      jobApprovedEmail(uploader.fullName, uploader.email, job.jobTitle);
      return res
        .status(200)
        .json({ message: "Direct job verified successfully." });
    }

    // === 2. PLATFORM JOB ===
    job = await PlatformJob.findOne({ _id: jobObjectId });
    if (job) {
      job.verified = true;
      await job.save();

      const uploader = await Students.findById(job.uploadedBy);
      if (!uploader)
        return res.status(404).json({ message: "Uploader not found." });

      if (uploader.target !== true) {
        const track = await Tracks.findById(uploader.trackID);
        console.log(track);
        if (track) {
          track.numberOfAchievers = (track.numberOfAchievers || 0) + 1;
          await track.save();
        }
      }
      await Students.updateOne(
        { _id: uploader._id, "jobs.jobID": jobObjectId },
        { $set: { "jobs.$.verified": true, target: true } }
      );

      const students = await Students.find({ "jobs.jobID": jobObjectId });

      for (const student of students) {
        if (student.target !== true) {
          const track = await Tracks.findById(student.trackID);

          console.log(track);
          if (track) {
            track.numberOfAchievers = (track.numberOfAchievers || 0) + 1;
            await track.save();
          }
        }
      }

      await Students.updateMany(
        { "jobs.jobID": jobObjectId },
        { $set: { "jobs.$.verified": true }, target: true }
      );

      let userNoti = await Notifications.findOne({ studentID: uploader._id });
      if (!userNoti) {
        userNoti = new Notifications({
          studentID: uploader._id,
          notifications: [],
        });
      }
      userNoti.notifications.push({
        content: `We are thrilled to inform you that your ${job.jobTitle} has been officially approved!`,
        type: "job",
      });
      await userNoti.save();

      jobApprovedEmail(uploader.fullName, uploader.email, job.jobTitle);
      return res
        .status(200)
        .json({ message: "Platform job verified successfully." });
    }

    // === 3. REMOTE JOB ===
    job = await RemoteJob.findOne({ _id: jobObjectId });
    if (job) {
      job.verified = true;
      await job.save();

      const uploader = await Students.findById(job.uploadedBy);
      if (!uploader)
        return res.status(404).json({ message: "Uploader not found." });

      await Students.updateOne(
        { _id: uploader._id, "jobs.jobID": jobObjectId },
        { $set: { "jobs.$.verified": true, target: true } }
      );

      if (uploader.target !== true) {
        const track = await Tracks.findById(uploader.trackID);
        if (track) {
          track.numberOfAchievers = (track.numberOfAchievers || 0) + 1;
          await track.save();
        }
      }

      let userNoti = await Notifications.findOne({ studentID: uploader._id });
      if (!userNoti) {
        userNoti = new Notifications({
          studentID: uploader._id,
          notifications: [],
        });
      }
      userNoti.notifications.push({
        content: `We are thrilled to inform you that your ${job.jobTitle} has been officially approved!`,
        type: "job",
      });
      await userNoti.save();

      jobApprovedEmail(uploader.fullName, uploader.email, job.jobTitle);
      return res
        .status(200)
        .json({ message: "Remote job verified successfully." });
    }

    return res.status(404).json({ message: "Job not found." });
  } catch (error) {
    console.error("Approve job error:", error);
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Dashboard Add comment
dashboard.post("/addComment/:jobId", TokenMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { content, rate } = req.body;

    let job = await DirectJob.findById(jobId);
    if (job) {
      job.comments.push({ content, rate });
      job.save();
      return res.status(200).json({ message: "Comment added successfully." });
    }

    job = await PlatformJob.findById(jobId);
    if (job) {
      job.comments.push({ content, rate });
      job.save();
      return res.status(200).json({ message: "Comment added successfully." });
    }

    job = await RemoteJob.findById(jobId);
    if (job) {
      job.comments.push({ content, rate });
      job.save();
      return res.status(200).json({ message: "Comment added successfully." });
    }

    return res.status(404).json({ message: "Job not found." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Dashboard Delete comment
dashboard.delete("/deleteComment/:jobId", TokenMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { commentID } = req.body;

    let job = await DirectJob.findById(jobId);
    if (job) {
      job.comments = job.comments.filter((comment) => comment._id != commentID);
      await job.save();
      return res.status(200).json({ message: "Comment deleted successfully." });
    }

    job = await PlatformJob.findById(jobId);
    if (job) {
      job.comments = job.comments.filter((comment) => comment._id != commentID);
      await job.save();
      return res.status(200).json({ message: "Comment deleted successfully." });
    }

    job = await RemoteJob.findById(jobId);
    if (job) {
      job.comments = job.comments.filter((comment) => comment._id != commentID);
      await job.save();
      return res.status(200).json({ message: "Comment deleted successfully." });
    }

    return res.status(404).json({ message: "Job not found." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Dashboard Get all Certificates
dashboard.get("/certificate", TokenMiddleware, async (req, res) => {
  try {
    const { branch } = req.user;
    const Certificates = await Certificate.find({ branch });
    return res.status(200).send(Certificates);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Dashboard Get Certificate By ID
dashboard.get(
  "/certificate/:certificateId",
  TokenMiddleware,
  async (req, res) => {
    try {
      const { certificateId } = req.params;
      const certificate = await Certificate.findOne({ _id: certificateId });
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found." });
      }
      const std = await Students.findById(certificate.uploadedBy);
      return res.status(200).json({ certificate, avatar: std.avatar });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "An error occurred: " + error.message });
    }
  }
);

// Dashboard Delete Certificate
dashboard.delete(
  "/certificate/:certificateId",
  TokenMiddleware,
  async (req, res) => {
    try {
      const { certificateId } = req.params;
      const certificateObjectId = new ObjectId(certificateId);

      let certificateDeleted = await Certificate.findByIdAndDelete(
        certificateObjectId
      );

      if (certificateDeleted) {
        await Students.updateOne(
          { "certificates.certificateID": certificateObjectId },
          { $pull: { certificates: { certificateID: certificateObjectId } } }
        );
        return res
          .status(200)
          .json({ message: "certificate deleted successfully." });
      }

      return res.status(404).json({ message: "certificate not found." });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "An error occurred: " + error.message });
    }
  }
);

// Dashboard Approve Certificate
dashboard.post(
  "/certificate/:certificateId",
  TokenMiddleware,
  async (req, res) => {
    try {
      const { certificateId } = req.params;
      const certificateObjectId = new ObjectId(certificateId);

      let certificate = await Certificate.findOne(certificateObjectId);
      if (certificate) {
        certificate.verified = true;
        await certificate.save();
        const std = await Students.findById(certificate.uploadedBy);

        if (std.target != true) {
          const track = await Tracks.findById(std.trackID);
          track.numberOfAchievers = track.numberOfAchievers + 1;
          track.save();
        }

        await Students.updateOne(
          { "certificates.certificateID": certificateObjectId },
          { $set: { "certificates.$.verified": true }, target: true }
        );
        const userNoti = await Notifications.findOne({ studentID: std._id });
        userNoti.notifications.push({
          content: `We are thrilled to inform you that your ${certificate.Company}'s certificate has been officially approved! Your efforts and commitment have not gone unnoticed, Celebrate this achievement!`,
          type: "job",
        });
        await userNoti.save();
        jobApprovedEmail(
          std.fullName,
          std.email,
          `${certificate.Company}'s certificate`
        );
        return res
          .status(200)
          .json({ message: "certificate verified successfully." });
      }

      return res.status(404).json({ message: "Job not found." });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "An error occurred: " + error.message });
    }
  }
);

//Report Data
dashboard.get("/reportData", TokenMiddleware, async (req, res) => {
  try {
    const branches = [];
    const rounds = [];
    const tracks = [];
    const admins = await Admins.find({});
    const trackss = await Tracks.find({});

    admins.forEach((admin) => {
      if (!branches.includes(admin.branch)) {
        branches.push(admin.branch);
      }
    });

    trackss.forEach((track) => {
      if (!rounds.includes(track.startDate)) {
        rounds.push(track.startDate);
      }
      if (!tracks.includes(track.trackName)) {
        tracks.push(track.trackName);
      }
    });

    res.status(200).json({
      branches,
      rounds,
      tracks,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

//status Report
dashboard.get(
  "/statusReport/:branch/:round/:trackName",
  TokenMiddleware,
  async (req, res) => {
    try {
      const { branch, round, trackName } = req.params;

      const track = await Tracks.findOne({
        branch,
        startDate: round,
        trackName,
      });
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }

      const students = await Students.find({ trackID: track._id });

      let totalJobsArr = [];
      students.forEach((std) => {
        if (Array.isArray(std.jobs)) {
          totalJobsArr = totalJobsArr.concat(std.jobs);
        }
      });

      let direct = 0;
      let platform = 0;
      let remote = 0;
      let verifiedJobs = 0;
      let totalprofit = 0;

      const countedTypeJobIDs = new Set();

      totalJobsArr.forEach((job) => {
        const jobIDStr = job.jobID?.toString() || job._id?.toString();

        if (jobIDStr && !countedTypeJobIDs.has(jobIDStr)) {
          countedTypeJobIDs.add(jobIDStr);

          if (job.type === "Freelancing job with direct contact") direct++;
          else if (job.type === "Freelancing job on platform") platform++;
          else if (job.type === "Remote monthly job") remote++;
        }

        if (job.verified === true) {
          verifiedJobs++;
          totalprofit += job.costInUSD || 0;
        }
      });

      const totalJobs = countedTypeJobIDs.size;

      return res.status(200).json({
        totalStudents: track.numberOfStudent,
        totalAchievers: track.numberOfAchievers,
        percentage:
          (
            (track.numberOfAchievers / track.numberOfStudent) * 100 || 0
          ).toFixed(2) + "%",
        totalJobs,
        verifiedJobs,
        direct: totalJobs ? ((direct / totalJobs) * 100).toFixed(2) : "0.00",
        platform: totalJobs
          ? ((platform / totalJobs) * 100).toFixed(2)
          : "0.00",
        remote: totalJobs ? ((remote / totalJobs) * 100).toFixed(2) : "0.00",
        totalprofit,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "An error occurred: " + error.message });
    }
  }
);

//final Report
dashboard.get(
  "/finalReport/:branch/:round",
  TokenMiddleware,
  async (req, res) => {
    try {
      const { branch, round } = req.params;

      const tracks = await Tracks.find({ branch, startDate: round });
      if (!tracks.length) {
        return res.status(404).json({ message: "No tracks found" });
      }

      const finalReport = [];

      for (const track of tracks) {
        const students = await Students.find({ trackID: track._id });

        let totalJobsArr = [];
        students.forEach((std) => {
          if (Array.isArray(std.jobs)) {
            totalJobsArr = totalJobsArr.concat(std.jobs);
          }
        });

        let direct = 0;
        let platform = 0;
        let remote = 0;
        let verifiedJobs = 0;
        let totalprofit = 0;

        const countedJobIDs = new Set();
        const countedVerifiedJobIDs = new Set();

        totalJobsArr.forEach((job) => {
          const jobIDStr = job.jobID?.toString() || job._id?.toString();

          if (jobIDStr && !countedJobIDs.has(jobIDStr)) {
            countedJobIDs.add(jobIDStr);

            if (job.type === "Freelancing job with direct contact") direct++;
            else if (job.type === "Freelancing job on platform") platform++;
            else if (job.type === "Remote monthly job") remote++;
          }

          if (
            job.verified === true &&
            jobIDStr &&
            !countedVerifiedJobIDs.has(jobIDStr)
          ) {
            countedVerifiedJobIDs.add(jobIDStr);
            verifiedJobs++;
          }

          if (job.verified === true) {
            totalprofit += job.costInUSD || 0;
          }
        });

        const totalJobs = countedJobIDs.size;

        finalReport.push({
          trackName: track.trackName,
          totalStudents: track.numberOfStudent,
          totalAchievers: track.numberOfAchievers,
          percentage:
            (
              (track.numberOfAchievers / track.numberOfStudent) * 100 || 0
            ).toFixed(0) + "%",
          totalJobs,
          verifiedJobs,
          direct: totalJobs
            ? ((direct / totalJobs) * 100).toFixed(0) + "%"
            : "0.00%",
          platform: totalJobs
            ? ((platform / totalJobs) * 100).toFixed(0) + "%"
            : "0.00%",
          remote: totalJobs
            ? ((remote / totalJobs) * 100).toFixed(0) + "%"
            : "0.00%",
          totalprofit,
        });
      }

      return res.status(200).json(finalReport);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "An error occurred: " + error.message });
    }
  }
);

//earnings Report
dashboard.get("/earningsReport/:round", TokenMiddleware, async (req, res) => {
  try {
    const { round } = req.params;

    const tracks = await Tracks.find({ startDate: round });
    if (!tracks.length) {
      return res
        .status(404)
        .json({ message: "No tracks found for this round" });
    }

    let totalStudents = 0;
    let totalAchievers = 0;
    let totalJobsArr = [];
    let direct = 0;
    let platform = 0;
    let remote = 0;
    let verifiedJobs = 0;
    let totalprofit = 0;

    for (const track of tracks) {
      const students = await Students.find({ trackID: track._id });
      totalStudents += track.numberOfStudent || 0;
      totalAchievers += track.numberOfAchievers || 0;

      students.forEach((std) => {
        if (Array.isArray(std.jobs)) {
          totalJobsArr = totalJobsArr.concat(std.jobs);
        }
      });
    }

    const countedJobIDs = new Set();

    totalJobsArr.forEach((job) => {
      if (job.verified === true) {
        totalprofit += job.costInUSD || 0;

        const jobIDStr = job.jobID?.toString() || job._id?.toString();
        if (jobIDStr && !countedJobIDs.has(jobIDStr)) {
          countedJobIDs.add(jobIDStr);
          verifiedJobs++;

          if (job.type === "Freelancing job with direct contact") direct++;
          else if (job.type === "Freelancing job on platform") platform++;
          else if (job.type === "Remote monthly job") remote++;
        }
      }
    });

    const totalJobs = totalJobsArr.length;

    return res.status(200).json({
      round,
      totalTracks: tracks.length,
      totalStudents,
      totalAchievers,
      percentage:
        ((totalAchievers / totalStudents) * 100 || 0).toFixed(2) + "%",
      totalJobs,
      verifiedJobs,
      direct: verifiedJobs
        ? ((direct / verifiedJobs) * 100).toFixed(2)
        : "0.00",
      platform: verifiedJobs
        ? ((platform / verifiedJobs) * 100).toFixed(2)
        : "0.00",
      remote: verifiedJobs
        ? ((remote / verifiedJobs) * 100).toFixed(2)
        : "0.00",
      totalprofit,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

async function addNewAdmin(password) {
  const hashPassword = await hash(password, 10);
  Admins.insertOne({
    fullName: "Seif 2",
    branch: "Smart",
    Avatar: "efe",
    email: "corozan07@gmail.com",
    password: hashPassword,
    phone: "01150103029",
  });
}
// addNewAdmin("12345678")

export default dashboard;
