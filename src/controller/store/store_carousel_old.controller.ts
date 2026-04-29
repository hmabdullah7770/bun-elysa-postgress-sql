// src/controller/store/store_carousel_old.controller.ts
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { storeCarouselOldService } from "../../services/store/store_carousel_old.service";

export const createCarouselOld = async ({ params, body }: any) => {
  const { storeId } = params;

  console.log("params:", params);
  console.log("storeId:", storeId);

  if (!body.carouselsData)
    throw new ApiError(400, "carouselsData is required");

  let carouselsData;
  try {
    carouselsData = typeof body.carouselsData === "string"
      ? JSON.parse(body.carouselsData)
      : body.carouselsData;
  } catch {
    throw new ApiError(400, "Invalid carouselsData JSON");
  }

  if (!Array.isArray(carouselsData) || carouselsData.length === 0)
    throw new ApiError(400, "carouselsData must be a non-empty array");

  const filesByIndex: Record<number, any> = {};
  for (let i = 0; i <= 9; i++) {
    const file = body[`carousel_${i}_images`];
    if (file) filesByIndex[i] = file;
  }

  const result = await storeCarouselOldService.createCarousel(
    storeId,
    carouselsData,
    filesByIndex
  );

  return new ApiResponse(
    201,
    result,
    `${result.totalCreated} carousel(s) created successfully`
  );
};

export const getStoreCarouselsOld = async ({ params }: any) => {
  const { storeId } = params;
  const carousels = await storeCarouselOldService.getStoreCarousels(storeId);
  return new ApiResponse(200, carousels, "Carousels fetched successfully");
};

export const updateCarouselOld = async ({ params, body }: any) => {
  const { storeId, carouselId } = params;
  const file = body?.carousel_image;

  const updated = await storeCarouselOldService.updateCarousel(
    storeId,
    carouselId,
    body,
    file
  );
  return new ApiResponse(
    200,
    { carousel: updated },
    "Carousel updated successfully"
  );
};

export const deleteCarouselOld = async ({ params }: any) => {
  const { storeId, carouselId } = params;
  await storeCarouselOldService.deleteCarousel(storeId, carouselId);
  return new ApiResponse(200, {}, "Carousel deleted successfully");
};