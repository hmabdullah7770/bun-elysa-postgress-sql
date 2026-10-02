import { sendEmail } from "../utils/nativemailer";

type EmailData = {
  to: string;
  otp?: string;
  username?: string;
  orderId?: string | number;
  total?: string | number;
};

const send = async (data: EmailData, subject: string, html: string) => {
  if (!data.to) throw new Error("Email job is missing its recipient");
  const sent = await sendEmail({ to: data.to, subject, html });
  if (!sent) throw new Error(`Email delivery failed for ${data.to}`);
};

export const processEmailJob = async (type: string, data: EmailData) => {
  switch (type) {
    case "verify-email":
      await send(data, "Verify Your Email", `<h2>Email Verification</h2><p>Your OTP code is: <strong>${data.otp ?? ""}</strong></p><p>This code expires in 20 minutes.</p>`);
      return;
    case "welcome-email":
      await send(data, "Welcome!", `<h2>Hi ${data.username ?? ""}, welcome aboard!</h2><p>Start exploring the app.</p>`);
      return;
    case "resend-otp":
      await send(data, "Resend: Email Verification OTP", `<h2>New OTP Requested</h2><p>Your new OTP code is: <strong>${data.otp ?? ""}</strong></p><p>This code expires in 5 minutes.</p>`);
      return;
    case "forget-password":
      await send(data, "Password Reset OTP", `<h2>Password Reset Request</h2><p>Your OTP code is: <strong>${data.otp ?? ""}</strong></p><p>This code expires in 20 minutes.</p>`);
      return;
    case "password-reset-success":
      await send(data, "Password Reset Successful", `<h2>Hi ${data.username ?? ""},</h2><p>Your password has been reset successfully.</p>`);
      return;
    case "password-changed":
      await send(data, "Password Changed", `<h2>Hi ${data.username ?? ""},</h2><p>Your password was changed successfully.</p>`);
      return;
    case "order-confirmation":
      await send(data, `Order #${data.orderId ?? ""} Confirmed`, `<h2>Your order is confirmed!</h2><p>Order ID: <strong>#${data.orderId ?? ""}</strong></p><p>Total: <strong>${data.total ?? ""}</strong></p>`);
      return;
    default:
      console.warn(`Unknown email job type: ${type}`);
  }
};