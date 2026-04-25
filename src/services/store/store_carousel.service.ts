

// jsonb 


// src/services/store/store_carousel.service.ts

import { storeCarouselRepository } from "../../repository/store/store_carousel.repository";
import { ApiError } from "../../utils/ApiError";
import { saveTempFile } from "../../utils/cloudinary";
import { uploadResult } from "../../utils/cloudinary";
import type { CarouselItem } from "../../schemas/store/store_carousel.schema";
import { createstoreRepository } from "../../repository/store/createstore.repository";

class StoreCarouselService {

  // ✅ Create carousel
  async createCarousel(
    storeId: string,
    carouselsData: any[],
    filesByIndex: Record<number, any>
  ) {
    if (!storeId) throw new ApiError(400, "Store ID is required");
    if (!Array.isArray(carouselsData) || carouselsData.length === 0)
      throw new ApiError(400, "carouselsData must be a non-empty array");

    const store = await createstoreRepository.findById(storeId);
    if (!store) throw new ApiError(404, "Store not found");

    // ✅ Upsert store carousel doc
    const storeCarouselDoc = await storeCarouselRepository
      .upsertByStoreId(storeId);
    if (!storeCarouselDoc)
      throw new ApiError(500, "Failed to create store carousel");

    const newCarousels: any[] = [];
    const errors: any[] = [];

    for (const meta of carouselsData) {
      const { index, ...fields } = meta;

      const file = filesByIndex[index];
      if (!file) {
        errors.push({ index, error: `No image for carousel index ${index}` });
        continue;
      }

      // ✅ Upload image
      const logoPath = await saveTempFile(file);
      const uploaded = await uploadResult(logoPath);

      if (!uploaded?.secure_url) {
        errors.push({ index, error: "Image upload failed" });
        continue;
      }

      newCarousels.push({
        index,
        images: uploaded.secure_url,   // ← single image string
        ...(fields.imageAlt && { imageAlt: fields.imageAlt }),
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
        ...(fields.buttonShadow !== undefined && { buttonShadow: fields.buttonShadow }),
        ...(fields.buttonShadowColor && { buttonShadowColor: fields.buttonShadowColor }),
        ...(fields.buttonBorder !== undefined && { buttonBorder: fields.buttonBorder }),
        ...(fields.buttonBorderColor && { buttonBorderColor: fields.buttonBorderColor }),
        ...(fields.category && { category: fields.category }),
        ...(fields.productId && { productId: fields.productId }),
        ...(fields.fontFamily?.length && { fontFamily: fields.fontFamily }),
        ...(fields.overlayOpacity !== undefined && { overlayOpacity: fields.overlayOpacity }),
      });
    }

    const savedCarousels = newCarousels.length > 0
      ? await storeCarouselRepository.createCarouselItems(storeId, newCarousels)
      : [];

    return {
      storeCarouselId: storeCarouselDoc.id,
      created: savedCarousels,
      errors,
      totalCreated: savedCarousels.length,
      totalFailed: errors.length,
    };
  }

  // ✅ Get store carousels
  async getStoreCarousels(storeId: string) {
    if (!storeId) throw new ApiError(400, "Store ID is required");

    const doc = await storeCarouselRepository.findByStoreId(storeId);
    if (!doc) throw new ApiError(404, "No carousels found for this store");

    return doc;
  }

