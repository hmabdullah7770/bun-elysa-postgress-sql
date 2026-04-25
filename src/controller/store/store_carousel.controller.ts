
// json b


// src/controller/store/store_carousel.controller.ts
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { storeCarouselService } from "../../services/store/store_carousel.service";

// ✅ Create carousel
export const createCarousel = async ({ params, body }: any) => {
  const { storeId } = params;

  if (!body.carouselsData) 
    throw new ApiError(400, "carouselsData is required");

  // ✅ Handle both string and parsed object
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

  // ✅ Get files by index
  const filesByIndex: Record<number, any> = {};
  for (let i = 0; i <= 9; i++) {
    const file = body[`carousel_${i}_images`];
    if (file) filesByIndex[i] = file;
  }

  const result = await storeCarouselService.createCarousel(
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

// ✅ Get store carousels
export const getStoreCarousels = async ({ params }: any) => {
  const { storeId } = params;

  const result = await storeCarouselService.getStoreCarousels(storeId);

  return new ApiResponse(200, result, "Carousels fetched successfully");
};

// ✅ Update carousel item
export const updateCarousel = async ({ params, body }: any) => {
  const { storeId, carouselId } = params;

  // ✅ Get image file if provided
  const file = body?.carouselImage || null;

  const result = await storeCarouselService.updateCarousel(
    storeId,
    carouselId,
    body,
    file
  );

  return new ApiResponse(200, result, "Carousel updated successfully");
};

// ✅ Delete carousel item
export const deleteCarousel = async ({ params }: any) => {
  const { storeId, carouselId } = params;

  await storeCarouselService.deleteCarousel(storeId, carouselId);

  return new ApiResponse(200, null, "Carousel deleted successfully");
};




// old code 


// // src/controller/store/store_carousel.controller.ts
// import { ApiError } from "../../utils/ApiError";
// import { ApiResponse } from "../../utils/ApiResponse";
// import { storeCarouselService } from "../../services/store/store_carousel.service";



// export const createCarousel = async ({ params, body }: any) => {
//   const { storeId } = params;


//   console.log("params:", params); // ← ADD THIS
//   console.log("storeId:", storeId); // ← ADD THIS

//   if (!body.carouselsData) throw new ApiError(400, "carouselsData is required");

//   // ✅ Handle BOTH cases: already parsed object OR raw string
//   let carouselsData;
//   try {
//     carouselsData =
//       typeof body.carouselsData === "string"
//         ? JSON.parse(body.carouselsData)  // ← string: parse it
//         : body.carouselsData;             // ← already object: use directly
//   } catch {
//     throw new ApiError(400, "Invalid carouselsData JSON");
//   }

//   if (!Array.isArray(carouselsData) || carouselsData.length === 0) {
//     throw new ApiError(400, "carouselsData must be a non-empty array");
//   }

//   const filesByIndex: Record<number, any> = {};
//   for (let i = 0; i <= 9; i++) {
//     const file = body[`carousel_${i}_images`];
//     if (file) filesByIndex[i] = file;
//   }

//   const result = await storeCarouselService.createCarousel(
//     storeId,
//     carouselsData,
//     filesByIndex
//   );

//   return new ApiResponse(
//     201,
//     result,
//     `${result.totalCreated} carousel(s) created successfully`
//   );
// };

// export const getStoreCarousels = async ({ params }: any) => {
//   const { storeId } = params;
//   const carousels = await storeCarouselService.getStoreCarousels(storeId);
//   return new ApiResponse(200, carousels, "Carousels fetched successfully");
// };

// export const updateCarousel = async ({ params, body }: any) => {
//   const { storeId, carouselId } = params;
//   const file = body?.carousel_image;

//   const updated = await storeCarouselService.updateCarousel(storeId, carouselId, body, file);
//   return new ApiResponse(200, { carousel: updated }, "Carousel updated successfully");
// };

// export const deleteCarousel = async ({ params }: any) => {
//   const { storeId, carouselId } = params;
//   await storeCarouselService.deleteCarousel(storeId, carouselId);
//   return new ApiResponse(200, {}, "Carousel deleted successfully");
// };


