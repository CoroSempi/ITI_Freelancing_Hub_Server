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

const sendMessage = async (userName, email) => {
  try {
    const mailOptions = {
      from: '"ITI Freelancing Hub Team " <' + process.env.EMAIL_USER + ">",
      to: email,
      subject: "Message from ITI Freelancing Hub ",
      html: `
    <p>Dear ${userName.split(" ")[0] + " " + userName.split(" ")[1]},</p>

<p style="text-align: center; margin: 20px 0;">
  <img
    src="https://i.ibb.co/JW99hyZC/icon.png"
    alt="ITI Freelancing Hub Logo"
    width="60%"
    style="max-width: 170px; height: auto;"
  />
</p>

<p>You’ve just received a new message from the <strong>ITI Freelancing Hub</strong>!</p>

<p>
  To view or respond to the message, please visit our platform:
  <a href="https://iti-freelancing-hub.netlify.app/" target="_blank">
    ITI Freelancing Hub
  </a>
</p>

<p>Thank you for being a valued member of our community. We're glad to have you with us!</p>

<p>
  Best regards,<br />
  <strong>The ITI Freelancing Hub Team</strong>
</p>
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

export default sendMessage;
