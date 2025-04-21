import { createTransport } from "nodemailer";
import { config } from "dotenv";
config();

const transporter = createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const sendEmail = async (userName, email, verificationCode) => {
  try {
    const mailOptions = {
      from: '"ITI Freelancing Hub Team " <' + process.env.EMAIL_USER + ">",
      to: email,
      subject: "Verify Your Email Address At ITI Freelancing Hub ",
      html: `
            <p>Dear ${userName},</p>
            <p style="text-align: center">
              <img
              width="80px"
                src="https://i.ibb.co/N2bvR2dK/LOGO.png"
                alt="ITI Freelancing Hub Logo"
                style="max-width: 200px; height: auto" />
            </p>

            <p>Welcome to the ITI Freelancing Hub!</p>

            <p>
              To complete your password reset process, please verify your email address by
              entering the verification code below:
            </p>

            <h2 style="text-align: center; color: #333">${verificationCode}</h2>

            <p>If you did not request this, please ignore this email.</p>

            <p>Thank you for being a part of the ITI Freelancing Hub!</p>

            <p>Best regards,<br />The ITI Freelancing Hub Team</p>
`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.response}`);
    return info.messageId;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export default sendEmail;
