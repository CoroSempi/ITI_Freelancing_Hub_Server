import { Router, json, urlencoded } from "express";
import jwt from "jsonwebtoken";
import { compare, hash } from "bcrypt";
import { config } from "dotenv";
import multer from "multer";

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
        return res.status(200).json({
          AccessToken: token,
          studentData: student,
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
          { name: student.fullName, branch: student.branch, role: "student" },
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
    const { name } = req.user;
    const student = await Students.findOne({ fullName: name });
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

    if (!req.body.costInUSD) {
      return res.status(400).json({ message: "costInUSD is required." });
    }

    const studentShare = (function () {
      if (!req.body.teamMembers) {
        return req.body.costInUSD;
      } else {
        let remain = req.body.costInUSD;
        req.body.teamMembers.forEach((member) => {
          remain -= member.studentShare;
        });
        return remain;
      }
    })();

    const studentJob = await DirectJob.insertOne({
      studentName: name,
      uploadedBy: id,
      studentShare,
      branch,
      ...req.body,
    });

    const jobID = studentJob._id;
    console.log(jobID);
    const std = await Students.findById(id);
    std.jobs.push({
      jobID,
      costInUSD: studentShare,
      type: "Freelancing job with direct contact",
    });
    await std.save();

    await Promise.all(
      req.body.teamMembers.map(async (member) => {
        const std = await Students.findById(member.studentID);
        std.jobs.push({
          jobID,
          costInUSD: member.studentShare,
          type: "Freelancing job with direct contact",
        });
        await std.save();
      })
    );
    return res.status(201).json(studentJob);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Client Delete Freelancing job with direct contact
client.delete("/directJob/:jobId", TokenMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;

    const result = await DirectJob.deleteOne({ _id: jobId });
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

// Client Update Freelancing job with direct contact
client.put("/directJob/:jobId", TokenMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { id } = req.user;

    const studentShare = (function () {
      if (!req.body.teamMembers) {
        return req.body.costInUSD;
      } else {
        let remain = req.body.costInUSD;
        req.body.teamMembers.forEach((member) => {
          remain -= member.studentShare;
        });
        return remain;
      }
    })();

    const updatedJob = await DirectJob.findOneAndUpdate(
      { _id: jobId },
      { $set: { ...req.body, studentShare } },
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
        costInUSD: studentShare,
        type: "Freelancing job with direct contact",
      };
      await std.save();
    }
    await Promise.all(
      req.body.teamMembers.map(async (member) => {
        const std = await Students.findById(member.studentID);
        const jobIndex = std.jobs.findIndex(
          (job) => job.jobID.toString() === jobId
        );

        if (jobIndex !== -1) {
          std.jobs[jobIndex] = {
            jobID: jobId,
            costInUSD: member.studentShare,
            type: "Freelancing job with direct contact",
          };
          await std.save();
        }
      })
    );
    return res.status(200).json(updatedJob);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Client Upload Freelancing job on platform
client.post("/paltformJob", TokenMiddleware, async (req, res) => {
  try {
    const { id, branch, name } = req.user;

    if (!req.body.costInUSD) {
      return res.status(400).json({ message: "costInUSD is required." });
    }

    const studentShare = (function () {
      if (!req.body.teamMembers) {
        return req.body.costInUSD;
      } else {
        let remain = req.body.costInUSD;
        req.body.teamMembers.forEach((member) => {
          remain -= member.studentShare;
        });
        return remain;
      }
    })();

    const studentJob = await PlatformJob.insertOne({
      uploadedBy: id,
      studentName: name,
      studentShare,
      branch,
      ...req.body,
    });

    const jobID = studentJob._id;
    console.log(jobID);
    const std = await Students.findById(id);
    std.jobs.push({
      jobID,
      costInUSD: studentShare,
      type: "Freelancing job on platform",
    });
    await std.save();

    await Promise.all(
      req.body.teamMembers.map(async (member) => {
        const std = await Students.findById(member.studentID);
        std.jobs.push({
          jobID,
          costInUSD: member.studentShare,
          type: "Freelancing job on platform",
        });
        await std.save();
      })
    );
    return res.status(201).json(studentJob);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Client Delete Freelancing job on platform
client.delete("/paltformJob/:jobId", TokenMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;

    const result = await PlatformJob.deleteOne({ _id: jobId });
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

// Client Update Freelancing job on platform
client.put("/paltformJob/:jobId", TokenMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { id } = req.user;

    const studentShare = (function () {
      if (!req.body.teamMembers) {
        return req.body.costInUSD;
      } else {
        let remain = req.body.costInUSD;
        req.body.teamMembers.forEach((member) => {
          remain -= member.studentShare;
        });
        return remain;
      }
    })();

    const updatedJob = await PlatformJob.findOneAndUpdate(
      { _id: jobId },
      { $set: { ...req.body, studentShare } },
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
        costInUSD: studentShare,
        type: "Freelancing job on platform",
      };
      await std.save();
    }
    await Promise.all(
      req.body.teamMembers.map(async (member) => {
        const std = await Students.findById(member.studentID);
        const jobIndex = std.jobs.findIndex(
          (job) => job.jobID.toString() === jobId
        );

        if (jobIndex !== -1) {
          std.jobs[jobIndex] = {
            jobID: jobId,
            costInUSD: member.studentShare,
            type: "Freelancing job on platform",
          };
          await std.save();
        }
      })
    );
    return res.status(200).json(updatedJob);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred: " + error.message });
  }
});

// Client Upload Remote monthly job
client.post("/remoteJob", TokenMiddleware, async (req, res) => {
  try {
    const { id, branch, name } = req.user;

    const studentJob = await RemoteJob.insertOne({
      uploadedBy: id,
      studentName: name,
      branch,
      ...req.body,
    });

    const jobID = studentJob._id;
    const std = await Students.findById(id);
    std.jobs.push({
      jobID,
      costInUSD: req.body.paymentInUSD,
      type: "Remote monthly job",
    });
    await std.save();

    return res.status(201).json(studentJob);
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
    } else if (job.type === "Freelancing job on platform") {
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
        } else if (job.type === "Freelancing job on platform") {
          console.log("ewwe");
          jobDetails = await PlatformJob.findById(job.jobID);
        } else if (job.type === "Remote monthly job") {
          jobDetails = await RemoteJob.findById(job.jobID);
        }

        return {
          jobData: jobDetails,
          canEdit: jobDetails && jobDetails.uploadedBy == id,
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
