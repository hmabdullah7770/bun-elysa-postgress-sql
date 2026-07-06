// src/routes/auth.routes.ts
import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth";

import {
  verifyEmail,
  matchOtp,
  matchUsername,
  registerUser,
  loginUser,
  logOut,
  refreshToken,
  changePassword,
  reSendOtp,
  resetPassword,
  forgetPassword,
} from "../controller/auth.controller";

const authRoutes = new Elysia({ prefix: "/api/v1/users" })

  // ──────────────── Public Routes ────────────────

  // POST /api/v1/users/verify-email
  .post("/verify-email", verifyEmail, {
    body: t.Object({
      email: t.String({ format: "email" }),
    }),
  })

  // POST /api/v1/users/match-otp
  .post("/match-otp", matchOtp, {
    body: t.Object({
      email: t.String({ format: "email" }),
      otp: t.String(),
    }),
  })

  // GET /api/v1/users/match-username/:username
  .get("/match-username/:username", matchUsername, {
    params: t.Object({
      username: t.String(),
    }),
  })

  // POST /api/v1/users/register (with file upload — avatar required, coverImage optional)
  .post("/register", registerUser, {
    body: t.Object({
      username: t.String(),
      email: t.String({ format: "email" }),
      otp: t.String(),
      password: t.String(),
      fullName: t.Optional(t.String()),
      bio: t.Optional(t.String()),
      gender: t.Optional(
        t.Union([
          t.Literal("male"),
          t.Literal("female"),
          t.Literal("transgender"),
          t.Literal("other"),
        ])
      ),
      whatsapp: t.Optional(t.String()),
      storeLink: t.Optional(t.String()),
      facebook: t.Optional(t.String()),
      instagram: t.Optional(t.String()),
      productlink: t.Optional(t.String()),
      avatar: t.File(),
      coverImage: t.Optional(t.File()),
    }),
  })

  // POST /api/v1/users/login
  .post("/login", loginUser, {
    body: t.Object({
      email: t.Optional(t.String()),
      username: t.Optional(t.String()),
      password: t.String(),
    }),
  })

  // POST /api/v1/users/re-send-otp
  .post("/re-send-otp", reSendOtp, {
    body: t.Object({
      email: t.String({ format: "email" }),
    }),
  })

  // POST /api/v1/users/forget-password
  .post("/forget-password", forgetPassword, {
    body: t.Object({
      email: t.String({ format: "email" }),
    }),
  })

  // POST /api/v1/users/reset-password
  .post("/reset-password", resetPassword, {
    body: t.Object({
      email: t.String({ format: "email" }),
      otp: t.String(),
      newpassword: t.String(),
    }),
  })

  // POST /api/v1/users/refresh-token
  .post("/refresh-token", refreshToken)

  // ──────────────── Protected Routes (need VerfyJwt) ────────────────


.use(
    authMiddleware
      .post("/logout", logOut)
      .post("/change-password", changePassword, {
        body: t.Object({
          oldpassword: t.String(),
          newpassword: t.String(),
        }),
      })
  );


  

export default authRoutes;