// src/services/store/store_carousel_old.service.ts
import { ApiError } from "../../utils/ApiError";
import { storeCarouselOldRepository } from "../../repository/store/store_carousel_old.repository";
import { uploadResult, saveTempFile } from "../../utils/cloudinary";
import {createstoreRepository} from "../../repository/store/createstore.repository";
import { isUUID } from "../../Validators/isUUID";


class StoreCarouselOldService {

  async createCarousel(
    storeId: string,
    carouselsData: any[],
    filesByIndex: Record<number, any>
  ) {
    console.log("carousel old services:", storeId);

    if (!storeId) throw new ApiError(400, "Valid Store ID is required");
    if (!Array.isArray(carouselsData) || carouselsData.length === 0)
      throw new ApiError(400, "carouselsData must be a non-empty array");


    if (!isUUID(storeId)) {
      throw new ApiError(400, "Invalid store ID format");
    }

   const store = await createstoreRepository.findById(storeId);
   if (!store) throw new ApiError(404, "Store not found");

    const storeCarouselDoc = await storeCarouselOldRepository
      .upsertByStoreId(storeId);
    if (!storeCarouselDoc)
      throw new ApiError(500, "Failed to create or retrieve store carousel document");

    const newCarousels: any[] = [];
    const errors: any[] = [];

    for (const meta of carouselsData) {
      const { index, ...fields } = meta;

      const file = filesByIndex[index];
      if (!file) {
        errors.push({ index, error: `No image file for carousel index ${index}` });
        continue;
      }

      const logoPath = await saveTempFile(file);
      const uploaded = await uploadResult(logoPath);

      if (!uploaded?.secure_url) {
        errors.push({ index, error: "Image upload to Cloudinary failed" });
        continue;
      }

      newCarousels.push({
        index,
        images: uploaded.secure_url,
        imageAlt: fields.imageAlt || "Banner Background",
        ...(fields.title && { title: fields.title }),
        ...(fields.titleColor && { titleColor: fields.titleColor }),
        ...(fields.tileBackground && { tileBackground: fields.tileBackground }),
        ...(fields.description && { description: fields.description }),
        ...(fields.descriptionColor && { descriptionColor: fields.descriptionColor }),
        ...(fields.discriptionBackgroundColor && { discriptionBackgroundColor: fields.discriptionBackgroundColor }),
        ...(fields.buttonText && { buttonText: fields.buttonText }),
        ...(fields.buttonTextColor && { buttonTextColor: fields.buttonTextColor }),
        ...(fields.buttonHoverTextColor && { buttonHoverTextColor: fields.buttonHoverTextColor }),
        ...(fields.buttonBackground && { buttonBackground: fields.buttonBackground }),
        ...(fields.buttonHoverBackground && { buttonHoverBackground: fields.buttonHoverBackground }),
        ...(fields.buttonShadowColor && { buttonShadowColor: fields.buttonShadowColor }),
        ...(fields.buttonBorderColor && { buttonBorderColor: fields.buttonBorderColor }),
        ...(fields.category && { category: fields.category }),
        ...(fields.productId && { productId: fields.productId }),
        ...(fields.fontFamily?.length && { fontFamily: fields.fontFamily }),
        ...(fields.buttonShadow !== undefined && { buttonShadow: fields.buttonShadow }),
        ...(fields.buttonBorder !== undefined && { buttonBorder: fields.buttonBorder }),
        ...(fields.overlayOpacity !== undefined && { overlayOpacity: fields.overlayOpacity }),
      });
    }

    const savedCarousels = newCarousels.length > 0
      ? await storeCarouselOldRepository.createCarouselItems(
          storeCarouselDoc._id,
          newCarousels
        )
      : [];

    return {
      storeCarouselId: storeCarouselDoc._id,
      created: savedCarousels,
      errors,
      totalCreated: savedCarousels.length,
      totalFailed: errors.length,
    };
  }

  async getStoreCarousels(storeId: string) {
    if (!storeId) throw new ApiError(400, "Store ID is required");

     // âœ… 1. Validate UUID FIRST
  if (!isUUID(storeId)) {
    throw new ApiError(400, "Invalid store ID format");
  }


    const store = await createstoreRepository.findById(storeId);
    if (!store)   throw new ApiError(404, "Store not found");
    const doc = await storeCarouselOldRepository.findByStoreId(storeId);
    if (!doc) return { storeId, carousels: [] };
    return doc;
  }

  async updateCarousel(
    storeId: string,
    carouselId: string,
    fields: any,
    file?: any
  ) {
    if (!storeId || !carouselId)
      throw new ApiError(400, "Store ID and Carousel ID are required");

   if (!isUUID(storeId)) {
      throw new ApiError(400, "Invalid store ID format");
    }

    if (!isUUID(carouselId)) {
      throw new ApiError(400, "Invalid carousel ID format");
    }

    const existing = await storeCarouselOldRepository
      .findCarouselItem(storeId, carouselId);
    if (!existing)
      throw new ApiError(404, "Carousel not found for this store");

    let imageUrl: string | undefined;
    if (file) {
      const logoPath = await saveTempFile(file);
      const uploaded = await uploadResult(logoPath);
      if (!uploaded?.secure_url)
        throw new ApiError(500, "Image upload to Cloudinary failed");
      imageUrl = uploaded.secure_url;
    }

    const updateFields: any = {};
    if (fields.title !== undefined) updateFields.title = fields.title;
    if (fields.description !== undefined) updateFields.description = fields.description;
    if (fields.titleColor !== undefined) updateFields.titleColor = fields.titleColor;
    if (fields.tileBackground !== undefined) updateFields.tileBackground = fields.tileBackground;
    if (fields.imageAlt !== undefined) updateFields.imageAlt = fields.imageAlt;
    if (fields.productId !== undefined) updateFields.productId = fields.productId;
    if (imageUrl) updateFields.images = imageUrl;

    if (Object.keys(updateFields).length === 0)
      throw new ApiError(400, "No fields provided to update");

    return await storeCarouselOldRepository
      .updateCarouselItem(carouselId, updateFields);
  }

  async deleteCarousel(storeId: string, carouselId: string) {
    if (!storeId || !carouselId)
      throw new ApiError(400, "Store ID and Carousel ID are required");

    const existing = await storeCarouselOldRepository
      .findCarouselItem(storeId, carouselId);
    if (!existing) throw new ApiError(404, "Carousel not found");

    await storeCarouselOldRepository.deleteCarouselItem(carouselId);
  }
}

export const storeCarouselOldService = new StoreCarouselOldService();