// src/controllers/store_cart.controller.ts
import { storeCartService } from "../../services/store/store_cart.service";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import type { StoreCartWithItems } from "../../schemas/store/store_cart.schema";
import { isValidId } from "../../Validators/bigintvalidator";
import { isUUID } from "../../Validators/isUUID";

const toLegacyCartResponse = (cart: StoreCartWithItems | null | undefined) => {
  if (!cart) return null;

  return {
    _id: String(cart._id),
    userId: cart.userId,
    storeId: cart.storeId,
    products: cart.items.map((item) => ({
      _id: String(item._id),
      productId: item.productId == null ? null : String(item.productId),
      quantity: item.quantity,
      color: item.colorId == null
        ? null
        : {
            _id: String(item.colorId),
            color: item.colorValue,
            index: item.colorIndex,
          },
      size: item.size,
    })),
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
};

const toLegacyGetCartResponse = (
  cart: Awaited<ReturnType<typeof storeCartService.getStoreCart>>
) => ({
  items: cart.items.map((item) => ({
    productId: item.productId == null ? null : String(item.productId),
    productName: item.productName,
    productImages: item.productImages,
    productPrice: item.productPrice,
    finalPrice: item.finalPrice,
    productDiscount: item.productDiscount,
    stock: item.stock,
    category: item.category,
    quantity: item.quantity,
    color: item.color
      ? {
          _id: item.color._id == null ? null : String(item.color._id),
          color: item.color.color,
          index: item.color.index,
        }
      : null,
    size: item.size,
  })),
  total: cart.total,
  totalSavings: cart.totalSavings,
  totalQuantity: cart.totalQuantity,
});

export class StoreCartController {

  // â”€â”€â”€ ADD TO CART â”€â”€â”€
  async addToStoreCart(body: any) {
    const { userId, storeId, productId, color, size } = body;
    const quantity = parseInt(body.quantity, 10);
    const replaceQuantity =
      body.replaceQuantity === true || body.replaceQuantity === "true";

    if (!userId || !storeId || !productId) {
      throw new ApiError(400, "userId, storeId and productId are required");
    }

    if (!isUUID(userId) || !isUUID(storeId) ) {
      throw new ApiError(400, "Invalid ID format");
    }

    if(!isValidId(productId)) {
      throw new ApiError(400, "Invalid productId format");
    }

    if (isNaN(quantity) || quantity < 1) {
      throw new ApiError(400, "Quantity must be a positive number");
    }

    const cart = await storeCartService.addToStoreCart({
      userId: String(userId),
      storeId: String(storeId),
      productId: Number(productId),
      quantity,
      replaceQuantity,
      color: color ?? null,
      size: size ?? null,
    });

    return new ApiResponse(200, toLegacyCartResponse(cart), "Product added to cart");
  }

  // â”€â”€â”€ GET CART â”€â”€â”€
  async getStoreCart(userId: string, storeId: string) {
    if (!isUUID(userId) || !isUUID(storeId)) {
      throw new ApiError(400, "Invalid ID format");
    }

    const cartData = await storeCartService.getStoreCart(
      String(userId),
      String(storeId),
    );

    const message = cartData.items.length === 0
      ? "Cart is empty"
      : "Cart retrieved successfully";

    return new ApiResponse(200, toLegacyGetCartResponse(cartData), message);
  }

  // â”€â”€â”€ REMOVE FROM CART â”€â”€â”€
  async removeFromStoreCart(body: any) {
    const { userId, storeId, productId, color, size } = body;

    if (!userId || !storeId || !productId) {
      throw new ApiError(400, "userId, storeId and productId are required");
    }

     if (!isUUID(userId) || !isUUID(storeId)) {
      throw new ApiError(400, "Invalid ID format");
    }

    if (!isValidId(productId)) {
      throw new ApiError(400, "Invalid ID format");
    }

    const cart = await storeCartService.removeFromStoreCart({
      userId: String(userId),
      storeId: String(storeId),
      productId: Number(productId),
      color: color ?? null,
      size: size ?? null,
    });

    return new ApiResponse(200, toLegacyCartResponse(cart), "Product removed from cart");
  }

  // â”€â”€â”€ CLEAR CART â”€â”€â”€
  async clearStoreCart(body: any) {
    const { userId, storeId } = body;

    if (!userId || !storeId) {
      throw new ApiError(400, "userId and storeId are required");
    }


     if (!isUUID(userId) || !isUUID(storeId)) {
      throw new ApiError(400, "Invalid ID format");
     }
  

    await storeCartService.clearStoreCart(
      String(userId),
      String(storeId),
    );

    return new ApiResponse(200, null, "Cart cleared successfully");
  }
}

export const storeCartController = new StoreCartController();