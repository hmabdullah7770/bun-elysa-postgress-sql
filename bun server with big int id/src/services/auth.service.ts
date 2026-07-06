// src/services/auth.service.ts
import { ApiError } from "../utils/ApiError";
import { userRepository } from "../repository/user.repository"
import { otpRepository } from "../repository/otp.repository";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/token";
import { uploadResult, saveTempFile} from "../utils/cloudinary";
// import type { User } from "../schemas";

export class AuthService {
  // â”€â”€â”€ Token Generation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async generateTokens(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await userRepository.updateRefreshToken(userId, refreshToken);

    return { accessToken, refreshToken };
  }

  // â”€â”€â”€ Verify Email (Send OTP) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async verifyEmail(email: string) {
    if (!email) throw new ApiError(400, "Email is required for verification");

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new ApiError(409, "User with this email already exists");
    }

    // Delete existing OTPs for this email
    await otpRepository.deleteByEmailAndPurpose(email, "registration");

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await Bun.password.hash(otp, {
      algorithm: "bcrypt",
      cost: 10,
    });
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes

    await otpRepository.create({
      email: email.toLowerCase(),
      otp: otpHash,
      expiresAt,
      purpose: "registration",
    });

    // TODO: Send email with OTP using nodemailer
    // await transporter.sendMail({ ... })

    return { otp }; // Remove OTP from response in production
  }

  // â”€â”€â”€ Check Username Availability â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async checkUsername(username: string) {
    if (!username) throw new ApiError(400, "Username is required");

    const user = await userRepository.findByUsername(username);
    if (user) {
      throw new ApiError(402, "Username already taken, please choose another");
    }

    return { available: true, username };
  }

  // â”€â”€â”€ Register User â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async register(data: {
  username: string;
  email: string;
  otp: string;
  password: string;
  fullName?: string;
  whatsapp?: string;
  storeLink?: string;
  facebook?: string;
  instagram?: string;
  productlink?: string;
  gender?: string;
  bio?: string;
  avatarFile: File;
  coverImageFile?: File;
}) {
  const {
    username, email, otp, password, fullName,
    whatsapp, storeLink, facebook, instagram,
    productlink, gender, bio,
    avatarFile, coverImageFile,
  } = data;

  // Validate required fields
  if (
    [username, email, password, bio, otp].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    throw new ApiError(400, "All required fields must be provided");
  }

  // Validate at least one social link
  if (!whatsapp && !storeLink && !facebook && !instagram) {
    throw new ApiError(
      400,
      "At least one social link (WhatsApp, storeLink, Facebook, or Instagram) is required"
    );
  }

  // Check if user already exists
  const existingUser = await userRepository.findByEmailOrUsername(
    email,
    username
  );
  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }

  // Check for duplicate social links
  const socialLinks: any = {};
  if (whatsapp) socialLinks.whatsapp = whatsapp;
  if (storeLink) socialLinks.storeLink = storeLink;
  if (facebook) socialLinks.facebook = facebook;
  if (instagram) socialLinks.instagram = instagram;

  if (Object.keys(socialLinks).length > 0) {
    const existingSocial = await userRepository.findBySocialLinks(socialLinks);
    if (existingSocial) {
      throw new ApiError(409, "One of the social links is already in use");
    }
  }

  // Verify OTP
  const otpRecord = await otpRepository.findByEmailAndPurpose(
    email,
    "registration"
  );
  if (!otpRecord) {
    throw new ApiError(404, "Invalid or expired OTP");
  }

  const isValidOtp = await Bun.password.verify(otp, otpRecord.otp);
  if (!isValidOtp) {
    throw new ApiError(401, "Invalid OTP, please enter the valid OTP");
  }

  const isExpired = otpRecord.expiresAt < new Date();
  if (isExpired) {
    await otpRepository.deleteById(otpRecord._id);
    throw new ApiError(400, "OTP has expired");
  }

  // âœ… Save ALL files to disk first, then upload
  if (!avatarFile) throw new ApiError(400, "Avatar is required");

  const avatarPath = await saveTempFile(avatarFile);
  const coverPath = coverImageFile ? await saveTempFile(coverImageFile) : null;

  const avatar = await uploadResult(avatarPath);
  if (!avatar) throw new ApiError(500, "Failed to upload avatar");

  let coverImage: { url: string } | null = null;
  if (coverPath) {
    coverImage = await uploadResult(coverPath);
    if (!coverImage) throw new ApiError(500, "Failed to upload cover image");
  }

  // Hash password
  const hashedPassword = await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 10,
  });

  // Cleanup OTP
  await otpRepository.deleteByEmailAndPurpose(email, "registration");

  // Create user
  const newUser = await userRepository.create({
    username: username.toLowerCase().trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    fullName: fullName?.trim(),
    bio,
    otp,
    gender: gender as any,
    avatar: avatar.url,
    ...(coverImage ? { coverImage: coverImage.url } : {}),
    ...(whatsapp ? { whatsapp } : {}),
    ...(storeLink ? { storeLink } : {}),
    ...(facebook ? { facebook } : {}),
    ...(instagram ? { instagram } : {}),
    productlink,
  });

  // Return user without sensitive fields
  const safeUser = await userRepository.findByIdSafe(newUser._id);
  if (!safeUser) {
    throw new ApiError(500, "Something went wrong while registering");
  }

  return safeUser;
}
  // â”€â”€â”€ Login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async login(emailOrUsername: string, password: string) {
    if (!emailOrUsername || !password) {
      throw new ApiError(400, "Email/username and password are required");
    }

    const user = await userRepository.findByEmailOrUsername(
      emailOrUsername,
      emailOrUsername
    );
    if (!user) throw new ApiError(404, "User not found");

    const isPasswordValid = await Bun.password.verify(password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(401, "Password is incorrect");
    }

    const { accessToken, refreshToken } = await this.generateTokens(user._id);

    const loggedInUser = await userRepository.findByIdSafe(user._id);
    if (!loggedInUser) {
      throw new ApiError(500, "Something went wrong while logging in");
    }

    return { user: loggedInUser, accessToken, refreshToken };
  }

  // â”€â”€â”€ Logout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async logout(userId: string) {
    await userRepository.updateRefreshToken(userId, null);
  }

  // â”€â”€â”€ Refresh Token â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async refreshTokens(incomingRefreshToken: string) {
    if (!incomingRefreshToken) {
      throw new ApiError(410, "Refresh token is required");
    }

    let decoded: { _id: string };
    try {
      decoded = verifyRefreshToken(incomingRefreshToken);
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        throw new ApiError(414, "JWT expired");
      } else if (err.name === "JsonWebTokenError") {
        throw new ApiError(411, "Refresh token is invalid or malformed");
      }
      throw new ApiError(411, "Refresh token verification failed");
    }

    if (!decoded?._id) {
      throw new ApiError(411, "Refresh token is invalid");
    }

    const user = await userRepository.findById(decoded._id);
    if (!user) {
      throw new ApiError(412, "User not found");
    }

    if (user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(413, "Refresh token does not match");
    }

    const { accessToken, refreshToken } = await this.generateTokens(user._id);

    return { accessToken, refreshToken };
  }

  // â”€â”€â”€ Forget Password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async forgetPassword(email: string) {
    if (!email) throw new ApiError(400, "Email is required");

    const user = await userRepository.findByEmail(email);
    if (!user) throw new ApiError(404, "User not found");

    await otpRepository.deleteByEmailAndPurpose(email, "password_reset");

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await Bun.password.hash(otp, {
      algorithm: "bcrypt",
      cost: 10,
    });
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

    await otpRepository.create({
      email: email.toLowerCase(),
      otp: otpHash,
      expiresAt,
      purpose: "password_reset",
    });

    // TODO: Send email
    return { otp }; // Remove in production
  }

  // â”€â”€â”€ Match OTP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async matchOtp(email: string, otp: string) {
    if (!email || !otp) {
      throw new ApiError(400, "Email and OTP are required");
    }

    const otpRecord = await otpRepository.findByEmailAndPurpose(
      email,
      "password_reset"
    );
    if (!otpRecord) throw new ApiError(404, "OTP not found");

    const isValid = await Bun.password.verify(otp, otpRecord.otp);
    if (!isValid) throw new ApiError(401, "OTP does not match");

    return { matched: true };
  }

  // â”€â”€â”€ Reset Password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async resetPassword(email: string, otp: string, newPassword: string) {
    if (!email || !otp || !newPassword) {
      throw new ApiError(400, "Email, OTP, and new password are required");
    }

    const otpRecord = await otpRepository.findByEmailAndPurpose(
      email,
      "password_reset"
    );
    if (!otpRecord) throw new ApiError(404, "Invalid or expired OTP");

    const isValid = await Bun.password.verify(otp, otpRecord.otp);
    if (!isValid) throw new ApiError(401, "Invalid OTP");

    const isExpired = otpRecord.expiresAt < new Date();
    if (isExpired) {
      await otpRepository.deleteById(otpRecord._id);
      throw new ApiError(400, "OTP has expired");
    }

    const hashedPassword = await Bun.password.hash(newPassword, {
      algorithm: "bcrypt",
      cost: 10,
    });

    const updatedUser = await userRepository.updatePassword(
      email,
      hashedPassword
    );
    if (!updatedUser) throw new ApiError(404, "User not found");

    await otpRepository.deleteByEmailAndPurpose(email, "password_reset");

    return { success: true };
  }

  // â”€â”€â”€ Change Password (Authenticated) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ) {
    if (!oldPassword || !newPassword) {
      throw new ApiError(400, "Old and new passwords are required");
    }

    const user = await userRepository.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const isValid = await Bun.password.verify(oldPassword, user.password);
    if (!isValid) throw new ApiError(401, "Old password is incorrect");

    const hashedPassword = await Bun.password.hash(newPassword, {
      algorithm: "bcrypt",
      cost: 10,
    });

    await userRepository.updateById(userId, { password: hashedPassword });

    return { success: true };
  }
}

export const authService = new AuthService();