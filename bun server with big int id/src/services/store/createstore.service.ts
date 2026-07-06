// src/services/store/createstore.service.ts
import { createstoreRepository, storeRatingRepository } from "../../repository/store/createstore.repository";
import { uploadResult, saveTempFile } from "../../utils/cloudinary";
import { ApiError } from "../../utils/ApiError";
import type { NewCreateStore } from "../../schemas/store/createStore.schema";

export interface CreateStoreInput {
  storeName: string;
  category?: string;
  storeLogo: File;
  ownerId: string;
}

export interface UpdateStoreInput {
  storeName?: string;
  category?: string;
  storeLogo?: File;
}

export interface RateStoreInput {
  storeId: string;
  userId: string;
  rating: number;
}

export class CreateStoreService {

  // â”€â”€â”€ Create Store â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async createStore(input: CreateStoreInput) {
    const { storeName, category, storeLogo, ownerId } = input;

    // Validate required fields
    if (!storeName) {
      throw new ApiError(400, "Store name is required");
    }

    if (!storeLogo) {
      throw new ApiError(400, "Store logo is required");
    }

    // Check if user already has a store
    const existingStore = await createstoreRepository.findByOwnerId(ownerId);
    if (existingStore) {
      throw new ApiError(409, "You already have a store");
    }

    // Check if store name is taken
    const storeNameExists = await createstoreRepository.findByName(storeName);
    if (storeNameExists) {
      throw new ApiError(409, "Store name already taken, choose another");
    }

    // âœ… Save file to disk first, then upload (same as auth service)
    const logoPath = await saveTempFile(storeLogo);

    const uploadedLogo = await uploadResult(logoPath);
    if (!uploadedLogo) {
      throw new ApiError(500, "Failed to upload store logo");
    }

    // Create the store
    const storeData: NewCreateStore = {
      storeName,
      category: category || null,
      storeLogo: uploadedLogo.url,
      ownerId,
    };

    const store = await createstoreRepository.create(storeData);
    return store;
  }

  // â”€â”€â”€ Get Store By ID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getStoreById(storeId: string) {
    if (!storeId) {
      throw new ApiError(400, "Store ID is required");
    }

    const store = await createstoreRepository.findByIdWithOwner(storeId);
    if (!store) {
      throw new ApiError(404, "Store not found");
    }

    return store;
  }

  // â”€â”€â”€ Get All Stores For a User â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // âœ… Service â€” accept string directly
async getUserStores(ownerId: string) {
  if (!ownerId) throw new ApiError(400, "User ID is required");
  return await createstoreRepository.findAllByOwner(ownerId);
}

  // â”€â”€â”€ Update Store â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async updateStore(storeId: string, ownerId: string, input: UpdateStoreInput) {
    if (!storeId) {
      throw new ApiError(400, "Store ID is required");
    }

    // Verify store exists
    const store = await createstoreRepository.findById(storeId);
    if (!store) {
      throw new ApiError(404, "Store not found");
    }

    // Verify ownership
    if (store.ownerId !== ownerId) {
      throw new ApiError(403, "You are not authorized to update this store");
    }

    // Check if new store name is taken
    if (input.storeName && input.storeName !== store.storeName) {
      const storeNameExists = await createstoreRepository.findByName(input.storeName);
      if (storeNameExists) {
        throw new ApiError(409, "Store name already taken, choose another");
      }
    }

    // Prepare update data
    const updateData: Partial<NewCreateStore> = {};

    if (input.storeName) updateData.storeName = input.storeName;
    if (input.category !== undefined) updateData.category = input.category;

    // âœ… Save file to disk first, then upload (same as auth service)
    if (input.storeLogo) {
      const logoPath = await saveTempFile(input.storeLogo);

      const uploadedLogo = await uploadResult(logoPath);
      if (!uploadedLogo) {
        throw new ApiError(500, "Failed to upload store logo");
      }

      updateData.storeLogo = uploadedLogo.url;
    }

    const updatedStore = await createstoreRepository.update(storeId, updateData);
    return updatedStore;
  }

  // â”€â”€â”€ Delete Store â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async deleteStore(storeId: string, ownerId: string) {
    if (!storeId) {
      throw new ApiError(400, "Store ID is required");
    }

    // Verify store exists
    const store = await createstoreRepository.findById(storeId);
    if (!store) {
      throw new ApiError(404, "Store not found");
    }

    // Verify ownership
    if (store.ownerId !== ownerId) {
      throw new ApiError(403, "You are not authorized to delete this store");
    }

    await createstoreRepository.delete(storeId);
    return true;
  }

  // â”€â”€â”€ Increment Click Count â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async incrementClickCount(storeId: string) {
    if (!storeId) {
      throw new ApiError(400, "Store ID is required");
    }

    const store = await createstoreRepository.findById(storeId);
    if (!store) {
      throw new ApiError(404, "Store not found");
    }

    await createstoreRepository.incrementClickCount(storeId);
    return true;
  }

  // â”€â”€â”€ Rate a Store â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async rateStore(input: RateStoreInput) {
    const { storeId, userId, rating } = input;

    // Validate rating
    if (!rating) {
      throw new ApiError(400, "Rating is required");
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw new ApiError(400, "Rating must be an integer between 1 and 5");
    }

    // Check if store exists
    const store = await createstoreRepository.findById(storeId);
    if (!store) {
      throw new ApiError(404, "Store not found");
    }

    // Prevent rating own store
    if (store.ownerId === userId) {
      throw new ApiError(403, "You cannot rate your own store");
    }

    // Create or update rating
    const storeRating = await storeRatingRepository.upsert({
      storeId,
      userId,
      rating,
    });

    // Recalculate store average rating
    const { average, total } = await storeRatingRepository.calculateAverageRating(storeId);
    await createstoreRepository.updateRating(storeId, average, total);

    return storeRating;
  }

  // â”€â”€â”€ Get Top Rated Stores â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getTopRatedStores(page: number = 1, limit: number = 10, category?: string) {
    if (page < 1) throw new ApiError(400, "Page must be greater than 0");
    if (limit < 1) throw new ApiError(400, "Limit must be greater than 0");

    return await createstoreRepository.getTopRated({ page, limit, category });
  }

  // â”€â”€â”€ Get User Rated Stores â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getUserRatedStores(userId: string, page: number = 1, limit: number = 10) {
    if (!userId) {
      throw new ApiError(400, "User ID is required");
    }

    return await storeRatingRepository.findByUserId(userId, page, limit);
  }
}

export const createStoreService = new CreateStoreService();