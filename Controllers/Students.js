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
import toBase64 from "../Middlewares/Base64.js";

// Set up multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

//Models
import Students from "../Models/Student.js";
import Chats from "../Models/Chats.js";
import DirectJob from "../Models/DirectJob.js";
import PlatformJob from "../Models/PlatformJob.js";
import RemoteJob from "../Models/RemoteJob.js";
import Notifications from "../Models/Notification.js";
import Certificate from "../Models/Certificate.js";

const client = Router();

client.use(json());
client.use(urlencoded({ extended: true }));
client.use(setHeadersMiddleware);

// Client Sign In
client.post("/signIn", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please enter both email and password" });
    }

    const student = await Students.findOne({ email });
    if (student) {
      const isMatch = await compare(password, student.password);
      if (isMatch) {
        // Generate token
        const token = jwt.sign(
          {
            name: student.fullName,
            id: student._id,
            branch: student.branch,
            role: "student",
          },
          process.env.TOKEN_ACCESS,
          { expiresIn: "12h" }
        );

        const studentObj = student.toObject();
        delete studentObj.password;

        return res.status(200).json({
          AccessToken: token,
          studentData: studentObj,
        });
      } else {
        return res.json({ message: "Invalid password" });
      }
    } else {
      return res.json({ message: "Student not found" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred while fetching data" });
  }
});

