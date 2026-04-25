// src/repository/store/store_cart.repository.ts
import { eq, and, SQL, inArray } from "drizzle-orm";
import { db } from "../../db";
import { store_product } from "../../schemas/store/store_product.schema"; // <-- replace with your real schema
import {
  store_cart,
  store_cart_item,
  type NewStoreCart,
  type NewStoreCartItem,
  type StoreCart,
  type StoreCartItem,
  type StoreCartWithItems,
} from "../../schemas/store/store_cart.schema";
import { ApiError } from "../../utils/ApiError";

export class StoreCartRepository {

  // ─── Find cart by userId + storeId ───
  async findByUserAndStore(
    userId: string,
    storeId: string
  ): Promise<StoreCartWithItems | undefined> {
    return await db.query.store_cart.findFirst({
      where: and(
        eq(store_cart.userId, userId),
        eq(store_cart.storeId, storeId)
      ),
      with: {
        items: true,
      },
    });
  }

  async findProductsByIdsAndStore(
    productIds: string[],
    storeId: string
  ) {
    if (!productIds.length) return [];

    return await db
      .select({
        id: store_product.id,
        storeId: store_product.storeId,
        productName: store_product.productName,
        productImages: store_product.productImages,
        productPrice: store_product.productPrice,
        finalPrice: store_product.finalPrice,
        productDiscount: store_product.productDiscount,
        stock: store_product.stock,
        category: store_product.category,
        productColors: store_product.productColors,
      })
      .from(store_product)
      .where(
        and(
          eq(store_product.storeId, storeId),
          inArray(store_product.id, productIds)
        )
      );
  }
  


  // ─── Create cart ───
  async create(data: NewStoreCart): Promise<StoreCart> {
    const result = await db
      .insert(store_cart)
      .values(data)
      .returning();

    if (!result[0]) {
      throw new ApiError(500, "Failed to create cart");
    }

    return result[0];
  }

  // ─── Delete cart ───
  async deleteByUserAndStore(
    userId: string,    // ✅ string (UUID)
    storeId: string    // ✅ string (UUID)
  ) {
    return await db
      .delete(store_cart)
      .where(
        and(
          eq(store_cart.userId, userId),
          eq(store_cart.storeId, storeId),
        ),
      )
      .returning();
  }

  // ─── Find cart item ───
  async findStoreCartItem(
    storeCartId: number,   // ✅ number (BIGINT - store_cart.id)
    productId: string,     // ✅ string (UUID)
    colorId: number | null,
    size: string | null,
  ): Promise<StoreCartItem | undefined> {

    const conditions: SQL[] = [
      eq(store_cart_item.storeCartId, storeCartId),
      eq(store_cart_item.productId, productId),  // ✅ UUID string
    ];

    if (colorId !== null) {
      conditions.push(eq(store_cart_item.colorId, colorId));
    }

    if (size !== null) {
      conditions.push(eq(store_cart_item.size, size));
    }

    return await db.query.store_cart_item.findFirst({
      where: and(...conditions),
    });
  }

  // ─── Add item to cart ───
  async addItem(data: NewStoreCartItem): Promise<StoreCartItem> {
    const result = await db
      .insert(store_cart_item)
      .values(data)
      .returning();

    if (!result[0]) {
      throw new ApiError(500, "Failed to add item to cart");
    }

    return result[0];
  }

  // ─── Update item quantity ───
  async updateItemQuantity(
    itemId: number,
    quantity: number
  ): Promise<StoreCartItem> {
    const result = await db
      .update(store_cart_item)
      .set({ quantity })
      .where(eq(store_cart_item.id, itemId))
      .returning();

    if (!result[0]) {
      throw new ApiError(500, "Failed to update item quantity");
    }

    return result[0];
  }

  // ─── Remove single item ───
  async removeItem(itemId: number): Promise<StoreCartItem[]> {
    return await db
      .delete(store_cart_item)
      .where(eq(store_cart_item.id, itemId))
      .returning();
  }

  // ─── Remove all items by productId ───
  async removeByProduct(
    storeCartId: number,
    productId: string    // ✅ string (UUID)
  ): Promise<StoreCartItem[]> {
    return await db
      .delete(store_cart_item)
      .where(
        and(
          eq(store_cart_item.storeCartId, storeCartId),
          eq(store_cart_item.productId, productId),
        ),
      )
      .returning();
  }

  // ─── Get all items ───
  async getStoreCartItems(
    storeCartId: number
  ): Promise<StoreCartItem[]> {
    return await db.query.store_cart_item.findMany({
      where: eq(store_cart_item.storeCartId, storeCartId),
    });
  }
}

export const storeCartRepository = new StoreCartRepository();