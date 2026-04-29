import { ApiError } from "../utils/ApiError";
import { postRepository } from "../repository/post.repository";
import { userRepository } from "../repository/user.repository";
import { uploadResult, saveTempFile } from "../utils/cloudinary";
import { progressStore } from "../utils/progressStore";
import { processSocialLinks } from "../utils/socialLinks";

type AnyFilesMap = Record<string, any>;

const isTrue = (val: any) => val === true || val === "true" || val === "1";

const asArray = <T>(val: T | T[] | undefined | null): T[] => {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
};

const pruneEmptyMediaFields = (post: any) => {
  if (!post || typeof post !== "object") return post;

  const p = { ...post };
  if (Array.isArray(p.imageFiles) && p.imageFiles.length === 0) delete p.imageFiles;
  if (Array.isArray(p.videoFiles) && p.videoFiles.length === 0) delete p.videoFiles;
  if (Array.isArray(p.store) && p.store.length === 0) delete p.store;
  if (Array.isArray(p.product) && p.product.length === 0) delete p.product;
  if (Array.isArray(p.song) && p.song.length === 0) delete p.song;

  return p;
};

const getSortValue = (post: any, sortBy: string) => {
  if (sortBy === "createdAt") return new Date(post.createdAt).toISOString();
  if (sortBy === "averageRating") return String(post.averageRating ?? "0");
  if (sortBy === "totalViews") return String(post.totalViews ?? 0);
  return String(post.inCategoryId ?? "");
};

export class PostService {
  async getAllPosts(params: { query: any; userVerified?: any }) {
    const q = params.query ?? {};
    const limitNumber = Number(q.limit) || 20;

    const direction = q.direction === "newer" ? "newer" : "older";
    const sortBy = (q.sortBy as any) || "createdAt";
    const sortType = q.sortType === "asc" ? "asc" : "desc";

    const userIdFilter = q.userId ? String(q.userId) : null;
    const loggedInUserId = params.userVerified?._id ?? null;
    const isOwnerRequest = Boolean(userIdFilter && loggedInUserId && userIdFilter === loggedInUserId);

    const result = await postRepository.list({
      limit: limitNumber,
      cursor: q.cursor ?? null,
      query: q.query ?? null,
      category: q.category ?? null,
      sortBy,
      sortType,
      direction,
      userIdFilter,
      isOwnerRequest,
    });

    let rows = result.rows;

    // If fetching newer, reverse into natural display order (matches old Mongo behavior)
    if (direction === "newer" && rows.length > 0) {
      rows = [...rows].reverse();
    }

    const hasNextPage = rows.length > result.limit;
    if (hasNextPage) rows = rows.slice(0, result.limit);

    const posts = rows.map((r: any) => {
      const post = pruneEmptyMediaFields(r.post);
      return {
        ...post,
        owner: r.owner
          ? {
              _id: r.owner._id,
              username: r.owner.username,
              fullName: r.owner.fullName,
              avatar: r.owner.avatar,
              email: r.owner.email,
            }
          : post.owner,
      };
    });

    let nextCursor: string | null = null;
    let previousCursor: string | null = null;

    if (posts.length > 0) {
      const first = posts[0];
      const last = posts[posts.length - 1];

      if (direction === "newer") {
        nextCursor = hasNextPage ? `${getSortValue(first, sortBy)}_${first.inCategoryId}` : null;
        previousCursor = `${getSortValue(last, sortBy)}_${last.inCategoryId}`;
      } else {
        nextCursor = hasNextPage ? `${getSortValue(last, sortBy)}_${last.inCategoryId}` : null;
        previousCursor = `${getSortValue(first, sortBy)}_${first.inCategoryId}`;
      }
    }

    return {
      posts,
      pagination: {
        currentCursor: q.cursor || null,
        nextCursor,
        previousCursor,
        limit: result.limit,
        hasNextPage,
        direction,
        sortBy,
        sortType,
        itemsReturned: posts.length,
      },
    };
  }

  async getPostById(params: { postId: string }) {
    const row = await postRepository.findPublishedByIdWithOwner(params.postId);
    if (!row) throw new ApiError(404, "Post not found");

    await postRepository.incrementViews(params.postId);

    const post = pruneEmptyMediaFields(row.post);
    return {
      ...post,
      owner: row.owner
        ? {
            _id: row.owner._id,
            username: row.owner.username,
            fullName: row.owner.fullName,
            avatar: row.owner.avatar,
          }
        : post.owner,
    };
  }

