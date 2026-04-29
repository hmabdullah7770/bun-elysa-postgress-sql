import { ApiResponse } from "../utils/ApiResponse";
import { commentService } from "../services/comment.service";
import { isValidId } from "../Validators/bigintvalidator";
import { ApiError } from "../utils/ApiError";

export const newAddComment = async ({ params, body, userVerified }: any) => {
  const postId = params.postId;
  
  if (!isValidId(postId)) {
    throw new ApiError(400, "Invalid post ID");
  }

  const files = {
    audioComment: body?.audioComment,
    videoComment: body?.videoComment,
    sticker: body?.sticker,
    imageComment: body?.imageComment,
    fileComment: body?.fileComment,
  };

  const data = await commentService.addComment({
    postId,
    ownerId: userVerified._id,
    body,
    files,
  });

  return new ApiResponse(201, data, "Comment added to post successfully");
};

export const newUpdateComment = async ({ params, body, userVerified }: any) => {
  const commentId = Number(params.commentId);
  const files = {
    audioComment: body?.audioComment,
    videoComment: body?.videoComment,
    sticker: body?.sticker,
  };

  const updated = await commentService.updateComment({
    commentId,
    ownerId: userVerified._id,
    body,
    files,
  });

  return new ApiResponse(200, updated, "Post comment updated successfully");
};

export const newDeleteComment = async ({ params, body, userVerified }: any) => {
  const commentId = Number(params.commentId);
  const postId = body?.postId;

  if(!isValidId(postId)) {
    throw new ApiError(400, "Invalid post ID");
  }

  const result = await commentService.deleteComment({
    commentId,
    ownerId: userVerified._id,
    postId,
  });

  return new ApiResponse(200, result, "Post comment and its replies deleted successfully");
};

export const newGetComments = async ({ params, query, userVerified }: any) => {
  const postId = params.postId;

  
  const data = await commentService.getComments({
    postId,
    userId: userVerified._id,
    query,
  });
  return new ApiResponse(200, data, "Post comments fetched successfully");
};

export const newAddReply = async ({ params, body, userVerified }: any) => {
  const commentId = Number(params.commentId);
  const files = {
    audioComment: body?.audioComment,
    videoComment: body?.videoComment,
    sticker: body?.sticker,
    imageComment: body?.imageComment,
    fileComment: body?.fileComment,
  };

  const reply = await commentService.addReply({
    commentId,
    ownerId: userVerified._id,
    body,
    files,
  });

  return new ApiResponse(201, reply, "Reply added to comment successfully");
};

export const newGetReplies = async ({ params, query, userVerified }: any) => {
  const commentId = Number(params.commentId);
  const data = await commentService.getReplies({
    commentId,
    userId: userVerified._id,
    query,
  });
  return new ApiResponse(200, data, "Comment replies fetched successfully");
};

export const pinComment = async ({ params, body, userVerified }: any) => {
  const commentId = Number(params.commentId);
  const postId = body?.postId;
  const data = await commentService.pinComment({
    commentId,
    postId,
    userId: userVerified._id,
  });
  return new ApiResponse(200, data, "Comment pinned successfully");
};

export const unpinComment = async ({ params, body, userVerified }: any) => {
  const commentId = Number(params.commentId);
  const postId = body?.postId;
   if (!isValidId(postId)) {
    throw new ApiError(400, "Invalid post ID");
  }

  const data = await commentService.unpinComment({
    commentId,
    postId,
    userId: userVerified._id,
  });
  return new ApiResponse(200, data, "Comment unpinned successfully");
};

export const toggleCommentLike = async ({ params, userVerified }: any) => {
  const commentId = Number(params.commentId);
  const r = await commentService.toggleLike({ commentId, userId: userVerified._id });
  return new ApiResponse(200, {
    commentId: r.commentId,
    numberOfLikes: r.numberOfLikes,
    numberOfDislikes: r.numberOfDislikes,
    userHasLiked: r.userHasLiked,
    userHasDisliked: r.userHasDisliked,
  }, r.message);
};

export const toggleCommentDislike = async ({ params, userVerified }: any) => {
  const commentId = Number(params.commentId);
  const r = await commentService.toggleDislike({ commentId, userId: userVerified._id });
  return new ApiResponse(200, {
    commentId: r.commentId,
    numberOfLikes: r.numberOfLikes,
    numberOfDislikes: r.numberOfDislikes,
    userHasLiked: r.userHasLiked,
    userHasDisliked: r.userHasDisliked,
  }, r.message);
};

export const getCommentLikeStatus = async ({ params, userVerified }: any) => {
  const commentId = Number(params.commentId);
  const data = await commentService.getLikeStatus({ commentId, userId: userVerified._id });
  return new ApiResponse(200, data, "Comment like status fetched successfully");
};

export const searchComments = async ({ params, query, userVerified }: any) => {
  const postId = params.postId;
  const data = await commentService.search({
    postId,
    userId: userVerified._id,
    query,
  });
  return new ApiResponse(200, data, `Found ${data.pagination.totalMatches} matching comment${data.pagination.totalMatches !== 1 ? "s" : ""}`);
};

// Not yet supported in Postgres (ratings still Mongo in this repo) â€” keep endpoint stable.
export const newGetCommentsWithRatings = async ({ params }: any) => {
  return new ApiResponse(
    200,
    { comments: [], pagination: { page: 1, limit: 10, totalComments: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false } },
    "Post comments with ratings fetched successfully"
  );
};

