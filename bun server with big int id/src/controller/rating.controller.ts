import { ratingService } from "../services/rating.service";
import { isValidId } from "../Validators/bigintvalidator";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

const parseId = (value: unknown, label: string) => {
  const validString = typeof value === "string" && /^\d+$/.test(value);
  const validNumber = typeof value === "number" && Number.isSafeInteger(value);
  if ((!validString && !validNumber) || !isValidId(value as string | number)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
  return Number(value);
};

const parsePositiveQuery = (value: unknown, fallback: number, label: string) => {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new ApiError(400, `Invalid ${label}`);
  }
  return parsed;
};

export const getPostRatings = async ({ params, query }: any) => {
  const postId = parseId(params.postId, "post ID");
  const page = parsePositiveQuery(query.page, 1, "page");
  const limit = Math.min(parsePositiveQuery(query.limit, 10, "limit"), 100);
  const sortBy = ["rating", "createdAt", "updatedAt"].includes(query.sortBy)
    ? query.sortBy
    : "rating";
  const sortType = query.sortType === "asc" ? "asc" : "desc";
  const data = await ratingService.getPostRatings({ postId, page, limit, sortBy, sortType });
  return new ApiResponse(200, data, "Ratings fetched successfully");
};

export const addRating = async ({ body, userVerified }: any) => {
  const entries = body?.posts;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new ApiError(400, "posts must be a non-empty array of { postId, rating }");
  }

  const parsedEntries = entries.map((item: any) => {
    if (!item || typeof item !== "object") throw new ApiError(400, "Invalid rating entry");
    const postId = parseId(item.postId, "post ID");
    if (
      item.rating !== null &&
      (!Number.isInteger(item.rating) || item.rating < 1 || item.rating > 5)
    ) {
      throw new ApiError(400, `Rating for postId ${item.postId} must be between 1 and 5, or null to unrate`);
    }
    if (item.comment !== undefined && item.comment !== null && typeof item.comment !== "string") {
      throw new ApiError(400, "Rating comment must be a string or null");
    }
    return {
      postId,
      rating: item.rating as number | null,
      ...(item.comment !== undefined ? { comment: item.comment } : {}),
    };
  });

  if (new Set(parsedEntries.map(({ postId }) => postId)).size !== parsedEntries.length) {
    throw new ApiError(400, "Each postId may only appear once per request");
  }

  const data = await ratingService.addRatings(userVerified._id, parsedEntries);
  return new ApiResponse(200, data, "Ratings processed successfully");
};

export const updateRating = async ({ params, body, userVerified }: any) => {
  const ratingId = parseId(params.ratingId, "rating ID");
  if (body.rating === undefined && body.comment === undefined) {
    throw new ApiError(400, "Provide a rating or comment to update");
  }
  if (
    body.rating !== undefined &&
    (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5)
  ) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }
  if (body.comment !== undefined && body.comment !== null && typeof body.comment !== "string") {
    throw new ApiError(400, "Rating comment must be a string or null");
  }

  const data = await ratingService.updateRating(ratingId, userVerified._id, body);
  return new ApiResponse(200, data, "Rating updated successfully");
};

export const deleteRating = async ({ params, userVerified }: any) => {
  const ratingId = parseId(params.ratingId, "rating ID");
  await ratingService.deleteRating(ratingId, userVerified._id);
  return new ApiResponse(200, {}, "Rating deleted successfully");
};

export const getPostRatingSummary = async ({ params }: any) => {
  const postId = parseId(params.postId, "post ID");
  const data = await ratingService.getSummary(postId);
  return new ApiResponse(200, data, "Rating summary fetched successfully");
};

export const getUserRatingForPost = async ({ params, userVerified }: any) => {
  const postId = parseId(params.postId, "post ID");
  const rating = await ratingService.getUserRating(postId, userVerified._id);
  return new ApiResponse(
    200,
    rating,
    rating ? "User rating fetched successfully" : "User has not rated this post yet"
  );
};