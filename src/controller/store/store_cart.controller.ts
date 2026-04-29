// src/controllers/store_cart.controller.ts
import { storeCartService } from "../../services/store/store_cart.service";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { isValidId } from "../../Validators/bigintvalidator";
import { isUUID } from "../../Validators/isUUID";

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

    if (!isUUID(userId) || !isUUID(storeId) || !isUUID(productId)) {
      throw new ApiError(400, "Invalid ID format");
    }

    if (isNaN(quantity) || quantity < 1) {
      throw new ApiError(400, "Quantity must be a positive number");
    }

    const cart = await storeCartService.addToStoreCart({
      userId: String(userId),
      storeId: String(storeId),
      productId: String(productId),
      quantity,
      replaceQuantity,
      color: color ?? null,
      size: size ?? null,
    });

    return new ApiResponse(200, cart, "Product added to cart");
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

    return new ApiResponse(200, cartData, message);
  }

  // â”€â”€â”€ REMOVE FROM CART â”€â”€â”€
  async removeFromStoreCart(body: any) {
    const { userId, storeId, productId, color, size } = body;

    if (!userId || !storeId || !productId) {
      throw new ApiError(400, "userId, storeId and productId are required");
    }

    if (!isValidId(userId) || !isValidId(storeId) || !isValidId(productId)) {
      throw new ApiError(400, "Invalid ID format");
    }

    const cart = await storeCartService.removeFromStoreCart({
      userId: String(userId),
      storeId: String(storeId),
      productId: String(productId),
      color: color ?? null,
      size: size ?? null,
    });

    return new ApiResponse(200, cart, "Product removed from cart");
  }

  // â”€â”€â”€ CLEAR CART â”€â”€â”€
  async clearStoreCart(body: any) {
    const { userId, storeId } = body;

    if (!userId || !storeId) {
      throw new ApiError(400, "userId and storeId are required");
    }

    if (!isValidId(userId) || !isValidId(storeId)) {
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