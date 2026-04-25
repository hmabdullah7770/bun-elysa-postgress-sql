import { ApiError } from "../utils/ApiError";
import { commentRepository } from "../repository/comment.repository";
import { uploadResult, saveTempFile } from "../utils/cloudinary";

const deriveCommentType = (input: {
  content?: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
  imageUrl?: string | null;
  stickerUrl?: string | null;
  fileUrl?: string | null;
}) => {
  const hasText = Boolean(input.content && input.content.trim());
  const hasAudio = Boolean(input.audioUrl);
  const hasVideo = Boolean(input.videoUrl);
  const hasImage = Boolean(input.imageUrl);
  const hasSticker = Boolean(input.stickerUrl);
  const hasFile = Boolean(input.fileUrl);

  if (hasText && hasAudio) return "text_audio";
  if (hasText && hasVideo) return "text_video";
  if (hasText && hasImage) return "text_image";
  if (hasText && hasSticker) return "text_sticker";
  if (hasText && hasFile) return "text_file";
  if (hasAudio) return "audio";
  if (hasVideo) return "video";
  if (hasImage) return "image";
  if (hasSticker) return "sticker";
  if (hasFile) return "file";
  return "text";
};

const toFrontendComment = (
  row: any,
  opts?: { currentUserId?: string; extra?: Record<string, any> }
) => {
  const comment = row?.comment ?? row;
  const owner = row?.owner ?? null;

  const currentUserId = opts?.currentUserId;
  const likedBy: string[] = comment?.likedBy ?? [];
  const dislikedBy: string[] = comment?.dislikedBy ?? [];

  return {
    _id: comment._id,
    inCommentId: comment.inCommentId?.toString?.() ?? String(comment.inCommentId),
    content: comment.content ?? null,
    commentType: comment.commentType,
    audioUrl: comment.audioUrl ?? null,
    videoUrl: comment.videoUrl ?? null,
    imageUrl: comment.imageUrl ?? null,
    stickerUrl: comment.stickerUrl ?? null,
    fileUrl: comment.fileUrl ?? null,
    postId: comment.postId,
    pinned: Boolean(comment.pinned),
    owner: owner
      ? {
          _id: owner._id,
          username: owner.username,
          fullName: owner.fullName,
          avatar: owner.avatar,
        }
      : comment.owner,
    parentComment: comment.parentComment ?? null,
    isReply: Boolean(comment.isReply),
    numberOfLikes: Number(comment.numberOfLikes ?? 0),
    numberOfDislikes: Number(comment.numberOfDislikes ?? 0),
    userHasLiked: currentUserId ? likedBy.includes(currentUserId) : false,
    userHasDisliked: currentUserId ? dislikedBy.includes(currentUserId) : false,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    ...(opts?.extra ?? {}),
  };
};

