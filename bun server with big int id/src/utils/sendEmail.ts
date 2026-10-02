import { resend } from "./resend";

interface SendVerificationEmailParams {
	to: string;
	otp: string;
}

export const sendVerificationEmail = async ({
	to,
	otp,
}: SendVerificationEmailParams) => {
	const { data, error } = await resend.emails.send({
		from: process.env.EMAIL_FROM as string,
		to,
		subject: "Email Verification OTP",
		html: `
			<div>
				<h3>Email Verification Request</h3>
				<p>Your OTP code is: <strong>${otp}</strong></p>
				<p>This code will expire in 20 minutes.</p>
			</div>
		`,
	});

	if (error) {
		console.error("Resend error:", error);
		throw new Error("Failed to send verification email");
	}

	return data;
};