  async togglePublishStatus(params: { postId: string; userId: string }) {
    const post = await postRepository.findById(params.postId);
    if (!post) throw new ApiError(404, "Post not found");
    if (post.owner !== params.userId) {
      throw new ApiError(403, "You are not authorized to update this post");
    }
    const updated = await postRepository.updateById(params.postId, {
      isPublished: !post.isPublished,
    } as any);
    if (!updated) throw new ApiError(500, "Failed to update post");
    return { isPublished: updated.isPublished };
  }

  async deletePost(params: { postId: string; userId: string }) {
    const post = await postRepository.findById(params.postId);
    if (!post) throw new ApiError(404, "Post not found");
    if (post.owner !== params.userId) {
      throw new ApiError(403, "You are not authorized to delete this post");
    }
    await postRepository.deleteById(params.postId);
    return {};
  }

  async incrementSocialLinkView(params: { postId: string; linkType: string }) {
    const post = await postRepository.findById(params.postId);
    if (!post) throw new ApiError(404, "Post not found");

    const allowed = ["whatsapp", "storeLink", "facebook", "instagram", "productlink"];
    if (!allowed.includes(params.linkType)) throw new ApiError(400, "Invalid link type");

    const url = (post as any)[params.linkType];
    if (!url) throw new ApiError(404, "This post doesn't have the requested social link");

    const updated = await postRepository.updateById(params.postId, {
      totalViews: (post.totalViews ?? 0) + 1,
    } as any);

    return { url, totalViews: updated?.totalViews ?? (post.totalViews ?? 0) + 1 };
  }

  async removeMediaFiles(params: {
    postId: string;
    userId: string;
    body: { imageUrls?: any; videoUrls?: any; audioUrls?: any };
  }) {
    const post = await postRepository.findById(params.postId);
    if (!post) throw new ApiError(404, "Post not found");
    if (post.owner !== params.userId) {
      throw new ApiError(403, "You are not authorized to update this post");
    }

    const imageUrls = asArray<string>(params.body.imageUrls).map(String);
    const videoUrls = asArray<string>(params.body.videoUrls).map(String);
    const audioUrls = asArray<string>(params.body.audioUrls).map(String);

    const nextPatch: any = {};

    if (imageUrls.length) {
      const current = Array.isArray(post.imageFiles) ? post.imageFiles : [];
      const filtered = current
        .filter((img: any) => !imageUrls.includes(String(img?.url ?? img)))
        .map((img: any, idx: number) => ({
          ...(typeof img === "string" ? { url: img } : img),
          Imageposition: idx + 1,
        }));
      nextPatch.imageFiles = filtered;
      nextPatch.imagecount = filtered.length;
    }

    if (videoUrls.length) {
      const current = Array.isArray(post.videoFiles) ? post.videoFiles : [];
      const filtered = current
        .filter((v: any) => !videoUrls.includes(String(v?.url ?? v)))
        .map((v: any, idx: number) => ({
          ...(typeof v === "string" ? { url: v } : v),
          Videoposition: idx + 1,
        }));
      nextPatch.videoFiles = filtered;
      nextPatch.videocount = filtered.length;
    }

    if (audioUrls.length && post.audioFile) {
      if (audioUrls.includes(String(post.audioFile))) {
        nextPatch.audioFile = null;
        nextPatch.audiocount = 0;
      }
    }

    const updated = await postRepository.updateById(params.postId, nextPatch);
    if (!updated) throw new ApiError(500, "Failed to update post");
    return pruneEmptyMediaFields(updated);
  }