export class CommentService {
  async addComment(params: {
    postId: string;
    ownerId: string;
    body: { content?: string; pinned?: boolean | string };
    files: {
      audioComment?: File;
      videoComment?: File;
      sticker?: File;
      imageComment?: File;
      fileComment?: File;
    };
  }) {
    const content = typeof params.body.content === "string" ? params.body.content : undefined;
    const hasText = Boolean(content && content.trim().length > 0);

    const hasAudio = Boolean(params.files.audioComment);
    const hasVideo = Boolean(params.files.videoComment);
    const hasSticker = Boolean(params.files.sticker);
    const hasImage = Boolean(params.files.imageComment);
    const hasFile = Boolean(params.files.fileComment);
    const hasMedia = hasAudio || hasVideo || hasSticker || hasImage || hasFile;

    if (!hasText && !hasMedia) {
      throw new ApiError(
        400,
        "Provide text or at least one media (audio/video/image/sticker/file)"
      );
    }

    const shouldPin = params.body.pinned === true || params.body.pinned === "true";

    // Upload media (if present)
    let audioUrl: string | null = null;
    let videoUrl: string | null = null;
    let stickerUrl: string | null = null;
    let imageUrl: string | null = null;
    let fileUrl: string | null = null;

    const uploads: Promise<void>[] = [];

    if (params.files.audioComment) {
      uploads.push(
        (async () => {
          const p = await saveTempFile(params.files.audioComment!);
          const r = await uploadResult(p);
          if (!r?.secure_url && !r?.url) throw new ApiError(500, "Audio upload failed");
          audioUrl = (r.secure_url || r.url) ?? null;
        })()
      );
    }

    if (params.files.videoComment) {
      uploads.push(
        (async () => {
          const p = await saveTempFile(params.files.videoComment!);
          const r = await uploadResult(p, true);
          if (!r?.secure_url && !r?.url) throw new ApiError(500, "Video upload failed");
          videoUrl = (r.secure_url || r.url) ?? null;
        })()
      );
    }

    if (params.files.sticker) {
      uploads.push(
        (async () => {
          const p = await saveTempFile(params.files.sticker!);
          const r = await uploadResult(p);
          if (!r?.secure_url && !r?.url) throw new ApiError(500, "Sticker upload failed");
          stickerUrl = (r.secure_url || r.url) ?? null;
        })()
      );
    }

    if (params.files.imageComment) {
      uploads.push(
        (async () => {
          const p = await saveTempFile(params.files.imageComment!);
          const r = await uploadResult(p);
          if (!r?.secure_url && !r?.url) throw new ApiError(500, "Image upload failed");
          imageUrl = (r.secure_url || r.url) ?? null;
        })()
      );
    }

    if (params.files.fileComment) {
      uploads.push(
        (async () => {
          const p = await saveTempFile(params.files.fileComment!);
          const r = await uploadResult(p);
          if (!r?.secure_url && !r?.url) throw new ApiError(500, "File upload failed");
          fileUrl = (r.secure_url || r.url) ?? null;
        })()
      );
    }

    await Promise.all(uploads);

    if (shouldPin) {
      await commentRepository.unpinForPost(params.postId);
    }

    const allocatedId = await commentRepository.nextCommentId();
    const inCommentId = BigInt(allocatedId) * 100000n + BigInt(Math.floor(Math.random() * 100000));

    const commentType = deriveCommentType({
      content: hasText ? content : null,
      audioUrl,
      videoUrl,
      imageUrl,
      stickerUrl,
      fileUrl,
    });

    const created = await commentRepository.create({
      _id: allocatedId,
      inCommentId,
      postId: params.postId,
      owner: params.ownerId,
      content: hasText ? content! : null,
      pinned: shouldPin,
      isReply: false,
      parentComment: null,
      commentType,
      audioUrl,
      videoUrl,
      stickerUrl,
      imageUrl,
      fileUrl,
    });

    if (!created) throw new ApiError(500, "Comment creation failed");

    const withOwner = await commentRepository.findByIdWithOwner(created._id);
    return toFrontendComment(withOwner, { currentUserId: params.ownerId });
  }

  async updateComment(params: {
    commentId: number;
    ownerId: string;
    body: { content?: string };
    files: {
      audioComment?: File;
      videoComment?: File;
      sticker?: File;
    };
  }) {
    const content = typeof params.body.content === "string" ? params.body.content : "";
    if (!content || !content.trim()) throw new ApiError(400, "Comment content is required");

    const existing = await commentRepository.findById(params.commentId);
    if (!existing) throw new ApiError(404, "Comment not found");

    if (existing.owner !== params.ownerId) {
      throw new ApiError(403, "You are not authorized to update this comment");
    }

    const patch: any = { content };

    if (params.files.audioComment) {
      const p = await saveTempFile(params.files.audioComment);
      const r = await uploadResult(p);
      if (!r?.secure_url && !r?.url) throw new ApiError(400, "Audio upload failed");
      patch.audioUrl = (r.secure_url || r.url) ?? null;
    }
    if (params.files.videoComment) {
      const p = await saveTempFile(params.files.videoComment);
      const r = await uploadResult(p, true);
      if (!r?.secure_url && !r?.url) throw new ApiError(400, "Video upload failed");
      patch.videoUrl = (r.secure_url || r.url) ?? null;
    }
    if (params.files.sticker) {
      const p = await saveTempFile(params.files.sticker);
      const r = await uploadResult(p);
      if (!r?.secure_url && !r?.url) throw new ApiError(400, "Sticker upload failed");
      patch.stickerUrl = (r.secure_url || r.url) ?? null;
    }

    patch.commentType = deriveCommentType({
      content,
      audioUrl: patch.audioUrl ?? existing.audioUrl,
      videoUrl: patch.videoUrl ?? existing.videoUrl,
      imageUrl: existing.imageUrl,
      stickerUrl: patch.stickerUrl ?? existing.stickerUrl,
      fileUrl: existing.fileUrl,
    });

    const updated = await commentRepository.updateById(params.commentId, patch);
    if (!updated) throw new ApiError(500, "Failed to update comment");

    const withOwner = await commentRepository.findByIdWithOwner(updated._id);
    return toFrontendComment(withOwner, { currentUserId: params.ownerId });
  }

