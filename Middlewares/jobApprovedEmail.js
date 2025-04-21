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

const jobApprovedEmail = async (userName, email, title) => {
  try {
    const mailOptions = {
      from: '"ITI Freelancing Hub Team " <' + process.env.EMAIL_USER + ">",
      to: email,
      subject: `Approved !`,
      html: `
  <p>Dear ${userName},</p>
<p style="text-align: center">
  <img
    width="80px"
    src="https://i.ibb.co/N2bvR2dK/LOGO.png"
    alt="ITI Freelancing Hub Logo"
    style="max-width: 200px; height: auto" />
</p>

<p style="font-size: 20px">🎉 Congratulations !</p>

<p style="margin: 40px 0px">
  We are thrilled to inform you that your ${title} has been officially approved!
  Your efforts and commitment have not gone unnoticed, and we look forward to
  seeing your contributions in this new role. Celebrate this achievement!
</p>

<p>Thank you for being a part of the ITI Freelancing Hub! ❤️</p>

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

export default jobApprovedEmail;
