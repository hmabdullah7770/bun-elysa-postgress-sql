import { ApiError } from "../utils/ApiError";
import { postRepository } from "../repository/post.repository";
import { userRepository } from "../repository/user.repository";
import { uploadResult, saveTempFile } from "../utils/cloudinary";
import { progressStore } from "../utils/progressStore";
import { processSocialLinks } from "../utils/socialLinks";
import getSearchClient from "../config/searchClient";
import type { Client as ElasticsearchClient } from "@elastic/elasticsearch";
import { favoriteRepository } from "../repository/favouret.repository";

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

const enrichPostsWithUserData = async (
  posts: any[],
  userId: string | null | undefined,
  includeComments: "none" | "counts" | "details"
) => {
  if (!userId || posts.length === 0) return posts;

  const postIds = posts.map((post) => Number(post._id));
  const ownerIds = posts
    .map((post) => String(post.owner?._id ?? post.owner))
    .filter((id) => id.length > 0);
  const enrichment = await postRepository.getUserPostEnrichment(
    postIds,
    ownerIds,
    userId,
    includeComments
  );
  const followingIds = new Set(enrichment.following.map((row) => row.followingId));
  const followerIds = new Set(enrichment.followers.map((row) => row.followerId));
  const bidsByPost = new Map(enrichment.bids.map((row) => [row.postId, row.bidAmount]));
  const ratingsByPost = new Map(enrichment.ratings.map((row) => [row.postId, row.rating]));
  const commentsByPost = new Map<number, typeof enrichment.comments>();
  for (const comment of enrichment.comments) {
    const existing = commentsByPost.get(comment.postId) ?? [];
    existing.push(comment);
    commentsByPost.set(comment.postId, existing);
  }

  return posts.map((post) => {
    const postId = Number(post._id);
    const ownerId = String(post.owner?._id ?? post.owner);
    const userComments = commentsByPost.get(postId) ?? [];
    return {
      ...post,
      isFollowing: followingIds.has(ownerId),
      isFollower: followerIds.has(ownerId),
      hasBidded: bidsByPost.has(postId),
      myBidAmount: bidsByPost.has(postId) ? Number(bidsByPost.get(postId)) : null,
      hasRated: ratingsByPost.has(postId),
      myRatingValue: ratingsByPost.get(postId) ?? null,
      ...(includeComments === "none"
        ? {}
        : {
            hasCommented: userComments.length > 0,
            myCommentCount: userComments.length,
            ...(includeComments === "details"
              ? {
                  myComments: userComments.map(
                    ({ postId: _postId, ...comment }) => comment
                  ),
                }
              : {}),
          }),
    };
  });
};

const addOwnerStores = async (posts: any[]) => {
  const ownerIds = [
    ...new Set(
      posts
        .map((post) => post.owner?._id)
        .filter((id): id is string => typeof id === "string")
    ),
  ];
  const stores = await postRepository.getStoreIdsForOwners(ownerIds);
  const storesByOwner = new Map<string, string[]>();
  for (const store of stores) {
    const ownerStores = storesByOwner.get(store.ownerId) ?? [];
    ownerStores.push(store._id);
    storesByOwner.set(store.ownerId, ownerStores);
  }
  return posts.map((post) => ({
    ...post,
    owner:
      post.owner && typeof post.owner === "object" && post.store != null
        ? {
            ...post.owner,
            stores: storesByOwner.get(String(post.owner._id)) ?? [],
          }
        : post.owner,
  }));
};

