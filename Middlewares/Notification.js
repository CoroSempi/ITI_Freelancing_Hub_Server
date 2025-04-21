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

const sendNotification = async (userName, email, title, content) => {
  try {
    const mailOptions = {
      from: '"ITI Freelancing Hub Team " <' + process.env.EMAIL_USER + ">",
      to: email,
      subject: `${title}`,
      html: `
            <p>Dear ${userName},</p>
            <p style="text-align: center">
              <img
              width="80px"
                src="https://i.ibb.co/N2bvR2dK/LOGO.png"
                alt="ITI Freelancing Hub Logo"
                style="max-width: 200px; height: auto" />
            </p>
            <p>
                 ${content}
            </p>
            <p>Best regards,<br />The ITI Freelancing Hub Team ❤️</p>
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

export default sendNotification;
