// src/utils/email.ts
// Using Resend API (or SendGrid, Mailgun, etc.) with native Bun fetch
// No npm packages needed

interface MailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// ─── Using Resend (free tier: 100 emails/day) ──────────────────
export const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: MailOptions): Promise<boolean> => {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        text,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Email send failed:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
};

// ─── OTP helper (same as above) ────────────────────────────────
export const sendOtpEmail = async (
  email: string,
  otp: string,
  purpose: "registration" | "password_reset"
): Promise<boolean> => {
  const subjects = {
    registration: "Email Verification OTP",
    password_reset: "Password Reset OTP",
  };

  return sendEmail({
    to: email,
    subject: subjects[purpose],
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${purpose === "registration" ? "Email Verification" : "Password Reset"}</h2>
        <h1 style="background:#f4f4f4;padding:15px;text-align:center;letter-spacing:8px;font-size:32px;border-radius:8px;">
          ${otp}
        </h1>
        <p>This code expires in <strong>20 minutes</strong>.</p>
      </div>
    `,
  });
};