  // ✅ Update carousel item
  async updateCarousel(
    storeId: string,
    carouselId: string,
    body: any,
    file?: any
  ) {
    if (!storeId) throw new ApiError(400, "Store ID is required");
    if (!carouselId) throw new ApiError(400, "Carousel ID is required");

    const updates: Partial<CarouselItem> = {};

    // ✅ Upload new image if provided
    if (file) {
      const logoPath = await saveTempFile(file);
      const uploaded = await uploadResult(logoPath);
      if (!uploaded?.secure_url)
        throw new ApiError(500, "Image upload failed");
      updates.images = uploaded.secure_url;
    }

    // ✅ Add other updates
    if (body.imageAlt !== undefined) updates.imageAlt = body.imageAlt;
    if (body.title !== undefined) updates.title = body.title;
    if (body.titleColor !== undefined) updates.titleColor = body.titleColor;
    if (body.tileBackground !== undefined) updates.tileBackground = body.tileBackground;
    if (body.description !== undefined) updates.description = body.description;
    if (body.descriptionColor !== undefined) updates.descriptionColor = body.descriptionColor;
    if (body.discriptionBackgroundColor !== undefined) updates.discriptionBackgroundColor = body.discriptionBackgroundColor;
    if (body.buttonText !== undefined) updates.buttonText = body.buttonText;
    if (body.buttonTextColor !== undefined) updates.buttonTextColor = body.buttonTextColor;
    if (body.buttonHoverTextColor !== undefined) updates.buttonHoverTextColor = body.buttonHoverTextColor;
    if (body.buttonBackground !== undefined) updates.buttonBackground = body.buttonBackground;
    if (body.buttonHoverBackground !== undefined) updates.buttonHoverBackground = body.buttonHoverBackground;
    if (body.buttonShadow !== undefined) updates.buttonShadow = body.buttonShadow;
    if (body.buttonShadowColor !== undefined) updates.buttonShadowColor = body.buttonShadowColor;
    if (body.buttonBorder !== undefined) updates.buttonBorder = body.buttonBorder;
    if (body.buttonBorderColor !== undefined) updates.buttonBorderColor = body.buttonBorderColor;
    if (body.category !== undefined) updates.category = body.category;
    if (body.productId !== undefined) updates.productId = body.productId;
    if (body.fontFamily !== undefined) updates.fontFamily = body.fontFamily;
    if (body.overlayOpacity !== undefined) updates.overlayOpacity = body.overlayOpacity;

    const updated = await storeCarouselRepository
      .updateCarouselItem(storeId, carouselId, updates);

    return updated;
  }

  // ✅ Delete carousel item
  async deleteCarousel(storeId: string, carouselId: string) {
    if (!storeId) throw new ApiError(400, "Store ID is required");
    if (!carouselId) throw new ApiError(400, "Carousel ID is required");

    const deleted = await storeCarouselRepository
      .deleteCarouselItem(storeId, carouselId);

    return deleted;
  }
}

export const storeCarouselService = new StoreCarouselService();





// // old code

// // src/service/store_carousel.service.ts
// import { ApiError } from "../../utils/ApiError";
// import { storeCarouselRepository } from "../../repository/store/store_carousel.repository";
// import { uploadResult, saveTempFile } from "../../utils/cloudinary"; 

// class StoreCarouselService {

//   async createCarousel(storeId: string, carouselsData: any[], filesByIndex: Record<number, any>) {
    
//     console.log("carousel services:", storeId);
//     if (!storeId) throw new ApiError(400, "Valid Store ID is required");
//     if (!Array.isArray(carouselsData) || carouselsData.length === 0)
//       throw new ApiError(400, "carouselsData must be a non-empty array");

//     const storeCarouselDoc = await storeCarouselRepository.upsertByStoreId(storeId);
//     if (!storeCarouselDoc) throw new ApiError(500, "Failed to create or retrieve store carousel document");

//     const newCarousels: any[] = [];
//     const errors: any[] = [];

//     for (const meta of carouselsData) {
//       const { index, ...fields } = meta;

//       const file = filesByIndex[index];
//       if (!file) {
//         errors.push({ index, error: `No image file for carousel index ${index}` });
//         continue;
//       }

//       // ✅ Save to disk first, then upload — same as createstore service
//       const logoPath = await saveTempFile(file);
//       const uploaded = await uploadResult(logoPath);

//       if (!uploaded?.secure_url) {
//         errors.push({ index, error: "Image upload to Cloudinary failed" });
//         continue;
//       }

