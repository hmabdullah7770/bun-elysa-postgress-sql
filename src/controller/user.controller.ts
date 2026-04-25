// src/controllers/user.controller.ts
import { userService } from "../services/user.service";
import { ApiResponse } from "../utils/ApiResponse";

// ✅ Let Elysia pass its full context, just destructure what you need
export const getuser = async ({ userVerified }: any) => {
  const user = await userService.getCurrentUser(userVerified._id);
  return new ApiResponse(200, user, "User found successfully");
};

export const getuserwithId = async ({ params }: any) => {
  const user = await userService.getUserById(params.id);
  return new ApiResponse(200, user, "User found successfully");
};

export const updateuser = async ({ body, userVerified }: any) => {
  const updatedUser = await userService.updateUser(userVerified._id, body);
  return new ApiResponse(200, updatedUser, "User updated successfully");
};

export const changeavatar = async ({ body, userVerified }: any) => {
  const user = await userService.changeAvatar(userVerified._id, body.avatar);
  return new ApiResponse(200, user, "Avatar changed successfully");
};

export const changecoverImage = async ({ body, userVerified }: any) => {
  const user = await userService.changeCoverImage(userVerified._id, body.coverImage);
  return new ApiResponse(200, user, "Cover image changed successfully");
};

export const followlistcon = async ({ params, userVerified }: any) => {
  const profile = await userService.getUserProfile(params.username, userVerified._id);
  return new ApiResponse(200, profile, "User channel fetched successfully");
};

export const getWatchHistory = async ({ userVerified }: any) => {
  const history = await userService.getWatchHistory(userVerified._id);
  return new ApiResponse(200, history, "Watch history fetched successfully");
};

export const getuserwithoutfollowing = async ({ userVerified }: any) => {
  const user = await userService.getUserWithoutFollowing(userVerified._id);
  return new ApiResponse(200, user, "User found successfully");
};

