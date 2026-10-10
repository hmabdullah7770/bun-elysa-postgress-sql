import { bannerService } from "../services/banner.service";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

const parseBannerId = (value: unknown) => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new ApiError(400, "Invalid banner ID");
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new ApiError(400, "Invalid banner ID");
  }
  return id;
};

export const createBanner = async ({ body, userVerified }: any) => {
  const banner = await bannerService.create({
    owner: userVerified,
    store: body.store ?? null,
    bannerImage: body.bannerImage,
  });
  return new ApiResponse(201, banner, "Banner created successfully");
};

export const getBanners = async () =>
  new ApiResponse(200, await bannerService.listActive(), "Banners fetched successfully");

export const deleteBanner = async ({ query, userVerified }: any) => {
  const id = parseBannerId(query.bannerId);
  const banner = await bannerService.delete(id, userVerified._id);
  return new ApiResponse(200, banner, "Banner deleted successfully");
};