  async publishPost(params: { body: any; userVerified: any }) {
    const body = params.body ?? {};
    const userId = params.userVerified._id;

    const categoryRaw = body.category;
    if (!categoryRaw) throw new ApiError(400, "Category is required");

    const category = String(categoryRaw).trim() || "All";

    // Progress helpers
    const progressKey = String(userId);
    const updateProgress = (progress: number, message: string, status: any = "uploading") => {
      progressStore.set(progressKey, {
        status,
        progress,
        message,
        startedAt: new Date(),
        updatedAt: new Date(),
      } as any);
    };

    updateProgress(5, "Validating input data...");

    // Validate social logic (same rules as old code)
    if (isTrue(body.facebook) && body.facebookurl) {
      throw new ApiError(400, "Cannot provide both facebook=true and facebookurl. Choose one.");
    }
    if (isTrue(body.instagram) && body.instagramurl) {
      throw new ApiError(400, "Cannot provide both instagram=true and instagramurl. Choose one.");
    }
    if (isTrue(body.whatsapp) && body.whatsappnumberurl) {
      throw new ApiError(400, "Cannot provide both whatsapp=true and whatsappnumberurl. Choose one.");
    }
    if (isTrue(body.storeLink) && body.storelinkurl) {
      throw new ApiError(400, "Cannot provide both storeLink=true and storelinkurl. Choose one.");
    }

    // Process profile-based social links (same behavior as old code)
    // If it throws only "At least one social link required", we ignore (posts allow 0 social links)
    let socialLinks = { socialLinks: {} as Record<string, any> };
    try {
      socialLinks = processSocialLinks(params.userVerified, body) as any;
    } catch (err: any) {
      if (err?.message !== "At least one social link required") {
        throw err;
      }
    }

    updateProgress(15, "Starting file uploads...");

    const files: AnyFilesMap = body;

    // Collect numbered files
    const imageFiles: { url: string; Imageposition: number }[] = [];
    const thumbnailUrls: Record<number, string> = {};
    const videoFiles: any[] = [];

    // Upload images + thumbnails in parallel (positions 1..5)
    const uploadTasks: Promise<void>[] = [];
    let completed = 0;
    let total = 0;

    for (let i = 1; i <= 5; i++) {
      if (files[`imageFile${i}`]) total++;
      if (files[`thumbnail${i}`]) total++;
      if (files[`videoFile${i}`]) total++;
    }
    total += asArray<File>(files.audioFiles).length;
    total += asArray<File>(files.song).length;

    const bump = () => {
      completed += 1;
      const pct = total ? Math.floor(15 + (completed / total) * 55) : 40;
      updateProgress(pct, `Uploading files... ${completed}/${total}`);
    };

    for (let i = 1; i <= 5; i++) {
      const f = files[`imageFile${i}`] as File | undefined;
      if (f) {
        uploadTasks.push(
          (async () => {
            const p = await saveTempFile(f);
            const r = await uploadResult(p);
            if (!r?.secure_url && !r?.url) throw new ApiError(400, `Image file ${i} upload failed`);
            imageFiles.push({ url: (r.secure_url || r.url)!, Imageposition: i });
            bump();
          })()
        );
      }

      const t = files[`thumbnail${i}`] as File | undefined;
      if (t) {
        uploadTasks.push(
          (async () => {
            const p = await saveTempFile(t);
            const r = await uploadResult(p);
            if (!r?.secure_url && !r?.url) throw new ApiError(400, `Thumbnail ${i} upload failed`);
            thumbnailUrls[i] = (r.secure_url || r.url)!;
            bump();
          })()
        );
      }
    }

    // Wait for images/thumbs first (old behavior)
    await Promise.all(uploadTasks);

    updateProgress(70, "Processing videos...");

    const videoTasks: Promise<void>[] = [];
    for (let i = 1; i <= 5; i++) {
      const v = files[`videoFile${i}`] as File | undefined;
      if (!v) continue;
      const autoplayVal = body[`autoplay${i}`];
      videoTasks.push(
        (async () => {
          const p = await saveTempFile(v);
          const r = await uploadResult(p, true);
          // Prefer HLS url if present (matches your latest code)
          const url = (r as any)?.hlsUrl || r?.secure_url || r?.url;
          if (!url) throw new ApiError(400, `Video file ${i} upload failed`);
          const item: any = {
            url,
            Videoposition: i,
            autoplay: isTrue(autoplayVal),
          };
          if (thumbnailUrls[i]) item.thumbnail = thumbnailUrls[i];
          videoFiles.push(item);
          bump();
        })()
      );
    }

    // Audio files (multi) & song (multi)
    const audioFilesArr = asArray<File>(files.audioFiles);
    const songFilesArr = asArray<File>(files.song);

    let audioUrls: string[] = [];
    let songUrls: string[] = [];

    if (audioFilesArr.length) {
      videoTasks.push(
        (async () => {
          const urls = await Promise.all(
            audioFilesArr.map(async (f, idx) => {
              const p = await saveTempFile(f);
              const r = await uploadResult(p);
              if (!r?.secure_url && !r?.url) throw new ApiError(400, `Audio upload failed (${idx + 1})`);
              bump();
              return (r.secure_url || r.url)!;
            })
          );
          audioUrls = urls.filter(Boolean);
        })()
      );
    }

    if (songFilesArr.length) {
      videoTasks.push(
        (async () => {
          const urls = await Promise.all(
            songFilesArr.map(async (f, idx) => {
              const p = await saveTempFile(f);
              const r = await uploadResult(p);
              if (!r?.secure_url && !r?.url) throw new ApiError(400, `Song upload failed (${idx + 1})`);
              bump();
              return (r.secure_url || r.url)!;
            })
          );
          songUrls = urls.filter(Boolean);
        })()
      );
    }

    await Promise.all(videoTasks);

    updateProgress(88, "Generating unique IDs...", "processing");
    const ids = await postRepository.generatePostIds(category);

    updateProgress(92, "Creating post...", "processing");

    // Store/product arrays (keep same structure)
    const storeData: any[] = [];
    if (body.storeisActive || body.storeId || body.storeUrl) {
      storeData.push({
        storeisActive: Boolean(body.storeisActive),
        storeIconSize: body.storeIconSize || "L",
        storeId: body.storeId || undefined,
        storeUrl: body.storeUrl || undefined,
      });
    }

    const productData: any[] = [];
    if (body.productisActive || body.ProductId || body.productUrl) {
      productData.push({
        productisActive: Boolean(body.productisActive),
        productIconSize: body.productIconSize || "S",
        ProductId: body.ProductId || undefined,
        productUrl: body.productUrl || undefined,
      });
    }

    // URL fields saving (frontend compatibility)
    const urlFields: any = {};
    if (!isTrue(body.facebook) && body.facebookurl) urlFields.facebookurl = body.facebookurl;
    if (!isTrue(body.instagram) && body.instagramurl) urlFields.instagramurl = body.instagramurl;
    if (!isTrue(body.whatsapp) && body.whatsappnumberurl) urlFields.whatsappnumberurl = body.whatsappnumberurl;
    if (!isTrue(body.storeLink) && body.storelinkurl) urlFields.storelinkurl = body.storelinkurl;

    const newPost = await postRepository.create({
      postIdUnique: ids.postIdUnique,
      inCategoryId: ids.inCategoryId,
      category: ids.categoryName,
      title: body.title ?? null,
      description: body.description ?? null,
      owner: userId,

      audioFile: audioUrls.length ? audioUrls[0] : null,
      song: songUrls,

      imageFiles: imageFiles.sort((a, b) => a.Imageposition - b.Imageposition),
      videoFiles: videoFiles.sort((a, b) => (a.Videoposition ?? 0) - (b.Videoposition ?? 0)),

      imagecount: imageFiles.length,
      videocount: videoFiles.length,
      audiocount: audioUrls.length,

      pattern: body.pattern || "1",
      postType: body.postType ?? null,

      // Social direct fields (if provided by frontend)
      whatsapp: body.whatsapp ?? null,
      storeLink: body.storeLink ?? null,
      facebook: body.facebook ?? null,
      instagram: body.instagram ?? null,
      productlink: body.productlink ?? null,

      store: storeData,
      product: productData,

      ...(socialLinks.socialLinks ?? {}),
      ...urlFields,
    } as any);

    if (!newPost) throw new ApiError(500, "Post creation failed");

    updateProgress(100, "Post created successfully!", "completed");
    setTimeout(() => progressStore.delete(progressKey), 5000);

    return pruneEmptyMediaFields(newPost);
  }

