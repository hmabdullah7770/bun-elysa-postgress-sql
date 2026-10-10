import { categouryService } from "../services/categoury.service";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

const parsePositiveInt = (value: unknown, fallback: number, label: string) => {
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

const parseCategoryId = (value: unknown) => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new ApiError(400, "Invalid category ID");
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new ApiError(400, "Invalid category ID");
  return id;
};

const getFeedQuery = (query: any) => ({
  ...query,
  category: query.category ?? query.categoury ?? query.categouryname,
});

const legacyFeedResponse = (data: unknown, message: string) =>
  new Response(
    JSON.stringify({
      success: true,
      statusCode: 200,
      data: message,
      message: data,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );

const verifyCategoryAdminPassword = (password: unknown) => {
  const expectedPassword =
    process.env.CATEGORY_ADMIN_PASSWORD ?? process.env.POST_SEARCH_ADMIN_PASSWORD;
  if (!password) throw new ApiError(400, "Admin password is required");
  if (!expectedPassword) {
    throw new ApiError(500, "Category admin password is not configured");
  }
  if (password !== expectedPassword) throw new ApiError(403, "Access denied");
};

const getCategoryFeed = async (ctx: any, options: {
  followingOnly?: boolean;
  videosOnly?: boolean;
  imagesOnly?: boolean;
  requireAdminPassword?: boolean;
  fromCache?: boolean;
} = {}, message?: string) => {
  const query = getFeedQuery(ctx.query ?? {});
  if (options.requireAdminPassword) {
    verifyCategoryAdminPassword(query.adminpassword);
  }
  if (!query.category) throw new ApiError(400, "Category is required");
  const data = await categouryService.getCategoryFeed({
    query,
    userVerified: ctx.userVerified,
    followingOnly: options.followingOnly,
    videosOnly: options.videosOnly,
    imagesOnly: options.imagesOnly,
  });
  if (data.posts.length === 0 && query.cursor) {
    message =
      query.direction === "newer" ? "No newer posts found" : "No more posts found";
  } else if (data.posts.length === 0 && !message) {
    message = `No posts found${query.userId ? " for user" : ""}${
      query.category !== "All" ? " in this category" : ""
    }`;
  }
  const categoryLabel = query.category === "All" ? "All categories" : "Category";
  return legacyFeedResponse(
    options.fromCache === undefined
      ? data
      : { ...data, fromCache: options.fromCache },
    message ?? `${categoryLabel} posts fetched successfully`
  );
};

const getFollowingFeed = async (ctx: any) => {
  const query = getFeedQuery({
    page: "1",
    limit: "20",
    ...(ctx.query ?? {}),
  });
  if (!query.category) throw new ApiError(400, "Category name is required");
  const data = await categouryService.getCategoryFeed({
    query,
    userVerified: ctx.userVerified,
    followingOnly: true,
  });
  const categoryName = query.category === "All" ? "all categories" : query.category;
  const pagination = data.pagination.currentPage
    ? {
        currentPage: data.pagination.currentPage,
        itemsPerPage: data.pagination.itemsPerPage,
        hasNextPage: data.pagination.hasNextPage,
        hasPrevPage: data.pagination.hasPrevPage,
      }
    : data.pagination;
  return legacyFeedResponse(
    { posts: data.posts, pagination },
    `Following users' ${categoryName} posts fetched`
  );
};

export const getCatagoury = async ({ query }: any) => {
  const page = parsePositiveInt(query.page, 1, "page");
  const limit = Math.min(parsePositiveInt(query.limit, 20, "limit"), 100);
  const data = await categouryService.getCategories(page, limit);
  return new ApiResponse(200, data, "Categories fetched successfully");
};

export const getAllCategouryName = async () => {
  const names = await categouryService.getAllCategoryNames();
  return new ApiResponse(200, names, "Category names fetched successfully");
};

export const addCategoury = async ({ body }: any) => {
  const category = await categouryService.addCategory(body.categouryname);
  return new ApiResponse(201, category, "Category added successfully");
};

export const updateCategoury = async ({ params, body }: any) => {
  const id = parseCategoryId(params.categoryId);
  const category = await categouryService.updateCategory(id, body.categouryname);
  return new ApiResponse(200, category, "Category updated successfully");
};

export const deleteCategoury = async ({ body }: any) => {
  const id = body.categoryId ?? body._id;
  if (id === undefined && typeof body.categouryname !== "string") {
    throw new ApiError(400, "Provide categoryId or categouryname");
  }
  const deleted = id !== undefined
    ? await categouryService.deleteCategory(parseCategoryId(String(id)))
    : await categouryService.deleteCategoryByName(body.categouryname);
  return new ApiResponse(200, deleted, "Category deleted successfully");
};

export const getPostsByCategory = (ctx: any) =>
  getCategoryFeed(ctx, { requireAdminPassword: true });
export const getPostsByCategoryCousor = (ctx: any) =>
  getCategoryFeed(ctx, { requireAdminPassword: true });
export const getPostsByCategoryCousorRedis = (ctx: any) =>
  getCategoryFeed(ctx, { requireAdminPassword: true, fromCache: false });
export const gethasVideoPostsByCategory = (ctx: any) =>
  getCategoryFeed(ctx, { videosOnly: true, requireAdminPassword: true });
export const getonlyImagePostsByCategory = (ctx: any) =>
  getCategoryFeed(ctx, { imagesOnly: true, requireAdminPassword: true });
export const getFollowingUsersPosts = (ctx: any) => getFollowingFeed(ctx);
export const getFollowingUsersCategoryUltraFast = (ctx: any) => getFollowingFeed(ctx);
export const getUnifiedFeed = async ({ query }: any) => {
  const feedQuery = getFeedQuery(query ?? {});
  verifyCategoryAdminPassword(feedQuery.adminpassword);
  const data = await categouryService.getCategoryFeed({ query: feedQuery });
  const categoryLabel =
    feedQuery.category === "All" ? "All categories" : "Category";
  return legacyFeedResponse(
    { content: data.posts, pagination: data.pagination },
    `${categoryLabel} unified feed fetched successfully`
  );
};
export const getFollowingUsersUnifiedFeed = async (ctx: any) => {
  const query = getFeedQuery(ctx.query ?? {});
  if (!query.category) throw new ApiError(400, "Category name is required");
  const data = await categouryService.getCategoryFeed({
    query,
    userVerified: ctx.userVerified,
    followingOnly: true,
  });
  const categoryName = query.category === "All" ? "all categories" : query.category;
  return legacyFeedResponse(
    { content: data.posts, pagination: data.pagination },
    `Following users' ${categoryName} unified feed fetched`
  );
};