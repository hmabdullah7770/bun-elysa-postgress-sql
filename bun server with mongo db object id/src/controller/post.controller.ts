import { ApiResponse } from "../utils/ApiResponse";
import { postService } from "../services/post.service";

export const getAllPosts = async ({ query, userVerified }: any) => {
  const data = await postService.getAllPosts({ query, userVerified });
  const message =
    data.posts.length === 0
      ? query?.cursor
        ? query?.direction === "newer"
          ? "No newer posts found"
          : "No more posts found"
        : "No posts found"
      : "Posts fetched successfully";
  return new ApiResponse(200, data, message);
};

export const publishPost = async ({ body, userVerified }: any) => {
  const post = await postService.publishPost({ body, userVerified });
  return new ApiResponse(201, post, "Post created successfully");
};

export const getPostById = async ({ params }: any) => {
  const post = await postService.getPostById({ postId: params.postId });
  return new ApiResponse(200, post, "Post fetched successfully");
};

export const updatePost = async ({ params, body, userVerified }: any) => {
  const post = await postService.updatePost({
    postId: params.postId,
    userId: userVerified._id,
    body,
  });
  return new ApiResponse(200, post, "Post updated successfully");
};

export const deletePost = async ({ params, userVerified }: any) => {
  const data = await postService.deletePost({
    postId: params.postId,
    userId: userVerified._id,
  });
  return new ApiResponse(200, data, "Post deleted successfully");
};

export const togglePublishStatus = async ({ params, userVerified }: any) => {
  const data = await postService.togglePublishStatus({
    postId: params.postId,
    userId: userVerified._id,
  });
  return new ApiResponse(
    200,
    data,
    `Post ${data.isPublished ? "published" : "unpublished"} successfully`
  );
};

export const incrementSocialLinkView = async ({ params }: any) => {
  const data = await postService.incrementSocialLinkView({
    postId: params.postId,
    linkType: params.linkType,
  });
  return new ApiResponse(200, data, "View counted and link retrieved");
};

export const removeMediaFiles = async ({ params, body, userVerified }: any) => {
  const data = await postService.removeMediaFiles({
    postId: params.postId,
    userId: userVerified._id,
    body,
  });
  return new ApiResponse(200, data, "Media files removed successfully");
};