// Client Check Token
client.get("/checkToken", TokenMiddleware, async (req, res) => {
  try {
    res.status(200).json({ message: "Token is valid" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred while fetching data" });
  }
});

// Client Check Token
client.get("/data", TokenMiddleware, async (req, res) => {
  try {
    const { id } = req.user;
    const student = await Students.findOne({ _id: id });
    res.status(200).json(student);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred while fetching data" });
  }
});

// Client Forget Password
client.post("/forgetPassword", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "All fields are required." });
    }
    const student = await Students.findOne({ email });
    if (!student) {
      return res.status(409).json({ message: "Student not found." });
    }

    student.verificationCode = Math.floor(100000 + Math.random() * 900000);
    await student.save().then(() => {
      sendEmail(
        student.fullName.split(" ")[0] + " " + student.fullName.split(" ")[1],
        student.email,
        student.verificationCode
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

// Client Verfiy Code
client.post("/verifyCode", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: "All fields are required." });
    }
    const student = await Students.findOne({ email: email });
    if (!student) {
      return res.status(409).json({ message: "Admin not found." });
    } else {
      if (student.verificationCode == code) {
        // Generate token
        const token = jwt.sign(
          {
            name: student.fullName,
            id: student._id,
            branch: student.branch,
            role: "student",
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

// Client Reset password
client.post("/resetPassword", TokenMiddleware, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const { id } = req.user;
    const student = await Students.findById(id);
    if (!student) {
      return res.status(409).json({ message: "Student not found." });
    } else {
      const hashedPassword = await hash(newPassword, 10);
      student.password = hashedPassword;
      await student.save();
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

// Client Change password
client.patch("/changePassword", TokenMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id } = req.user;
    const student = await Students.findById(id);

    if (student) {
      const isMatch = await compare(currentPassword, student.password);
      if (isMatch) {
        const hashPassword = await hash(newPassword, 10);
        student.password = hashPassword;
        student.save();
        return res
          .status(200)
          .json({ message: "password changed successfully" });
      } else {
        return res.status(401).json({ message: "Invalid password" });
      }
    } else {
      return res.status(404).json({ message: "Student not found" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Client Change Avatar
client.patch(
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
      const student = await Students.findById(id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      const avatar64 = await toBase64(avatar);
      student.avatar = avatar64;
      student.save();
      return res.status(200).json({ message: "Avatar changed successfully" });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "An error occurred: " + error.message });
    }
  }
);

// Client Get Notifications
client.get("/notifications", TokenMiddleware, async (req, res) => {
  try {
    const { id } = req.user;
    const noti = await Notifications.findOne({ studentID: id });
    return res.status(201).send(noti);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Client Seen Notifications
client.post("/notifications/:id", TokenMiddleware, async (req, res) => {
  try {
    const { id } = req.user;
    const notiId = req.params.id;
    const noti = await Notifications.findOne({ studentID: id });
    noti.notifications = noti.notifications.map((noti) => {
      if (noti._id == notiId) {
        noti.seen = true;
      }
      return noti;
    });
    await noti.save();
    return res.status(201).send(noti);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Client Get Chat
client.get("/getChat", TokenMiddleware, async (req, res) => {
  try {
    const { id } = req.user;
    const studentChat = await Chats.findOne({ studentID: id });
    if (studentChat) {
      studentChat.ChatRoom = studentChat.ChatRoom.map((message) => {
        if (message.received == true) {
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

// Client Send message
client.post("/sendMessage", TokenMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    const { id } = req.user;
    const studentChat = await Chats.findOne({ studentID: id });
    if (studentChat) {
      studentChat.ChatRoom.push({ content, received: false });
      studentChat.save();
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

// Client Upload Freelancing job with direct contact
client.post("/directJob", TokenMiddleware, async (req, res) => {
  try {
    const { id, branch, name } = req.user;
    const { costInUSD, teamMembers = [] } = req.body;
    if (!costInUSD || typeof costInUSD !== "number") {
      return res.status(400).json({ message: "Valid costInUSD is required." });
    }
    const studentShare = teamMembers.reduce((remain, member) => {
      const share = Number(member.studentShare || 0);
      if (isNaN(share)) {
        throw new Error("Invalid studentShare in teamMembers.");
      }
      return remain - share;
    }, costInUSD);

    const jobDoc = {
      studentName: name,
      uploadedBy: id,
      studentShare,
      branch,
      ...req.body,
    };

    const insertResult = await DirectJob.insertOne(jobDoc);
    const jobID = insertResult._id;
    console.log(jobID);

    const mainStudent = await Students.findById(id);
    if (!mainStudent) {
      return res.status(404).json({ message: "Uploading student not found." });
    }

    mainStudent.jobs.push({
      jobID,
      costInUSD: studentShare,
      type: "Freelancing job with direct contact",
    });
    await mainStudent.save();

    await Promise.all(
      teamMembers.map(async (member) => {
        const teamStudent = await Students.findById(member.studentID);
        if (!teamStudent) {
          console.warn(`Student with ID ${member.studentID} not found.`);
          return;
        }

        teamStudent.jobs.push({
          jobID,
          costInUSD: member.studentShare,
          type: "Freelancing job with direct contact",
        });
        await teamStudent.save();
      })
    );

    return res
      .status(201)
      .json({ message: "Job uploaded successfully", jobID });
  } catch (error) {
    console.error("Error in /directJob:", error);
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Client Delete Freelancing job with direct contact
client.delete("/directJob/:jobId", TokenMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    if (!ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid job ID." });
    }

    const jobObjectId = new ObjectId(jobId);

    const job = await DirectJob.findOne({ _id: jobObjectId });
    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }

    if (job.uploadedBy.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this job." });
    }

    await DirectJob.deleteOne({ _id: jobObjectId });
    await Students.updateMany({}, { $pull: { jobs: { jobID: jobId } } });

    return res.status(200).json({ message: "Job deleted successfully." });
  } catch (error) {
    console.error("Error deleting job:", error);
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Client Update Freelancing job with direct contact
client.put("/directJob/:jobId", TokenMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { id } = req.user;

    if (!ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid job ID." });
    }

    const jobObjectId = new ObjectId(jobId);

    const existingJob = await DirectJob.findOne({ _id: jobObjectId });
    if (!existingJob) {
      return res.status(404).json({ message: "Job not found." });
    }

    if (existingJob.uploadedBy.toString() !== id) {
      return res
        .status(403)
        .json({ message: "Unauthorized to update this job." });
    }

    const { costInUSD, teamMembers = [] } = req.body;

    const studentShare = teamMembers.reduce((remain, member) => {
      const share = Number(member.studentShare || 0);
      if (isNaN(share)) {
        throw new Error("Invalid team member share value.");
      }
      return remain - share;
    }, costInUSD);

    const updatedJob = await DirectJob.findOneAndUpdate(
      { _id: jobObjectId },
      { $set: { ...req.body, studentShare } },
      { new: true }
    );

    const uploader = await Students.findById(id);
    if (uploader) {
      const jobIndex = uploader.jobs.findIndex(
        (job) => job.jobID.toString() === jobId
      );
      if (jobIndex !== -1) {
        uploader.jobs[jobIndex] = {
          jobID: jobObjectId,
          costInUSD: studentShare,
          type: "Freelancing job with direct contact",
        };
        await uploader.save();
      }
    }

    await Promise.all(
      teamMembers.map(async (member) => {
        const teamStd = await Students.findById(member.studentID);
        if (!teamStd) {
          console.warn(`Student with ID ${member.studentID} not found.`);
          return;
        }

        const index = teamStd.jobs.findIndex(
          (job) => job.jobID.toString() === jobId
        );

        if (index !== -1) {
          teamStd.jobs[index] = {
            jobID: jobObjectId,
            costInUSD: member.studentShare,
            type: "Freelancing job with direct contact",
          };
        } else {
          teamStd.jobs.push({
            jobID: jobObjectId,
            costInUSD: member.studentShare,
            type: "Freelancing job with direct contact",
          });
        }

        await teamStd.save();
      })
    );

    return res.status(200).json(updatedJob);
  } catch (error) {
    console.error("Update job error:", error);
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Client Upload Freelancing job on platform
client.post("/platformJob", TokenMiddleware, async (req, res) => {
  try {
    const { id, branch, name } = req.user;
    const { costInUSD, teamMembers = [] } = req.body;

    if (!costInUSD || typeof costInUSD !== "number") {
      return res.status(400).json({ message: "Valid costInUSD is required." });
    }

    if (!Array.isArray(teamMembers)) {
      return res.status(400).json({ message: "teamMembers must be an array." });
    }

    const studentShare = teamMembers.reduce((remain, member) => {
      const share = Number(member.studentShare || 0);
      if (isNaN(share)) throw new Error("Invalid studentShare value.");
      return remain - share;
    }, costInUSD);

    const insertResult = await PlatformJob.insertOne({
      uploadedBy: id,
      studentName: name,
      studentShare,
      branch,
      ...req.body,
    });

    const jobID = insertResult._id;

    const uploader = await Students.findById(id);
    if (!uploader) {
      return res.status(404).json({ message: "Uploading student not found." });
    }

    uploader.jobs.push({
      jobID,
      costInUSD: studentShare,
      type: "Freelancing job on platform",
    });
    await uploader.save();

    await Promise.all(
      teamMembers.map(async (member) => {
        const teammate = await Students.findById(member.studentID);
        if (!teammate) {
          console.warn(`Student with ID ${member.studentID} not found.`);
          return;
        }
        teammate.jobs.push({
          jobID,
          costInUSD: member.studentShare,
          type: "Freelancing job on platform",
        });
        await teammate.save();
      })
    );

    return res.status(201).json({ message: "Job created successfully", jobID });
  } catch (error) {
    console.error("Platform job upload error:", error);
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Client Delete Freelancing job on platform
client.delete("/platformJob/:jobId", TokenMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    if (!ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid job ID." });
    }
    const jobObjectId = new ObjectId(jobId);

    const job = await PlatformJob.findOne({ _id: jobObjectId });
    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }

    if (job.uploadedBy.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this job." });
    }

    await PlatformJob.deleteOne({ _id: jobObjectId });
    await Students.updateMany({}, { $pull: { jobs: { jobID: jobObjectId } } });

    return res.status(200).json({ message: "Job deleted successfully." });
  } catch (error) {
    console.error("Delete job error:", error);
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Client Update Freelancing job on platform
client.put("/platformJob/:jobId", TokenMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { id } = req.user;
    const { costInUSD, teamMembers = [] } = req.body;

    if (!ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid job ID." });
    }

    if (typeof costInUSD !== "number" || costInUSD <= 0) {
      return res.status(400).json({ message: "Valid costInUSD is required." });
    }

    const jobObjectId = new ObjectId(jobId);

    const existingJob = await PlatformJob.findOne({ _id: jobObjectId });
    if (!existingJob) {
      return res.status(404).json({ message: "Job not found." });
    }

    if (existingJob.uploadedBy.toString() !== id) {
      return res
        .status(403)
        .json({ message: "Unauthorized to update this job." });
    }

    // Calculate studentShare
    const studentShare = Array.isArray(teamMembers)
      ? teamMembers.reduce((remain, member) => {
          const share = Number(member.studentShare || 0);
          if (isNaN(share))
            throw new Error("Invalid studentShare in teamMembers.");
          return remain - share;
        }, costInUSD)
      : costInUSD;

    // Update job
    const updatedJob = await PlatformJob.findOneAndUpdate(
      { _id: jobObjectId },
      { $set: { ...req.body, studentShare } },
      { new: true }
    );

    // Update uploader's job entry
    const uploader = await Students.findById(id);
    if (uploader) {
      const jobIndex = uploader.jobs.findIndex(
        (job) => job.jobID.toString() === jobId
      );
      const updatedEntry = {
        jobID: jobObjectId,
        costInUSD: studentShare,
        type: "Freelancing job on platform",
      };

      if (jobIndex !== -1) {
        uploader.jobs[jobIndex] = updatedEntry;
      } else {
        uploader.jobs.push(updatedEntry);
      }
      await uploader.save();
    }

    // Update team members' job entries
    await Promise.all(
      teamMembers.map(async (member) => {
        const teammate = await Students.findById(member.studentID);
        if (!teammate) {
          console.warn(`Student with ID ${member.studentID} not found.`);
          return;
        }

        const entry = {
          jobID: jobObjectId,
          costInUSD: member.studentShare,
          type: "Freelancing job on platform",
        };

        const jobIndex = teammate.jobs.findIndex(
          (job) => job.jobID.toString() === jobId
        );

        if (jobIndex !== -1) {
          teammate.jobs[jobIndex] = entry;
        } else {
          teammate.jobs.push(entry);
        }

        await teammate.save();
      })
    );

    return res.status(200).json(updatedJob);
  } catch (error) {
    console.error("Update platform job error:", error);
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Client Upload Remote monthly job
client.post("/remoteJob", TokenMiddleware, async (req, res) => {
  try {
    const { id, branch, name } = req.user;
    const { paymentInUSD } = req.body;

    if (typeof paymentInUSD !== "number" || paymentInUSD <= 0) {
      return res
        .status(400)
        .json({ message: "Valid paymentInUSD is required." });
    }

    const insertResult = await RemoteJob.insertOne({
      uploadedBy: id,
      studentName: name,
      branch,
      ...req.body,
    });

    const jobID = insertResult._id;

    const std = await Students.findById(id);
    if (!std) return res.status(404).json({ message: "Student not found." });

    std.jobs.push({
      jobID,
      costInUSD: paymentInUSD,
      type: "Remote monthly job",
    });
    await std.save();

    return res.status(201).json({ message: "Job created", jobID });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Client Delete Remote monthly job
client.delete("/remoteJob/:jobId", TokenMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;

    const result = await RemoteJob.deleteOne({ _id: jobId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Job not found." });
    }
    await Students.updateMany({}, { $pull: { jobs: { jobID: jobId } } });
    return res.status(200).json({ message: "Job deleted successfully." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Client Update Remote monthly job
client.put("/remoteJob/:jobId", TokenMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { id } = req.user;

    const updatedJob = await RemoteJob.findOneAndUpdate(
      { _id: jobId },
      { $set: { ...req.body } },
      { new: true }
    );

    if (!updatedJob) {
      return res.status(404).json({ message: "Job not found." });
    }

    const std = await Students.findById(id);
    const jobIndex = std.jobs.findIndex(
      (job) => job.jobID.toString() === jobId
    );

    if (jobIndex !== -1) {
      std.jobs[jobIndex] = {
        jobID: jobId,
        costInUSD: updatedJob.paymentInUSD,
        type: "Remote monthly job",
      };
      await std.save();
    }
    return res.status(200).json(updatedJob);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Client Upload Certificate
client.post("/certificate", TokenMiddleware, async (req, res) => {
  try {
    const { id, branch, name } = req.user;

    const insertResult = await Certificate.insertOne({
      uploadedBy: id,
      studentName: name,
      branch,
      ...req.body,
    });

    const certificateID = insertResult._id;

    const std = await Students.findById(id);
    if (!std) {
      return res.status(404).json({ message: "Student not found." });
    }

    std.certificates.push({ certificateID });
    await std.save();

    return res
      .status(201)
      .json({ message: "Certificate uploaded", certificateID });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Client Get Certificate By ID
client.get("/certificate/:certificateId", TokenMiddleware, async (req, res) => {
  try {
    const { certificateId } = req.params;

    if (!ObjectId.isValid(certificateId)) {
      return res.status(400).json({ message: "Invalid certificate ID." });
    }

    const cert = await Certificate.findOne({
      _id: new ObjectId(certificateId),
    });

    if (!cert)
      return res.status(404).json({ message: "Certificate not found." });

    if (cert.uploadedBy.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Unauthorized to access this certificate." });
    }

    return res.status(200).json(cert);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Client Get All Certificates
client.get("/certificate", TokenMiddleware, async (req, res) => {
  try {
    const { id } = req.user;
    const certificates = await Certificate.find({ uploadedBy: id });
    if (!certificates) {
      return res.status(404).json({ message: "Certificate not found." });
    }
    return res.status(200).json(certificates);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Client Update Certificate
client.put("/certificate/:certificateId", TokenMiddleware, async (req, res) => {
  try {
    const { certificateId } = req.params;

    const updatedCertificate = await Certificate.findOneAndUpdate(
      { _id: certificateId },
      { $set: { ...req.body } },
      { new: true }
    );

    if (!updatedCertificate) {
      return res.status(404).json({ message: "Certificate not found." });
    }

    return res.status(200).json(updatedCertificate);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Client Delete Certificate
client.delete(
  "/certificate/:certificateId",
  TokenMiddleware,
  async (req, res) => {
    try {
      const { certificateId } = req.params;
      const result = await Certificate.deleteOne({ _id: certificateId });
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "certificate not found." });
      }
      await Students.updateOne(
        { _id: req.user.id },
        { $pull: { certificates: { certificateID: certificateId } } }
      );
      return res
        .status(200)
        .json({ message: "Certificate deleted successfully." });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "An error occurred: " + error.message });
    }
  }
);

// Client Get Freelancing job By ID
client.get("/jobs/:jobId", TokenMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { id } = req.user;
    const std = await Students.findById(id);
    const job = std.jobs.find((job) => job.jobID == jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }
    if (job.type === "Freelancing job with direct contact") {
      const directJob = await DirectJob.findById(job.jobID);
      return res.status(200).json({
        jobData: directJob,
        canEdit: directJob.uploadedBy == id ? true : false,
      });
    } else if (job.type === "Freelancing job on platform") {
      const platformJob = await PlatformJob.findById(job.jobID);
      return res.status(200).json({
        jobData: platformJob,
        canEdit: platformJob.uploadedBy == id ? true : false,
      });
    } else if (job.type === "Remote monthly job") {
      const remoteJob = await RemoteJob.findById(job.jobID);
      return res.status(200).json({
        jobData: remoteJob,
        canEdit: remoteJob.uploadedBy == id ? true : false,
      });
    } else {
      return res.status(404).json({ message: "Job not found." });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Client Get All jobs
client.get("/jobs", TokenMiddleware, async (req, res) => {
  try {
    const { id } = req.user;

    const std = await Students.findById(id);
    if (!std) {
      return res.status(404).json({ message: "User not found." });
    }

    const jobsData = await Promise.all(
      std.jobs.map(async (job) => {
        let jobDetails;
        if (job.type === "Freelancing job with direct contact") {
          jobDetails = await DirectJob.findById(job.jobID);
        } else if (job.type === "Freelancing job on platform") {
          jobDetails = await PlatformJob.findById(job.jobID);
          console.log(jobDetails);
        } else if (job.type === "Remote monthly job") {
          jobDetails = await RemoteJob.findById(job.jobID);
        }

        return {
          jobData: jobDetails,
          canEdit:
            jobDetails && jobDetails.uploadedBy == id && !jobDetails.verified,
        };
      })
    );

    return res.status(200).json(jobsData);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

export default client;
