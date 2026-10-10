import { favoriteRepository } from "../repository/favouret.repository";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { isValidId } from "../Validators/bigintvalidator";

const parsePostIds = (postIds: unknown): number[] => {
  if (!Array.isArray(postIds) || postIds.length === 0) {
    throw new ApiError(400, "postIds must be a non-empty array");
  }

  const invalidIds = postIds.filter((id) => {
    if (typeof id !== "string" && typeof id !== "number") return true;
    return !isValidId(id);
  });

  if (invalidIds.length > 0) {
    throw new ApiError(400, `Invalid postIds: ${invalidIds.join(", ")}`);
  }

  return [...new Set(postIds.map(Number))];
};

export const addToFavouret = async ({ body, userVerified }: any) => {
  const requestedIds = body?.postIds;
  const postIds = parsePostIds(requestedIds);
  const owner = userVerified._id as string;
  const publishedPosts = await favoriteRepository.findPublishedPostIds(postIds);

  if (publishedPosts.length === 0) {
    throw new ApiError(404, "No valid published posts found for the given IDs");
  }

  const validPostIds = publishedPosts.map(({ postId }) => postId);
  const inserted = await favoriteRepository.add(owner, validPostIds);
  const added = inserted.length;
  const alreadyExisted = validPostIds.length - added;

  return new ApiResponse(
    200,
    {
      requested: requestedIds.length,
      validPosts: validPostIds.length,
      added,
      alreadyExisted,
    },
    `${added} post(s) added to favourites${alreadyExisted > 0 ? `, ${alreadyExisted} already existed` : ""}`
  );
};

export const removeFromFavouret = async ({ body, userVerified }: any) => {
  const requestedIds = body?.postIds;
  const postIds = parsePostIds(requestedIds);
  const removedRows = await favoriteRepository.remove(userVerified._id, postIds);
  const removed = removedRows.length;

  if (removed === 0) {
    throw new ApiError(404, "None of the given posts were found in your favourites");
  }

  const notFound = requestedIds.length - removed;
  return new ApiResponse(
    200,
    { requested: requestedIds.length, removed, notFound },
    `${removed} post(s) removed from favourites${notFound > 0 ? `, ${notFound} were not in your favourites` : ""}`
  );
};

export const getUserFavourets = async ({ userVerified }: any) => {
  const favorites = await favoriteRepository.listByOwner(userVerified._id);

  return new ApiResponse(
    200,
    {
      total: favorites.length,
      postIds: favorites.map(({ postId }) => String(postId)),
    },
    "Favourites fetched successfully"
  );
};