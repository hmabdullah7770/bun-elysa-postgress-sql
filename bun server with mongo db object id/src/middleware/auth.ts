// src/middleware/auth.ts
import { Elysia } from "elysia";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken } from "../utils/token";
import { userRepository } from "../repository/user.repository";

export const authMiddleware = new Elysia({ name: "auth-middleware" }).derive(
  async ({ headers, cookie }) => {
    const token =
      cookie?.accessToken?.value ||
      headers.authorization?.replace("Bearer ", "");


      console.log("Auth Middleware - Incoming Token:");

    if (!token) {
      throw new ApiError(401, "Unauthorized - No token provided");
    }

    try {
      const decoded = verifyAccessToken(token as string);

      const user = await userRepository.findById(decoded._id);
      if (!user) {
        throw new ApiError(401, "Unauthorized - User not found");
      }

      return {
        userVerified: {
          _id: user._id,
          // id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(401, "Unauthorized - Invalid token");
    }
  }
);