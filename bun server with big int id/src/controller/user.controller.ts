// src/controllers/user.controller.ts
import { userService } from "../services/user.service";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { isUUID } from "../Validators/isUUID";
import { mapUserToDto } from "../../Mapper/user.mapper";

// âœ… Let Elysia pass its full context, just destructure what you need
export const getuser = async ({ userVerified }: any) => {
  const user = await userService.getCurrentUser(userVerified._id);
  return new ApiResponse(200, mapUserToDto(user), "User found successfully");
};

export const getuserwithId = async ({ params, userVerified }: any) => {
  if (!isUUID(params.id)) throw new ApiError(400, "Invalid user ID");

  const user = await userService.getUserById(params.id, userVerified);
  return new ApiResponse(200, mapUserToDto(user), "User found successfully");
};

export const updateuser = async ({ body, userVerified }: any) => {
  const updatedUser = await userService.updateUser(userVerified._id, body);
  return new ApiResponse(
    200,
    mapUserToDto(updatedUser),
    Object.keys(body).length === 0
      ? "No changes to update"
      : "User updated successfully"
  );
};

export const changeavatar = async ({ body, userVerified }: any) => {
  const user = await userService.changeAvatar(userVerified._id, body.avatar);
  return new ApiResponse(
    200,
    mapUserToDto(user),
    "Avatar changed successfully"
  );
};

export const changecoverImage = async ({ body, userVerified }: any) => {
  const user = await userService.changeCoverImage(userVerified._id, body.coverImage);
  return new ApiResponse(
    200,
    mapUserToDto(user),
    "cover image change succesfully "
  );
};

export const followlistcon = async ({ params, userVerified }: any) => {
  const profile = await userService.getUserProfile(params.username, userVerified._id);
  return new ApiResponse(
    200,
    mapUserToDto(profile),
    "User channel fetched successfully"
  );
};

export const getWatchHistory = async ({ userVerified }: any) => {
  const history = await userService.getWatchHistory(userVerified._id);
  return new ApiResponse(200, history, "Watch history fetched successfully");
};

export const getuserwithoutfollowing = async ({ userVerified }: any) => {
  const user = await userService.getUserWithoutFollowing(userVerified._id);
  return new ApiResponse(200, mapUserToDto(user), "User found successfully");
};
