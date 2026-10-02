import nodemailer from "nodemailer";
import { flags } from "../../../config/flags";

const port = Number(process.env.SMTP_PORT) || 587;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: process.env.SMTP_SECURE === "true" || port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

if (flags.mailer) {
  void transporter.verify().then(
    () => console.log("SMTP mailer ready"),
    (error: unknown) => console.error("SMTP mailer connection failed:", error)
  );
}

export default transporter;