import { ApiError } from "../utils/ApiError";
import { isUUID } from "../Validators/isUUID";
import { ApiResponse } from "../utils/ApiResponse";
import { followListService } from "../services/followlist.service";

const validateUserId = (userId: string) => {
  if (!isUUID(userId)) throw new ApiError(400, "Invalid user ID");
};

const parsePageValue = (
  value: string | undefined,
  fallback: number,
  label: string
) => {
  if (value === undefined) return fallback;
  if (!/^[1-9]\d*$/.test(value)) throw new ApiError(400, `Invalid ${label}`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new ApiError(400, `Invalid ${label}`);
  return parsed;
};

const parsePagination = (query: { page?: string; limit?: string }) => ({
  page: parsePageValue(query.page, 1, "page"),
  limit: parsePageValue(query.limit, 10, "limit"),
});

export const toggleFollow = async ({
  params,
  userVerified,
}: {
  params: { followingId: string };
  userVerified: { _id: string; username: string };
}) => {
  validateUserId(params.followingId);
  const result = await followListService.toggleFollow(
    params.followingId,
    userVerified
  );
  return new ApiResponse(
    200,
    result,
    result.followed ? "Followed successfully" : "Unfollowed successfully"
  );
};

export const getUserFollowers = async ({
  params,
  query,
}: {
  params: { userId: string };
  query: { page?: string; limit?: string };
}) => {
  validateUserId(params.userId);
  const { page, limit } = parsePagination(query);
  const result = await followListService.getFollowers(
    params.userId,
    page,
    limit
  );
  return new ApiResponse(200, result, "User followers fetched successfully");
};

export const getUserFollowing = async ({
  params,
  query,
}: {
  params: { userId: string };
  query: { page?: string; limit?: string };
}) => {
  validateUserId(params.userId);
  const { page, limit } = parsePagination(query);
  const result = await followListService.getFollowing(
    params.userId,
    page,
    limit
  );
  return new ApiResponse(
    200,
    result,
    "User following list fetched successfully"
  );
};

export const isFollowing = async ({
  params,
  userVerified,
}: {
  params: { userId: string };
  userVerified: { _id: string };
}) => {
  validateUserId(params.userId);
  const result = await followListService.isFollowing(
    userVerified._id,
    params.userId
  );
  return new ApiResponse(200, result, "Follow status fetched successfully");
};

export const getUserFollowStats = async ({
  params,
}: {
  params: { userId: string };
}) => {
  validateUserId(params.userId);
  const result = await followListService.getFollowStats(params.userId);
  return new ApiResponse(200, result, "User follow stats fetched successfully");
};