  async deleteComment(params: { commentId: number; ownerId: string; postId: string }) {
    const existing = await commentRepository.findById(params.commentId);
    if (!existing) throw new ApiError(404, "Comment not found");
    if (existing.postId !== params.postId) throw new ApiError(404, "Comment not found");
    if (existing.owner !== params.ownerId) {
      throw new ApiError(403, "You are not authorized to delete this comment");
    }

    await commentRepository.deleteCascade(params.commentId);
    return {};
  }

  async addReply(params: {
    commentId: number;
    ownerId: string;
    body: { content?: string };
    files: {
      audioComment?: File;
      videoComment?: File;
      sticker?: File;
      imageComment?: File;
      fileComment?: File;
    };
  }) {
    const parent = await commentRepository.findById(params.commentId);
    if (!parent) throw new ApiError(404, "Parent comment not found");

    const content = typeof params.body.content === "string" ? params.body.content : undefined;
    const hasText = Boolean(content && content.trim().length > 0);

    const hasAudio = Boolean(params.files.audioComment);
    const hasVideo = Boolean(params.files.videoComment);
    const hasSticker = Boolean(params.files.sticker);
    const hasImage = Boolean(params.files.imageComment);
    const hasFile = Boolean(params.files.fileComment);
    const hasMedia = hasAudio || hasVideo || hasSticker || hasImage || hasFile;

    if (!hasText && !hasMedia) {
      throw new ApiError(
        400,
        "Provide text or at least one media (audio/video/image/sticker/file)"
      );
    }

    let audioUrl: string | null = null;
    let videoUrl: string | null = null;
    let stickerUrl: string | null = null;
    let imageUrl: string | null = null;
    let fileUrl: string | null = null;

    const uploads: Promise<void>[] = [];
    if (params.files.audioComment) {
      uploads.push(
        (async () => {
          const p = await saveTempFile(params.files.audioComment!);
          const r = await uploadResult(p);
          if (!r?.secure_url && !r?.url) throw new ApiError(500, "Audio upload failed");
          audioUrl = (r.secure_url || r.url) ?? null;
        })()
      );
    }
    if (params.files.videoComment) {
      uploads.push(
        (async () => {
          const p = await saveTempFile(params.files.videoComment!);
          const r = await uploadResult(p, true);
          if (!r?.secure_url && !r?.url) throw new ApiError(500, "Video upload failed");
          videoUrl = (r.secure_url || r.url) ?? null;
        })()
      );
    }
    if (params.files.sticker) {
      uploads.push(
        (async () => {
          const p = await saveTempFile(params.files.sticker!);
          const r = await uploadResult(p);
          if (!r?.secure_url && !r?.url) throw new ApiError(500, "Sticker upload failed");
          stickerUrl = (r.secure_url || r.url) ?? null;
        })()
      );
    }
    if (params.files.imageComment) {
      uploads.push(
        (async () => {
          const p = await saveTempFile(params.files.imageComment!);
          const r = await uploadResult(p);
          if (!r?.secure_url && !r?.url) throw new ApiError(500, "Image upload failed");
          imageUrl = (r.secure_url || r.url) ?? null;
        })()
      );
    }
    if (params.files.fileComment) {
      uploads.push(
        (async () => {
          const p = await saveTempFile(params.files.fileComment!);
          const r = await uploadResult(p);
          if (!r?.secure_url && !r?.url) throw new ApiError(500, "File upload failed");
          fileUrl = (r.secure_url || r.url) ?? null;
        })()
      );
    }

    await Promise.all(uploads);

    const allocatedId = await commentRepository.nextCommentId();
    const inCommentId = BigInt(allocatedId) * 100000n + BigInt(Math.floor(Math.random() * 100000));

    const commentType = deriveCommentType({
      content: hasText ? content : null,
      audioUrl,
      videoUrl,
      imageUrl,
      stickerUrl,
      fileUrl,
    });

    const created = await commentRepository.create({
      _id: allocatedId,
      inCommentId,
      postId: parent.postId,
      owner: params.ownerId,
      content: hasText ? content! : null,
      pinned: false,
      isReply: true,
      parentComment: parent._id,
      commentType,
      audioUrl,
      videoUrl,
      stickerUrl,
      imageUrl,
      fileUrl,
    });

    if (!created) throw new ApiError(500, "Reply creation failed");
    const withOwner = await commentRepository.findByIdWithOwner(created._id);
    return toFrontendComment(withOwner, { currentUserId: params.ownerId });
  }

