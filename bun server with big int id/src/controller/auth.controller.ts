// src/controllers/auth.controller.ts
import { authService } from "../services/auth.service";
import { ApiResponse } from "../utils/ApiResponse";

export const verifyEmail = async ({ body }: { body: { email: string } }) => {
  const result = await authService.verifyEmail(body.email);
  return new ApiResponse(201, {
    message: "OTP sent to your email",
    otp: result.otp,
  });
};

export const matchUsername = async ({ params }: { params: { username: string } }) => {
  await authService.checkUsername(params.username);
  return new ApiResponse(
    201,
    `Successfully. You can take ${params.username} as username`
  );
};

export const matchOtp = async ({
  body,
}: {
  body: { email: string; otp: string };
}) => {
  await authService.matchOtp(body.email, body.otp);
  return new ApiResponse(200, "OTP matched successfully");
};

export const registerUser = async ({ body }: { body: any }) => {
  const user = await authService.register({
    username: body.username,
    email: body.email,
    otp: body.otp,
    password: body.password,
    fullName: body.fullName,
    whatsapp: body.whatsapp,
    storeLink: body.storeLink,
    facebook: body.facebook,
    instagram: body.instagram,
    productlink: body.productlink,
    gender: body.gender,
    bio: body.bio,
    avatarFile: body.avatar,
    coverImageFile: body.coverImage,
  });
  return new ApiResponse(201, user, "User registered successfully");
};

export const loginUser = async ({
  body,
  cookie,
  set,
}: {
  body: { email?: string; username?: string; password: string };
  cookie: any;
  set: any;
}) => {
  const result = await authService.login(
    body.email || body.username || "",
    body.password
  );

  cookie.accessToken.set({
    value: result.accessToken,
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 24 * 60 * 60,
  });

  cookie.refreshToken.set({
    value: result.refreshToken,
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 10 * 24 * 60 * 60,
  });

  set.status = 200;
  return new ApiResponse(
    201,
    {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
    { message: "User logged in successfully" }
  );
};

// export const logOut = async ({
//   userVerified,
//   cookie,
// }: {
//   userVerified: any;
//   cookie: any;
// }) => {
//   await authService.logout(userVerified._id);

//   cookie.accessToken.set({
//     value: "",
//     httpOnly: true,
//     secure: true,
//     maxAge: 0,
//   });
//   cookie.refreshToken.set({
//     value: "",
//     httpOnly: true,
//     secure: true,
//     maxAge: 0,
//   });

//   return new ApiResponse(200, {}, "User logged out successfully");
// };


export const logOut = async ({ userVerified, cookie }: any) => {
  await authService.logout(userVerified._id);

  cookie.accessToken.set({
    value: "",
    httpOnly: true,
    secure: true,
    maxAge: 0,
  });
  cookie.refreshToken.set({
    value: "",
    httpOnly: true,
    secure: true,
    maxAge: 0,
  });

  return new ApiResponse(200, {}, "User logged out successfully");
};

export const refreshToken = async ({
  cookie,
  headers,
}: {
  cookie: any;
  headers: any;
}) => {
  const incomingToken =
    cookie.refreshToken?.value ||
    headers.authorization?.replace("Bearer ", "");

  const { accessToken, refreshToken } =
    await authService.refreshTokens(incomingToken || "");

  cookie.accessToken.set({
    value: accessToken,
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 24 * 60 * 60,
  });

  cookie.refreshToken.set({
    value: refreshToken,
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 10 * 24 * 60 * 60,
  });

  return new ApiResponse(
    200,
    { accessToken, refreshToken },
    "Token refreshed successfully"
  );
};

export const forgetPassword = async ({
  body,
}: {
  body: { email: string };
}) => {
  const result = await authService.forgetPassword(body.email);
  return new ApiResponse(201, {
    message: `OTP sent to your email ${result.otp}`,
  });
};

export const resetPassword = async ({
  body,
}: {
  body: { email: string; otp: string; newpassword: string };
}) => {
  await authService.resetPassword(body.email, body.otp, body.newpassword);
  return new ApiResponse(201, "Password reset successfully");
};

export const reSendOtp = async ({
  body,
}: {
  body: { email: string };
}) => {
  // Reuse verifyEmail or create separate resend logic
  const result = await authService.verifyEmail(body.email);
  return new ApiResponse(201, {
    message: "OTP re-sent successfully",
    otp: result.otp,
  });
};

// export const changePassword = async ({
//   body,
//   userVerified,
// }: {
//   body: { oldpassword: string; newpassword: string };
//   userVerified: any;
// }) => {
//   await authService.changePassword(
//     userVerified._id,
//     body.oldpassword,
//     body.newpassword
//   );
//   return new ApiResponse(200, "Password changed successfully");
// };


// âœ… Fixed
export const changePassword = async ({ body, userVerified }: any) => {
  await authService.changePassword(
    userVerified._id,
    body.oldpassword,
    body.newpassword
  );
  return new ApiResponse(200, "Password changed successfully");
};