//       newCarousels.push({
//         index,
//         images: uploaded.secure_url,
//         imageAlt: fields.imageAlt || "Banner Background",
//         ...(fields.title && { title: fields.title }),
//         ...(fields.titleColor && { titleColor: fields.titleColor }),
//         ...(fields.tileBackground && { tileBackground: fields.tileBackground }),
//         ...(fields.description && { description: fields.description }),
//         ...(fields.descriptionColor && { descriptionColor: fields.descriptionColor }),
//         ...(fields.discriptionBackgroundColor && { discriptionBackgroundColor: fields.discriptionBackgroundColor }),
//         ...(fields.buttonText && { buttonText: fields.buttonText }),
//         ...(fields.buttonTextColor && { buttonTextColor: fields.buttonTextColor }),
//         ...(fields.buttonHoverTextColor && { buttonHoverTextColor: fields.buttonHoverTextColor }),
//         ...(fields.buttonBackground && { buttonBackground: fields.buttonBackground }),
//         ...(fields.buttonHoverBackground && { buttonHoverBackground: fields.buttonHoverBackground }),
//         ...(fields.buttonShadowColor && { buttonShadowColor: fields.buttonShadowColor }),
//         ...(fields.buttonBorderColor && { buttonBorderColor: fields.buttonBorderColor }),
//         ...(fields.category && { category: fields.category }),
//         ...(fields.productId && { productId: fields.productId }),
//         ...(fields.fontFamily?.length && { fontFamily: fields.fontFamily }),
//         ...(fields.buttonShadow !== undefined && { buttonShadow: fields.buttonShadow }),
//         ...(fields.buttonBorder !== undefined && { buttonBorder: fields.buttonBorder }),
//         ...(fields.overlayOpacity !== undefined && { overlayOpacity: fields.overlayOpacity }),
//       });
//     }

//     const savedCarousels = newCarousels.length > 0
//       ? await storeCarouselRepository.createCarouselItems(storeCarouselDoc.id, newCarousels)
//       : [];

//     return {
//       storeCarouselId: storeCarouselDoc.id,
//       created: savedCarousels,
//       errors,
//       totalCreated: savedCarousels.length,
//       totalFailed: errors.length,
//     };
//   }

//   async getStoreCarousels(storeId: string) {
//     if (!storeId) throw new ApiError(400, "Store ID is required");
//     const doc = await storeCarouselRepository.findByStoreId(storeId);
//     if (!doc) return { storeId, carousels: [] };
//     return doc;
//   }

//   async updateCarousel(storeId: string, carouselId: string, fields: any, file?: any) {
//     if (!storeId || !carouselId) throw new ApiError(400, "Store ID and Carousel ID are required");

//     const existing = await storeCarouselRepository.findCarouselItem(storeId, carouselId);
//     if (!existing) throw new ApiError(404, "Carousel not found for this store");

//     let imageUrl: string | undefined;
//     if (file) {
//       // ✅ Save to disk first, then upload — same as createstore service
//       const logoPath = await saveTempFile(file);
//       const uploaded = await uploadResult(logoPath);
//       if (!uploaded?.secure_url) throw new ApiError(500, "Image upload to Cloudinary failed");
//       imageUrl = uploaded.secure_url;
//     }

//     const updateFields: any = {};
//     if (fields.title !== undefined) updateFields.title = fields.title;
//     if (fields.description !== undefined) updateFields.description = fields.description;
//     if (fields.titleColor !== undefined) updateFields.titleColor = fields.titleColor;
//     if (fields.tileBackground !== undefined) updateFields.tileBackground = fields.tileBackground;
//     if (fields.imageAlt !== undefined) updateFields.imageAlt = fields.imageAlt;
//     if (fields.productId !== undefined) updateFields.productId = fields.productId;
//     if (imageUrl) updateFields.images = imageUrl;

//     if (Object.keys(updateFields).length === 0)
//       throw new ApiError(400, "No fields provided to update");

//     return await storeCarouselRepository.updateCarouselItem(carouselId, updateFields);
//   }

//   async deleteCarousel(storeId: string, carouselId: string) {
//     if (!storeId || !carouselId) throw new ApiError(400, "Store ID and Carousel ID are required");

//     const existing = await storeCarouselRepository.findCarouselItem(storeId, carouselId);
//     if (!existing) throw new ApiError(404, "Carousel not found");

//     await storeCarouselRepository.deleteCarouselItem(carouselId);
//   }
// }

// export const storeCarouselService = new StoreCarouselService();