export class PostService {
  async searchPosts(params: {
    search?: string;
    adminpassword?: string;
    from?: string;
    size?: string;
    addcomment?: string;
    filtername?: string;
    category?: string;
  }, userId?: string) {
    const expectedPassword = process.env.POST_SEARCH_ADMIN_PASSWORD;
    if (!expectedPassword) {
      throw new ApiError(500, "Post search admin password is not configured");
    }
    if (!params.adminpassword) throw new ApiError(400, "Admin password is required");
    if (params.adminpassword !== expectedPassword) throw new ApiError(403, "Access denied");

    const search = params.search?.trim();
    if (!search) throw new ApiError(400, "Search term is required");

    const activeFilter = params.filtername || "All";
    const filterFieldMap: Record<string, string[]> = {
      All: ["title^3", "description", "owner.username^2", "product", "store", "location"],
      username: ["owner.username"],
      title: ["title"],
      description: ["description"],
      location: ["location"],
      storename: ["store"],
    };
    const targetFields = filterFieldMap[activeFilter];
    if (!targetFields) {
      throw new ApiError(
        400,
        `Invalid filtername. Allowed values: ${Object.keys(filterFieldMap).join(", ")}`
      );
    }

    const from = Number.parseInt(params.from ?? "", 10) || 0;
    const size = Number.parseInt(params.size ?? "", 10) || 20;
    if (from < 0 || size < 1) throw new ApiError(400, "Invalid search pagination");

    const category = params.category?.trim() ?? "";
    const categoryFilter =
      category && category !== "All" ? [{ term: { category } }] : [];
    const result = await (getSearchClient() as ElasticsearchClient).search({
      index: "posts",
      from,
      size,
      query: {
        bool: {
          should: [
            {
              multi_match: {
                query: search,
                fields: targetFields,
                type: "phrase_prefix",
              },
            },
            {
              multi_match: {
                query: search,
                fields: targetFields,
                fuzziness: "AUTO",
              },
            },
          ],
          minimum_should_match: 1,
          filter: categoryFilter,
        },
      },
    });

    const hits: { _id?: string }[] = result.hits.hits;
    const totalMatches =
      typeof result.hits.total === "number"
        ? result.hits.total
        : result.hits.total?.value ?? hits.length;
    const matchedIds = hits
      .map((hit: { _id?: string }) => Number(hit._id))
      .filter((id: number) => Number.isSafeInteger(id) && id > 0);
    const order = new Map<number, number>(
      hits.map((hit: { _id?: string }, index: number) => [Number(hit._id), index])
    );
    const rows = await postRepository.findPublishedByIdsWithOwner(matchedIds);
    const results = rows
      .sort(
        (a, b) =>
          (order.get(a.post._id) ?? Infinity) - (order.get(b.post._id) ?? Infinity)
      )
      .map(({ post, owner }) => ({
        ...pruneEmptyMediaFields(post),
        owner: owner
          ? {
              _id: owner._id,
              username: owner.username,
              fullName: owner.fullName,
              avatar: owner.avatar,
              email: owner.email,
            }
          : post.owner,
      }));
    const withStores = await addOwnerStores(results);
    const posts = await enrichPostsWithUserData(
      withStores,
      userId,
      params.addcomment === "true" || params.addcomment === "1" ? "counts" : "none"
    );

    const pagination = {
      from,
      size,
      totalMatches,
      hasNextPage: from + size < totalMatches,
    };

    if (matchedIds.length === 0) {
      return {
        data: `No posts found matching "${search}" in ${activeFilter}`,
        message: {
          posts: [],
          pagination,
          filtername: activeFilter,
          category: params.category || null,
        },
      };
    }

    return {
      data: "Search results fetched successfully",
      message: {
        posts,
        pagination,
        filtername: activeFilter,
        category: params.category || null,
      },
    };
  }

