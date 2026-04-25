// src/controller/store/store_product.controller.ts
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { storeProductService } from "../../services/store/store_product.service";

// ✅ Add product
export const addProduct = async ({ params, body }: any) => {
  const { storeId } = params;

  // ✅ Get files by index from body
  const filesByIndex: Record<number, any> = {};
  for (let i = 0; i <= 9; i++) {
    const file = body[`productImage${i}`];
    if (file) filesByIndex[i] = file;
  }

  const product = await storeProductService.addProduct(
    storeId,
    body,
    filesByIndex
  );

  return new ApiResponse(201, product, "Product added successfully");
};

// ✅ Get store products
export const getStoreProducts = async ({ params, query }: any) => {
  const { storeId } = params;

  const products = await storeProductService.getStoreProducts(
    storeId,
    query
  );

  return new ApiResponse(200, products, "Products fetched successfully");
};

// ✅ Get product by ID
export const getProductById = async ({ params }: any) => {
  const { productId } = params;

  const product = await storeProductService.getProductById(productId);

  return new ApiResponse(200, product, "Product fetched successfully");
};

// ✅ Update product
export const updateProduct = async ({ params, body }: any) => {
  const { productId, storeId } = params;

  // ✅ Get files by index
  const filesByIndex: Record<number, any> = {};
  for (let i = 0; i <= 9; i++) {
    const file = body[`productImage${i}`];
    if (file) filesByIndex[i] = file;
  }

  const product = await storeProductService.updateProduct(
    productId,
    storeId,
    body,
    filesByIndex
  );

  return new ApiResponse(200, product, "Product updated successfully");
};

// ✅ Delete product
export const deleteProduct = async ({ params }: any) => {
  const { productId, storeId } = params;

  await storeProductService.deleteProduct(productId, storeId);

  return new ApiResponse(200, null, "Product deleted successfully");
};

// ✅ Remove product image
export const removeProductImage = async ({ params, body }: any) => {
  const { productId, storeId } = params;
  const { imageUrl } = body;

  const product = await storeProductService.removeProductImage(
    productId,
    storeId,
    imageUrl
  );

  return new ApiResponse(200, product, "Product image removed successfully");
};