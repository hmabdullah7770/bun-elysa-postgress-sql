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
  category: query.category ?? query.categouryname,
});

const getCategoryFeed = async (ctx: any, options: {
  followingOnly?: boolean;
  videosOnly?: boolean;
  imagesOnly?: boolean;
} = {}) => {
  const query = getFeedQuery(ctx.query ?? {});
  if (!query.category) throw new ApiError(400, "Category is required");
  const data = await categouryService.getCategoryFeed({
    query,
    userVerified: ctx.userVerified,
    ...options,
  });
  return new ApiResponse(200, data, "Category posts fetched successfully");
};

const getFollowingFeed = async (ctx: any) => {
  const data = await categouryService.getCategoryFeed({
    query: getFeedQuery(ctx.query ?? {}),
    userVerified: ctx.userVerified,
    followingOnly: true,
  });
  return new ApiResponse(200, data, "Following users' posts fetched successfully");
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

export const getPostsByCategory = (ctx: any) => getCategoryFeed(ctx);
export const getPostsByCategoryCousor = (ctx: any) => getCategoryFeed(ctx);
export const getPostsByCategoryCousorRedis = (ctx: any) => getCategoryFeed(ctx);
export const gethasVideoPostsByCategory = (ctx: any) =>
  getCategoryFeed(ctx, { videosOnly: true });
export const getonlyImagePostsByCategory = (ctx: any) =>
  getCategoryFeed(ctx, { imagesOnly: true });
export const getFollowingUsersPosts = (ctx: any) => getFollowingFeed(ctx);
export const getFollowingUsersCategoryUltraFast = (ctx: any) => getFollowingFeed(ctx);
export const getUnifiedFeed = async ({ query }: any) => {
  const data = await categouryService.getCategoryFeed({ query: getFeedQuery(query ?? {}) });
  return new ApiResponse(200, data, "Unified feed fetched successfully");
};
export const getFollowingUsersUnifiedFeed = (ctx: any) => getFollowingFeed(ctx);