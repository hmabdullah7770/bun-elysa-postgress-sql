// src/utils/nodemailer.ts

import nodemailer, { type Transporter } from "nodemailer";

// ─── Type for mail options ──────────────────────────────────────
interface MailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// ─── Create transporter ────────────────────────────────────────
const transporter: Transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for others
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─── Verify connection on startup ──────────────────────────────
transporter.verify()
  .then(() => console.log("📧 SMTP connection verified"))
  .catch((err) => console.error("📧 SMTP connection failed:", err.message));

// ─── Helper function to send emails ────────────────────────────
export const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: MailOptions): Promise<boolean> => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
};

// ─── OTP Email Templates ───────────────────────────────────────
export const sendOtpEmail = async (
  email: string,
  otp: string,
  purpose: "registration" | "password_reset"
): Promise<boolean> => {
  const subjects = {
    registration: "Email Verification OTP",
    password_reset: "Password Reset OTP",
  };

  const titles = {
    registration: "Email Verification",
    password_reset: "Password Reset Request",
  };

  return sendEmail({
    to: email,
    subject: subjects[purpose],
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${titles[purpose]}</h2>
        <p>Your OTP code is:</p>
        <h1 style="
          background: #f4f4f4; 
          padding: 15px; 
          text-align: center; 
          letter-spacing: 8px; 
          font-size: 32px;
          border-radius: 8px;
        ">${otp}</h1>
        <p>This code will expire in <strong>20 minutes</strong>.</p>
        <p style="color: #888; font-size: 12px;">
          If you didn't request this, please ignore this email.
        </p>
      </div>
    `,
    text: `Your ${titles[purpose]} OTP is ${otp}. It will expire in 20 minutes.`,
  });
};

export default transporter;