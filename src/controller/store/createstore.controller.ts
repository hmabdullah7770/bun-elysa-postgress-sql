// src/controller/store/createstore.controller.ts
import { createStoreService } from "../../services/store/createstore.service";
import { ApiResponse } from "../../utils/ApiResponse";

// ──────────────── Public Controllers ────────────────

// GET /api/v1/stores/top-rated
export const getTopRatedStores = async ({ query }: any) => {
  const stores = await createStoreService.getTopRatedStores(
    parseInt(query.page) || 1,
    parseInt(query.limit) || 10,
    query.category
  );
  return new ApiResponse(200, stores, "Top rated stores retrieved successfully");
};

// GET /api/v1/stores/:storeId
export const getStoreById = async ({ params }: any) => {
  const store = await createStoreService.getStoreById(params.storeId);
  return new ApiResponse(200, store, "Store retrieved successfully");
};

// POST /api/v1/stores/:storeId/click
export const incrementClickCount = async ({ params }: any) => {
  await createStoreService.incrementClickCount(params.storeId);
  return new ApiResponse(200, null, "Click count incremented");
};

// ──────────────── Protected Controllers ────────────────

// POST /api/v1/stores
export const createStore = async ({ body, userVerified }: any) => {
  const store = await createStoreService.createStore({
    storeName: body.storeName,
    category: body.category,
    storeLogo: body.storeLogo,   // ← comes from body directly (multipart)
    ownerId: userVerified._id,            // ← comes from context
  });
  return new ApiResponse(201, store, "Store created successfully");
};

// GET /api/v1/stores/my-stores
export const getUserStores = async ({ userVerified  }: any) => {
  const stores = await createStoreService.getUserStores(userVerified._id);
  return new ApiResponse(200, stores, "User stores retrieved successfully");
};


// GET /api/v1/stores/my-ratings
export const getUserRatedStores = async ({ user, query }: any) => {
  const stores = await createStoreService.getUserRatedStores(
    user.id,
    parseInt(query.page) || 1,
    parseInt(query.limit) || 10
  );
  return new ApiResponse(200, stores, "User rated stores retrieved successfully");
};

// PATCH /api/v1/stores/:storeId
export const updateStore = async ({ params, body, userVerified }: any) => {
  const store = await createStoreService.updateStore(
    params.storeId,
    userVerified._id,
    {
      storeName: body.storeName,
      category: body.category,
      storeLogo: body.storeLogo,  // ← comes from body directly (multipart)
    }
  );
  return new ApiResponse(200, store, "Store updated successfully");
};

// DELETE /api/v1/stores/:storeId
export const deleteStore = async ({ params, user }: any) => {
  await createStoreService.deleteStore(params.storeId, user.id);
  return new ApiResponse(200, null, "Store deleted successfully");
};

// POST /api/v1/stores/rate
export const rateStore = async ({ body, user }: any) => {
  const storeRating = await createStoreService.rateStore({
    storeId: body.storeId,
    userId: user.id,
    rating: parseInt(body.rating),
  });
  return new ApiResponse(200, storeRating, "Store rated successfully");
};


// // src/controllers/store.controller.ts
// import { createStoreService } from "../../services/store/createstore.service";
// import { ApiResponse } from "../../utils/ApiResponse";

// export class StoreController {

//   // Create store
//   async createStore(body: any, userId: string, files: any) {
//     const store = await createStoreService.createStore({
//       storeName: body.storeName,
//       category: body.category,
//       storeLogo: files.storeLogo,
//       ownerId: userId,
//     });

//     return new ApiResponse(201, store, "Store created successfully");
//   }

//   // Get user's stores
//   async getUserStores(userId: string) {
//     const stores = await createStoreService.getUserStores(userId);
//     return new ApiResponse(200, stores, "User stores retrieved successfully");
//   }

//   // Get store by ID
//   async getStoreById(storeId: string) {
//     const store = await createStoreService.getStoreById(storeId);
//     return new ApiResponse(200, store, "Store retrieved successfully");
//   }

//   // Update store
//   async updateStore(storeId: string, userId: string, body: any, files: any) {
//     const store = await createStoreService.updateStore(storeId, userId, {
//       storeName: body.storeName,
//       category: body.category,
//       storeLogo: files?.storeLogo,
//     });

//     return new ApiResponse(200, store, "Store updated successfully");
//   }

//   // Delete store
//   async deleteStore(storeId: string, userId: string) {
//     await createStoreService.deleteStore(storeId, userId);
//     return new ApiResponse(200, null, "Store deleted successfully");
//   }

//   // Increment click count
//   async incrementClickCount(storeId: string) {
//     await createStoreService.incrementClickCount(storeId);
//     return new ApiResponse(200, null, "Click count incremented");
//   }

//   // Rate store
//   async rateStore(body: any, userId: string) {
//     const storeRating = await createStoreService.rateStore({
//       storeId: body.storeId,
//       userId,
//       rating: parseInt(body.rating),
//     });

//     return new ApiResponse(200, storeRating, "Store rated successfully");
//   }

//   // Get top rated stores
//   async getTopRatedStores(query: any) {
//     const stores = await createStoreService.getTopRatedStores(
//       parseInt(query.page) || 1,
//       parseInt(query.limit) || 10,
//       query.category
//     );

//     return new ApiResponse(200, stores, "Top rated stores retrieved successfully");
//   }

//   // Get user's rated stores
//   async getUserRatedStores(userId: string, query: any) {
//     const stores = await createStoreService.getUserRatedStores(
//       userId,
//       parseInt(query.page) || 1,
//       parseInt(query.limit) || 10
//     );

//     return new ApiResponse(200, stores, "User rated stores retrieved successfully");
//   }
// }

// export const createstoreController = new StoreController();