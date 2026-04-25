// src/services/store/store_product.service.ts
import { storeProductRepository } from "../../repository/store/store_product.repository";
import { ApiError } from "../../utils/ApiError";
import { saveTempFile, uploadResult } from "../../utils/cloudinary";
import type { ProductColor } from "../../schemas/store/store_product.schema";
import { isUUID } from "../../Validators/isUUID";
import { safeParseJSON } from "../../Validators/safeParseJSON";

class StoreProductService {

  // ✅ Calculate final price
  private calculateFinalPrice(
    price: number,
    discount: number = 0
  ): number {
    return Number((price - price * (discount / 100)).toFixed(2));
  }

  // ✅ Add product
  
async addProduct(
  storeId: string,
  body: any,
  filesByIndex: Record<number, any>
) {
  if (!storeId) throw new ApiError(400, "Store ID is required");
  if (!isUUID(storeId)) throw new ApiError(400, "Invalid Store ID format");
  if (!body.productName || !body.productPrice)
    throw new ApiError(400, "Product name and price are required");

  // ✅ Check duplicate name
  const nameExists = await storeProductRepository
    .findByName(storeId, body.productName);
  if (nameExists)
    throw new ApiError(409, "Product name already taken, choose another");

  // ✅ Get ordered files
  const orderedFiles = Object.keys(filesByIndex)
    .sort((a, b) => Number(a) - Number(b))
    .map(key => filesByIndex[Number(key)]);

  if (orderedFiles.length === 0)
    throw new ApiError(400, "At least one product image is required");

  // ✅ Upload images in order
  const uploadedImages = await Promise.all(
    orderedFiles.map(async (file) => {
      const path = await saveTempFile(file);
      const result = await uploadResult(path);
      if (!result?.secure_url)
        throw new ApiError(500, "Image upload failed");
      return result.secure_url;
    })
  );

  // ✅ Parse productColors
  let parsedColors: ProductColor[] = [];
  if (body.productColors) {
    parsedColors = safeParseJSON<ProductColor[]>(
      body.productColors,
      "productColors"   // ← field name for better error message
    );

    if (!Array.isArray(parsedColors)) {
      throw new ApiError(400, "productColors must be an array");
    }

    for (const entry of parsedColors) {
      if (entry.color === undefined || entry.index === undefined)
        throw new ApiError(400, "Each color must have 'color' and 'index'");
      if (entry.index < 0 || entry.index >= uploadedImages.length)
        throw new ApiError(400, `Color index ${entry.index} out of range`);
    }
  }

  // ✅ Parse all arrays safely with field names
  const productSizes = body.productSizes
    ? safeParseJSON<string[]>(body.productSizes, "productSizes")
    : [];

  const variants = body.variants
    ? safeParseJSON<string[]>(body.variants, "variants")
    : [];

  const specifications = body.specifications
    ? safeParseJSON<string[]>(body.specifications, "specifications")
    : [];

  const tags = body.tags
    ? safeParseJSON<string[]>(body.tags, "tags")
    : [];

  const productPrice = Number(body.productPrice);
  const productDiscount = Number(body.productDiscount || 0);
  const finalPrice = this.calculateFinalPrice(productPrice, productDiscount);

  // ✅ Create product
  const product = await storeProductRepository.create({
    storeId,
    productName: body.productName,
    description: body.description || "",
    warnings: body.warnings || "",
    productPrice: String(productPrice),
    productDiscount: String(productDiscount),
    finalPrice: String(finalPrice),
    productSizes,
    productColors: parsedColors,
    productImages: uploadedImages,
    category: body.category,
    stock: Number(body.stock || 0),
    variants,
    specifications,
    tags,
  });

  return product;
}

  // ✅ Get store products
  async getStoreProducts(
    storeId: string,
    query: {
      page?: string;
      limit?: string;
      category?: string;
      sort?: string;
    }
  ) {
    if (!storeId) throw new ApiError(400, "Store ID is required");

    return await storeProductRepository.findByStoreId(storeId, {
      page: Number(query.page || 1),
      limit: Number(query.limit || 10),
      category: query.category,
      sort: query.sort,
    });
  }

  // ✅ Get product by ID
  async getProductById(productId: string) {
    if (!productId) throw new ApiError(400, "Product ID is required");

    const product = await storeProductRepository.findById(productId);
    if (!product) throw new ApiError(404, "Product not found");

    return product;
  }

  // ✅ Update product
  async updateProduct(
    productId: string,
    storeId: string,
    body: any,
    files?: Record<number, any>
  ) {
    if (!storeId) throw new ApiError(400, "Store ID is required");

    const product = await storeProductRepository.findById(productId);
    if (!product) throw new ApiError(404, "Product not found");

    // ✅ Check name conflict
    if (body.productName && body.productName !== product.productName) {
      const nameExists = await storeProductRepository
        .findByName(storeId, body.productName);
      if (nameExists)
        throw new ApiError(409, "Product name already taken");
    }

    const updateData: any = {};

    if (body.productName) updateData.productName = body.productName;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.warnings !== undefined) updateData.warnings = body.warnings;
    if (body.category) updateData.category = body.category;
    if (body.stock !== undefined) updateData.stock = Number(body.stock);

    if (body.variants) {
      updateData.variants = typeof body.variants === "string"
        ? JSON.parse(body.variants) : body.variants;
    }
    if (body.specifications) {
      updateData.specifications = typeof body.specifications === "string"
        ? JSON.parse(body.specifications) : body.specifications;
    }
    if (body.tags) {
      updateData.tags = typeof body.tags === "string"
        ? JSON.parse(body.tags) : body.tags;
    }

    // ✅ Recalculate final price
    const productPrice = Number(body.productPrice || product.productPrice);
    const productDiscount = Number(body.productDiscount || product.productDiscount);

    if (body.productPrice || body.productDiscount) {
      updateData.productPrice = String(productPrice);
      updateData.productDiscount = String(productDiscount);
      updateData.finalPrice = String(
        this.calculateFinalPrice(productPrice, productDiscount)
      );
    }

    // ✅ Handle new images
    if (files && Object.keys(files).length > 0) {
      const orderedFiles = Object.keys(files)
        .sort((a, b) => Number(a) - Number(b))
        .map(key => files[Number(key)]);

      const newImages = await Promise.all(
        orderedFiles.map(async (file) => {
          const path = await saveTempFile(file);
          const result = await uploadResult(path);
          if (!result?.secure_url)
            throw new ApiError(500, "Image upload failed");
          return result.secure_url;
        })
      );

      // ✅ Append new images to existing
      updateData.productImages = [
        ...(product.productImages as string[]),
        ...newImages
      ];
    }

    return await storeProductRepository.update(productId, updateData);
  }

  // ✅ Delete product
  async deleteProduct(productId: string, storeId: string) {
    if (!storeId) throw new ApiError(400, "Store ID is required");

    const product = await storeProductRepository.findById(productId);
    if (!product) throw new ApiError(404, "Product not found");

    return await storeProductRepository.delete(productId);
  }

  // ✅ Remove product image
  async removeProductImage(
    productId: string,
    storeId: string,
    imageUrl: string
  ) {
    if (!storeId) throw new ApiError(400, "Store ID is required");
    if (!imageUrl) throw new ApiError(400, "Image URL is required");

    return await storeProductRepository.removeImage(productId, imageUrl);
  }
}

export const storeProductService = new StoreProductService();