  async getComments(params: {
    postId: string;
    userId: string;
    query: any;
  }) {
    const {
      cursor = null,
      limit = 25,
      sortType = "desc",
      includeReplies = "false",
      includeGrandTotal = "false",
      getHasReply = "true",
      getRepliesCount = "false",
      pinnedComment = "true",
    } = params.query ?? {};

    const limitNumber = Math.max(1, Number(limit) || 25);
    const shouldIncludeReplies = includeReplies === "true";
    const shouldIncludeGrandTotal = includeGrandTotal === "true";
    const shouldGetHasReply = getHasReply === "true";
    const shouldGetRepliesCount = getRepliesCount === "true";
    const shouldGetPinnedComment = pinnedComment === "true";

    const cursorRow = cursor ? await commentRepository.findByInCommentId(String(cursor)) : undefined;
    const cursorCreatedAt = cursorRow?.createdAt ?? null;

    const topLevel = await commentRepository.findTopLevelPage({
      postId: params.postId,
      limit: limitNumber + 1,
      sortType: sortType === "asc" ? "asc" : "desc",
      cursorCreatedAt,
      excludePinned: shouldGetPinnedComment,
    });

    const hasNextPage = topLevel.length > limitNumber;
    const pageItems = hasNextPage ? topLevel.slice(0, limitNumber) : topLevel;

    const priority: any[] = [];
    if (shouldGetPinnedComment) {
      const pinned = await commentRepository.findPinnedForPost(params.postId);
      if (pinned) priority.push({ ...pinned, __extra: { isPinned: true } });
    }

    const merged = [...priority, ...pageItems].slice(0, limitNumber);
    const commentIds = merged.map((r) => r.comment._id);

    let metadataMap = new Map<string, number>();
    if ((shouldGetHasReply || shouldGetRepliesCount) && commentIds.length) {
      metadataMap = await commentRepository.getReplyCounts(commentIds);
    }

    const finalComments = merged.map((r) => {
      const count = metadataMap.get(String(r.comment._id)) || 0;
      const extra: any = { ...(r.__extra ?? {}) };
      if (shouldGetHasReply) extra.hasReply = count > 0;
      if (shouldGetRepliesCount) extra.repliesCount = count;
      if (shouldIncludeReplies) {
        extra.replies = [];
        extra.replyCount = 0;
      }
      return toFrontendComment(r, { currentUserId: params.userId, extra });
    });

    const nextCursor =
      finalComments.length > 0
        ? finalComments[finalComments.length - 1]?.inCommentId ?? null
        : null;

    // totalComments / grandTotal not implemented without posts table; keep same keys
    const totalComments = shouldIncludeGrandTotal ? finalComments.length : finalComments.length;

    return {
      comments: finalComments,
      pagination: {
        limit: limitNumber,
        nextCursor: hasNextPage ? nextCursor : null,
        hasNextPage,
        totalComments,
        ...(shouldIncludeGrandTotal ? { grandTotal: totalComments } : {}),
      },
    };
  }

  async getReplies(params: { commentId: number; userId: string; query: any }) {
    const {
      cursor = null,
      limit = 10,
      sortType = "desc",
      getHasReply = "true",
      getRepliesCount = "false",
      getTotalCount = "false",
    } = params.query ?? {};

    const limitNumber = Math.max(1, Number(limit) || 10);
    const shouldGetHasReply = getHasReply === "true";
    const shouldGetRepliesCount = getRepliesCount === "true";
    const shouldGetTotalCount = getTotalCount === "true";

    const parent = await commentRepository.findById(params.commentId);
    if (!parent) throw new ApiError(404, "Parent comment not found");

    const cursorRow = cursor ? await commentRepository.findByInCommentId(String(cursor)) : undefined;
    const cursorCreatedAt = cursorRow?.createdAt ?? null;

    const replies = await commentRepository.findRepliesPage({
      parentComment: params.commentId,
      limit: limitNumber + 1,
      sortType: sortType === "asc" ? "asc" : "desc",
      cursorCreatedAt,
    });

    const hasNextPage = replies.length > limitNumber;
    const pageItems = hasNextPage ? replies.slice(0, limitNumber) : replies;

    let metadataMap = new Map<string, number>();
    if ((shouldGetHasReply || shouldGetRepliesCount) && pageItems.length) {
      const ids = pageItems.map((r) => r.comment._id);
      metadataMap = await commentRepository.getReplyCounts(ids);
    }

    const finalReplies = pageItems.map((r) => {
      const count = metadataMap.get(String(r.comment._id)) || 0;
      const extra: any = {};
      if (shouldGetHasReply) extra.hasReply = count > 0;
      if (shouldGetRepliesCount) extra.repliesCount = count;
      return toFrontendComment(r, { currentUserId: params.userId, extra });
    });

    const nextCursor =
      finalReplies.length > 0
        ? finalReplies[finalReplies.length - 1]?.inCommentId ?? null
        : null;

    return {
      replies: finalReplies,
      pagination: {
        limit: limitNumber,
        nextCursor: hasNextPage ? nextCursor : null,
        hasNextPage,
        ...(shouldGetTotalCount ? { totalReplies: finalReplies.length } : {}),
      },
    };
  }