  async updatePost(params: { postId: string; userId: string; body: any }) {
    const post = await postRepository.findById(params.postId);
    if (!post) throw new ApiError(404, "Post not found");
    if (post.owner !== params.userId) {
      throw new ApiError(403, "You are not authorized to update this post");
    }

    const body = params.body ?? {};
    const patch: any = {};

    if (body.title !== undefined) patch.title = body.title;
    if (body.description !== undefined) patch.description = body.description;
    if (body.category !== undefined) patch.category = String(body.category).trim() || "All";
    if (body.pattern !== undefined) patch.pattern = body.pattern;

    // Social links update support (use same helper; updateOps -> patch)
    try {
      // Match old Mongo behavior: load user profile then processSocialLinks(user, payload, existingPost)
      const user = await userRepository.findById(params.userId);
      if (!user) throw new ApiError(404, "User not found");

      const ops = processSocialLinks(user, body, post) as any;
      if (ops?.$set) Object.assign(patch, ops.$set);
      if (ops?.$unset) {
        for (const k of Object.keys(ops.$unset)) patch[k] = null;
      }
    } catch (err: any) {
      // For update, propagate real config errors; ignore "At least one social link required"
      if (err?.message !== "At least one social link required") throw err;
    }

    // If no updates provided, return existing
    if (Object.keys(patch).length === 0) throw new ApiError(400, "No updates provided");

    const updated = await postRepository.updateById(params.postId, patch);
    if (!updated) throw new ApiError(500, "Post update failed");
    return pruneEmptyMediaFields(updated);
  }
}

export const postService = new PostService();

