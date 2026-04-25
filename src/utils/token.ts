// src/utils/token.ts
import jwt from "jsonwebtoken";

// ─── Types ──────────────────────────────────────────────────────
interface TokenUser {
  id: string;
  email: string;
  fullName: string | null;
  username: string;
}

interface AccessTokenPayload {
  _id: string;
  email: string;
  fullname: string | null;
  username: string;
}

interface RefreshTokenPayload {
  _id: string;
}

// ─── Generate Access Token ──────────────────────────────────────
// Replaces: userSchema.methods.getAccessToken
export const generateAccessToken = (user: TokenUser): string => {
  return jwt.sign(
    {
      _id: user.id,
      email: user.email,
      fullname: user.fullName,
      username: user.username,
    } as AccessTokenPayload,
    process.env.ACCESS_TOKEN_SECRET!,
    {
      expiresIn: (process.env.ACCESS_TOKEN_EXPIRY || "1d")  as unknown as number,
    }
  );
};

// ─── Generate Refresh Token ────────────────────────────────────
// Replaces: userSchema.methods.getRefreshToken
export const generateRefreshToken = (user: TokenUser): string => {
  return jwt.sign(
    {
      _id: user.id,
    } as RefreshTokenPayload,
    process.env.REFRESH_TOKEN_SECRET!,
    {
      expiresIn: ( process.env.REFRESH_TOKEN_EXPIRY || "10d") as unknown as number,
    }
  );
};

// ─── Verify Access Token ───────────────────────────────────────
export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(
    token,
    process.env.ACCESS_TOKEN_SECRET!
  ) as AccessTokenPayload;
};

// ─── Verify Refresh Token ──────────────────────────────────────
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(
    token,
    process.env.REFRESH_TOKEN_SECRET!
  ) as RefreshTokenPayload;
};

// // src/utils/token.ts
// import jwt from "jsonwebtoken";
// import type { User } from "../schemas/user.schema";

// export const generateAccessToken = (user: User): string => {
//   return jwt.sign(
//     {
//       _id: user.id,
//       email: user.email,
//       fullname: user.fullName,
//       username: user.username,
//     },
//     process.env.ACCESS_TOKEN_SECRET!,
//     { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d" }
//   );
// };

// export const generateRefreshToken = (user: User): string => {
//   return jwt.sign(
//     { _id: user.id },
//     process.env.REFRESH_TOKEN_SECRET!,
//     { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "10d" }
//   );
// };

// export const verifyAccessToken = (token: string) => {
//   return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as {
//     _id: string;
//     email: string;
//     fullname: string;
//     username: string;
//   };
// };

// export const verifyRefreshToken = (token: string) => {
//   return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!) as {
//     _id: string;
//   };
// };