  async pinComment(params: { commentId: number; postId: string; userId: string }) {
    const c = await commentRepository.findById(params.commentId);
    if (!c || c.postId !== params.postId || c.isReply) {
      throw new ApiError(
        404,
        "Comment not found or cannot be pinned (only top-level comments can be pinned)"
      );
    }

    if (c.pinned) throw new ApiError(400, "Comment is already pinned");
    await commentRepository.unpinForPost(params.postId);
    const updated = await commentRepository.updateById(params.commentId, { pinned: true });
    if (!updated) throw new ApiError(500, "Failed to pin comment");
    const withOwner = await commentRepository.findByIdWithOwner(updated._id);
    return toFrontendComment(withOwner, { currentUserId: params.userId });
  }

  async unpinComment(params: { commentId: number; postId: string; userId: string }) {
    const c = await commentRepository.findById(params.commentId);
    if (!c || c.postId !== params.postId || !c.pinned) throw new ApiError(404, "Pinned comment not found");
    const updated = await commentRepository.updateById(params.commentId, { pinned: false });
    if (!updated) throw new ApiError(500, "Failed to unpin comment");
    const withOwner = await commentRepository.findByIdWithOwner(updated._id);
    return toFrontendComment(withOwner, { currentUserId: params.userId });
  }

  async toggleLike(params: { commentId: number; userId: string }) {
    const c = await commentRepository.findById(params.commentId);
    if (!c) throw new ApiError(404, "Comment not found");

    const userId = params.userId;
    const likedBy = Array.isArray(c.likedBy) ? [...c.likedBy] : [];
    const dislikedBy = Array.isArray(c.dislikedBy) ? [...c.dislikedBy] : [];

    const hasLiked = likedBy.includes(userId);
    const hasDisliked = dislikedBy.includes(userId);

    let numberOfLikes = Number(c.numberOfLikes || 0);
    let numberOfDislikes = Number(c.numberOfDislikes || 0);

    if (hasLiked) {
      const next = likedBy.filter((x) => x !== userId);
      numberOfLikes = Math.max(0, numberOfLikes - 1);
      await commentRepository.updateById(params.commentId, {
        likedBy: next as any,
        numberOfLikes,
      });
      return {
        commentId: c._id,
        numberOfLikes,
        numberOfDislikes,
        userHasLiked: false,
        userHasDisliked: hasDisliked,
        message: "Like removed successfully",
      };
    }

    likedBy.push(userId);
    numberOfLikes += 1;

    if (hasDisliked) {
      const nextDisliked = dislikedBy.filter((x) => x !== userId);
      numberOfDislikes = Math.max(0, numberOfDislikes - 1);
      await commentRepository.updateById(params.commentId, {
        likedBy: likedBy as any,
        dislikedBy: nextDisliked as any,
        numberOfLikes,
        numberOfDislikes,
      });
    } else {
      await commentRepository.updateById(params.commentId, {
        likedBy: likedBy as any,
        numberOfLikes,
      });
    }

    return {
      commentId: c._id,
      numberOfLikes,
      numberOfDislikes,
      userHasLiked: true,
      userHasDisliked: false,
      message: "Comment liked successfully",
    };
  }