  async getAllPosts(params: {
    query: any;
    userVerified?: any;
    userIdsFilter?: string[];
    videosOnly?: boolean;
    imagesOnly?: boolean;
  }) {
    const q = params.query ?? {};
    const limitNumber = Number(q.limit) || 20;
    if (limitNumber > 100) throw new ApiError(400, "Limit cannot exceed 100");
    let pageNumber: number | undefined;
    if (q.page !== undefined) {
      pageNumber = Number(q.page);
      if (!Number.isInteger(pageNumber) || pageNumber < 1) {
        throw new ApiError(400, "Invalid page");
      }
    }

    const direction = q.direction === "newer" ? "newer" : "older";
    const sortBy = (q.sortBy as any) || "createdAt";
    const sortType = q.sortType === "asc" ? "asc" : "desc";
    const validSortFields = ["createdAt", "averageRating", "totalViews", "inCategoryId"];
    if (!validSortFields.includes(sortBy)) {
      throw new ApiError(400, `Invalid sortBy. Must be one of: ${validSortFields.join(", ")}`);
    }
    if (q.direction && q.direction !== "older" && q.direction !== "newer") {
      throw new ApiError(400, "Invalid direction. Must be 'older' or 'newer'");
    }

    const userIdFilter = q.userId ? String(q.userId) : null;
    const loggedInUserId = params.userVerified?._id ?? null;
    const isOwnerRequest = Boolean(userIdFilter && loggedInUserId && userIdFilter === loggedInUserId);
    const shouldFilterFavorites =
      q.favouret === true || q.favouret === "true" || q.favouret === "1";
    const favoriteRows =
      shouldFilterFavorites && loggedInUserId
        ? await favoriteRepository.listByOwner(loggedInUserId)
        : null;
    let cursor = q.cursor ?? null;
    const legacyCategoryCursor = Boolean(q.categoury && cursor && !cursor.includes("_"));
    if (legacyCategoryCursor && cursor) {
      const cursorPost = await postRepository.findCursorByInCategoryId(cursor);
      if (!cursorPost) throw new ApiError(400, "Invalid cursor: Post not found");
      const cursorValue =
        sortBy === "createdAt"
          ? new Date(cursorPost.createdAt).toISOString()
          : sortBy === "averageRating"
            ? String(cursorPost.averageRating)
            : sortBy === "totalViews"
              ? String(cursorPost.totalViews)
              : cursorPost.inCategoryId;
      cursor = `${cursorValue}_${cursorPost.inCategoryId}`;
    }

    const result = await postRepository.list({
      limit: limitNumber,
      cursor,
      query: q.query ?? null,
      category: q.category ?? null,
      sortBy,
      sortType,
      direction,
      userIdFilter,
      userIdsFilter: params.userIdsFilter,
      videosOnly: params.videosOnly,
      imagesOnly: params.imagesOnly,
      isOwnerRequest,
      includeCount: q.includeCount === "true",
      page: pageNumber,
      postIdsFilter: favoriteRows?.map((favorite) => favorite.postId),
    });

    let rows = result.rows;

    // If fetching newer, reverse into natural display order (matches old Mongo behavior)
    if (direction === "newer" && rows.length > 0) {
      rows = [...rows].reverse();
    }

    const hasNextPage = rows.length > result.limit;
    if (hasNextPage) rows = rows.slice(0, result.limit);

    const postRows = rows.map((r: any) => {
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
    const withStores = await addOwnerStores(postRows);
    const posts = await enrichPostsWithUserData(
      withStores,
      loggedInUserId,
      loggedInUserId && (q.addcomment === "true" || q.addcomment === "1")
        ? "details"
        : "none"
    );

    if (pageNumber) {
      return {
        posts,
        pagination: {
          currentPage: pageNumber,
          itemsPerPage: result.limit,
          totalSkip: (pageNumber - 1) * result.limit,
          hasNextPage,
          hasPrevPage: pageNumber > 1,
          ...(result.totalCount !== null ? { totalCount: result.totalCount } : {}),
        },
      };
    }

    let nextCursor: string | null = null;
    let previousCursor: string | null = null;

    if (posts.length > 0) {
      const first = posts[0];
      const last = posts[posts.length - 1];

      if (direction === "newer") {
        nextCursor = hasNextPage
          ? legacyCategoryCursor ? first.inCategoryId : `${getSortValue(first, sortBy)}_${first.inCategoryId}`
          : null;
        previousCursor = legacyCategoryCursor
          ? last.inCategoryId
          : `${getSortValue(last, sortBy)}_${last.inCategoryId}`;
      } else {
        nextCursor = hasNextPage
          ? legacyCategoryCursor ? last.inCategoryId : `${getSortValue(last, sortBy)}_${last.inCategoryId}`
          : null;
        previousCursor = legacyCategoryCursor
          ? first.inCategoryId
          : `${getSortValue(first, sortBy)}_${first.inCategoryId}`;
      }
    }

    const pagination: Record<string, unknown> = {
      currentCursor: q.cursor || null,
      nextCursor,
      previousCursor,
      limit: result.limit,
      hasNextPage,
      direction,
      itemsReturned: posts.length,
      ...(q.categoury ? { userId: userIdFilter || null } : {}),
      ...(!q.categoury ? { sortBy, sortType } : {}),
    };
    if (result.totalCount !== null) pagination.totalCount = result.totalCount;

    return {
      posts,
      pagination,
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
          position: idx + 1,
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
          position: idx + 1,
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
    const withOwner = await postRepository.findByIdWithOwner(params.postId);
    if (!withOwner) throw new ApiError(500, "Failed to update post");
    return pruneEmptyMediaFields({
      ...withOwner.post,
      owner: withOwner.owner
        ? {
            _id: withOwner.owner._id,
            username: withOwner.owner.username,
            fullName: withOwner.owner.fullName,
            avatar: withOwner.owner.avatar,
          }
        : withOwner.post.owner,
    });
  }

  async publishPost(params: { body: any; userVerified: any }) {
    const body = params.body ?? {};
    const userId = params.userVerified._id;

    const categoryRaw = body.category;
    if (!categoryRaw) throw new ApiError(400, "Category is required");

    const category = String(categoryRaw).trim() || "All";

    // Progress helpers
    const progressKey = String(userId);
    const updateProgress = (progress: number, message: string) => {
      progressStore.set(progressKey, {
        progress,
        message,
        timestamp: Date.now(),
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
    const imageFiles: { url: string; position: number }[] = [];
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
            imageFiles.push({ url: (r.secure_url || r.url)!, position: i });
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
            position: i,
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

    updateProgress(88, "Generating unique IDs...");
    const ids = await postRepository.generatePostIds(category);

    updateProgress(92, "Creating post...");

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
        ProductId: Number(body.ProductId) || undefined,
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

      imageFiles: imageFiles.sort((a, b) => a.position - b.position),
      videoFiles: videoFiles.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),

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

    updateProgress(100, "Post created successfully!");
    setTimeout(() => progressStore.delete(progressKey), 5000);

    const withOwner = await postRepository.findByIdWithOwnerAndCatalog(String(newPost._id));
    if (!withOwner) throw new ApiError(500, "Post creation failed");
    return pruneEmptyMediaFields({
      ...withOwner.post,
      owner: withOwner.owner
        ? {
            _id: withOwner.owner._id,
            username: withOwner.owner.username,
            fullName: withOwner.owner.fullName,
            avatar: withOwner.owner.avatar,
          }
        : withOwner.post.owner,
    });
  }

  async updatePost(params: { postId: string; userId: string; body: any }) {
    const post = await postRepository.findById(params.postId);
    if (!post) throw new ApiError(404, "Post not found");
    if (post.owner !== params.userId) {
      throw new ApiError(403, "You are not authorized to update this post");
    }

    const body = params.body ?? {};
    const patch: any = {};

    if (body.title) patch.title = body.title;
    if (body.description) patch.description = body.description;
    if (body.category) patch.category = String(body.category).trim() || "All";
    if (body.pattern) patch.pattern = body.pattern;

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

    const imageUploads: { url: string; position: number }[] = [];
    const videoUploads: any[] = [];
    const thumbnailUploads: Record<number, string> = {};
    const uploadTasks: Promise<void>[] = [];

    for (let position = 1; position <= 5; position++) {
      const image = body[`imageFile${position}`] as File | undefined;
      if (image) {
        uploadTasks.push((async () => {
          const path = await saveTempFile(image);
          const uploaded = await uploadResult(path);
          const url = uploaded?.secure_url || uploaded?.url;
          if (!url) throw new ApiError(400, `Image file ${position} upload failed`);
          imageUploads.push({ url, position });
        })());
      }

      const thumbnail = body[`thumbnail${position}`] as File | undefined;
      if (thumbnail) {
        uploadTasks.push((async () => {
          const path = await saveTempFile(thumbnail);
          const uploaded = await uploadResult(path);
          const url = uploaded?.secure_url || uploaded?.url;
          if (!url) throw new ApiError(400, `Thumbnail ${position} upload failed`);
          thumbnailUploads[position] = url;
        })());
      }
    }
    await Promise.all(uploadTasks);
    imageUploads.sort((a, b) => a.position - b.position);

    const videoTasks: Promise<void>[] = [];
    for (let position = 1; position <= 5; position++) {
      const video = body[`videoFile${position}`] as File | undefined;
      if (!video) continue;
      videoTasks.push((async () => {
        const path = await saveTempFile(video);
        const uploaded = await uploadResult(path, true);
        const url = (uploaded as any)?.hlsUrl || uploaded?.secure_url || uploaded?.url;
        if (!url) throw new ApiError(400, `Video file ${position} upload failed`);
        videoUploads.push({
          url,
          position,
          autoplay: isTrue(body[`autoplay${position}`]),
          ...(thumbnailUploads[position] ? { thumbnail: thumbnailUploads[position] } : {}),
        });
      })());
    }
    await Promise.all(videoTasks);
    videoUploads.sort((a, b) => a.position - b.position);

    if (imageUploads.length) {
      const existingImages = Array.isArray(post.imageFiles) ? post.imageFiles : [];
      const appendedImages = imageUploads.map((image, index) => ({
        ...image,
        position: existingImages.length + index + 1,
      }));
      patch.imageFiles = [...existingImages, ...appendedImages];
      patch.imagecount = patch.imageFiles.length;
    }

    if (videoUploads.length || Object.keys(thumbnailUploads).length) {
      const existingVideos = Array.isArray(post.videoFiles)
        ? post.videoFiles.map((video: any) => ({ ...video }))
        : [];
      for (const video of videoUploads) {
        video.position = existingVideos.length + 1;
        existingVideos.push(video);
      }
      for (const [position, thumbnail] of Object.entries(thumbnailUploads)) {
        const existing = existingVideos.find(
          (video: any) => (video.position ?? video.Videoposition) === Number(position)
        );
        if (existing && !videoUploads.some((video) => video.thumbnail === thumbnail)) {
          existing.thumbnail = thumbnail;
        }
      }
      patch.videoFiles = existingVideos;
      patch.videocount = existingVideos.length;
    }

    const audioFiles = asArray<File>(body.audioFiles);
    if (audioFiles.length) {
      const audioUrls = await Promise.all(audioFiles.map(async (audio, index) => {
        const path = await saveTempFile(audio);
        const uploaded = await uploadResult(path);
        const url = uploaded?.secure_url || uploaded?.url;
        if (!url) throw new ApiError(400, `Audio upload failed (${index + 1})`);
        return url;
      }));
      patch.audioFile = audioUrls[0];
      patch.audiocount = 1;
    }

    const songFiles = asArray<File>(body.song);
    if (songFiles.length) {
      const songUrls = await Promise.all(songFiles.map(async (song, index) => {
        const path = await saveTempFile(song);
        const uploaded = await uploadResult(path);
        const url = uploaded?.secure_url || uploaded?.url;
        if (!url) throw new ApiError(400, `Song upload failed (${index + 1})`);
        return url;
      }));
      patch.song = [...(Array.isArray(post.song) ? post.song : []), ...songUrls];
    }

    if (Object.keys(patch).length === 0) throw new ApiError(400, "No updates provided");

    const updated = await postRepository.updateById(params.postId, patch);
    if (!updated) throw new ApiError(500, "Post update failed");
    const withOwner = await postRepository.findByIdWithOwner(params.postId);
    if (!withOwner) throw new ApiError(500, "Post update failed");
    return pruneEmptyMediaFields({
      ...withOwner.post,
      owner: withOwner.owner
        ? {
            _id: withOwner.owner._id,
            username: withOwner.owner.username,
            fullName: withOwner.owner.fullName,
            avatar: withOwner.owner.avatar,
          }
        : withOwner.post.owner,
    });
  }
}

export const postService = new PostService();