  async toggleDislike(params: { commentId: number; userId: string }) {
    const c = await commentRepository.findById(params.commentId);
    if (!c) throw new ApiError(404, "Comment not found");

    const userId = params.userId;
    const likedBy = Array.isArray(c.likedBy) ? [...c.likedBy] : [];
    const dislikedBy = Array.isArray(c.dislikedBy) ? [...c.dislikedBy] : [];

    const hasLiked = likedBy.includes(userId);
    const hasDisliked = dislikedBy.includes(userId);

    let numberOfLikes = Number(c.numberOfLikes || 0);
    let numberOfDislikes = Number(c.numberOfDislikes || 0);

    if (hasDisliked) {
      const next = dislikedBy.filter((x) => x !== userId);
      numberOfDislikes = Math.max(0, numberOfDislikes - 1);
      await commentRepository.updateById(params.commentId, {
        dislikedBy: next as any,
        numberOfDislikes,
      });
      return {
        commentId: c._id,
        numberOfLikes,
        numberOfDislikes,
        userHasLiked: hasLiked,
        userHasDisliked: false,
        message: "Dislike removed successfully",
      };
    }

    dislikedBy.push(userId);
    numberOfDislikes += 1;

    if (hasLiked) {
      const nextLiked = likedBy.filter((x) => x !== userId);
      numberOfLikes = Math.max(0, numberOfLikes - 1);
      await commentRepository.updateById(params.commentId, {
        likedBy: nextLiked as any,
        dislikedBy: dislikedBy as any,
        numberOfLikes,
        numberOfDislikes,
      });
    } else {
      await commentRepository.updateById(params.commentId, {
        dislikedBy: dislikedBy as any,
        numberOfDislikes,
      });
    }

    return {
      commentId: c._id,
      numberOfLikes,
      numberOfDislikes,
      userHasLiked: false,
      userHasDisliked: true,
      message: "Comment disliked successfully",
    };
  }

  async getLikeStatus(params: { commentId: number; userId: string }) {
    const c = await commentRepository.findById(params.commentId);
    if (!c) throw new ApiError(404, "Comment not found");

    const likedBy = Array.isArray(c.likedBy) ? c.likedBy : [];
    const dislikedBy = Array.isArray(c.dislikedBy) ? c.dislikedBy : [];

    return {
      commentId: c._id,
      numberOfLikes: Number(c.numberOfLikes || 0),
      numberOfDislikes: Number(c.numberOfDislikes || 0),
      userHasLiked: likedBy.includes(params.userId),
      userHasDisliked: dislikedBy.includes(params.userId),
    };
  }

  async search(params: { postId: string; userId: string; query: any }) {
    const q = params.query ?? {};
    const searchTerm = String(q.searchTerm ?? "").trim();
    if (!searchTerm) throw new ApiError(400, "Search term is required");

    const limitNumber = Math.max(1, Number(q.limit) || 25);
    const includeReplies = q.includeReplies === "true";
    const withUsername = q.withUsername === "true";
    const withContent = q.withContent === "true";
    const caseSensitive = q.caseSensitive === "true";
    const minLikes = Number(q.minLikes) || 0;
    const commentType = q.commentType ? String(q.commentType) : null;
    const dateFrom = q.dateFrom ? new Date(String(q.dateFrom)) : null;
    const dateTo = q.dateTo ? new Date(String(q.dateTo)) : null;
    const sortBy =
      q.sortBy === "likes" || q.sortBy === "recent" ? q.sortBy : ("relevance" as const);

    const results = await commentRepository.search({
      postId: params.postId,
      searchTerm,
      limit: limitNumber + 1,
      includeReplies,
      withUsername,
      withContent,
      caseSensitive,
      minLikes,
      commentType,
      dateFrom,
      dateTo,
      sortBy,
    });

    const hasNextPage = results.length > limitNumber;
    const pageItems = hasNextPage ? results.slice(0, limitNumber) : results;
    const final = pageItems.map((r) => toFrontendComment(r, { currentUserId: params.userId }));

    const nextCursor = final.length ? final[final.length - 1]?.inCommentId ?? null : null;

    return {
      comments: final,
      pagination: {
        limit: limitNumber,
        nextCursor: hasNextPage ? nextCursor : null,
        hasNextPage,
        totalMatches: final.length,
        searchTerm,
      },
      searchConfig: {
        searchedIn: {
          content: withContent || (!withUsername && !withContent),
          username: withUsername || (!withUsername && !withContent),
        },
        filters: { minLikes, commentType, dateFrom: q.dateFrom ?? null, dateTo: q.dateTo ?? null },
        sortBy,
      },
    };
  }
}

export const commentService = new CommentService();

