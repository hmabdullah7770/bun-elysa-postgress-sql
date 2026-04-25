// src/services/store_cart.service.ts
import { storeCartRepository } from "../../repository/store/store_cart.repository";
import { ApiError } from "../../utils/ApiError";
import type { StoreCartItem } from "../../schemas/store/store_cart.schema";

// ─── Input Interfaces ───
interface AddToStoreCartInput {
  userId: string;      // ✅ string (UUID)
  storeId: string;     // ✅ string (UUID)
  productId: string;   // ✅ string (UUID)
  quantity: number;
  replaceQuantity: boolean;
  color: {
    _id: number | null;
    color: string | null;
    index: number | null;
  } | null;
  size: string | null;
}

interface RemoveFromStoreCartInput {
  userId: string;      // ✅ string (UUID)
  storeId: string;     // ✅ string (UUID)
  productId: string;   // ✅ string (UUID)
  color: {
    _id: number | null;
  } | null;
  size: string | null;
}

// ─── Response Interfaces ───
interface CartItemResponse {
  productId: string;   // ✅ string (UUID)
  quantity: number;
  color: {
    _id: number;
    color: string | null;
    index: number | null;
  } | null;
  size: string | null;
}

interface GetCartResponse {
  items: CartItemResponse[];
  total: number;
  totalSavings: number;
  totalQuantity: number;
}

export class StoreCartService {

  // ─── ADD TO CART ───
  async addToStoreCart(input: AddToStoreCartInput) {
    const {
      userId,
      storeId,
      productId,
      quantity,
      replaceQuantity,
      color,
      size,
    } = input;

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new ApiError(400, "Quantity must be a positive number");
    }

    const normalizedColorId: number | null = color?._id ?? null;
    const normalizedColorValue: string | null = color?.color ?? null;
    const normalizedColorIndex: number | null = color?.index ?? null;
    const normalizedSize: string | null = size ?? null;

    // ─── Find or Create Cart ───
    let cart = await storeCartRepository.findByUserAndStore(
      userId,    // ✅ UUID string
      storeId    // ✅ UUID string
    );

    if (!cart) {
      // ✅ Create new cart with UUID strings
      const newCart = await storeCartRepository.create({
        userId,   // ✅ UUID string
        storeId   // ✅ UUID string
      });

      if (!newCart) {
        throw new ApiError(500, "Failed to create cart");
      }

      // ✅ Add first item
      await storeCartRepository.addItem({
        storeCartId: newCart.id,   // ✅ BIGINT number
        productId,                 // ✅ UUID string
        quantity,
        colorId: normalizedColorId,
        colorValue: normalizedColorValue,
        colorIndex: normalizedColorIndex,
        size: normalizedSize,
      });

    } else {
      const existingItem = await storeCartRepository.findStoreCartItem(
        cart.id,       // ✅ BIGINT number
        productId,     // ✅ UUID string
        normalizedColorId,
        normalizedSize,
      );

      if (existingItem) {
        const newQuantity: number = replaceQuantity
          ? quantity
          : existingItem.quantity + quantity;

        await storeCartRepository.updateItemQuantity(
          existingItem.id,
          newQuantity
        );
      } else {
        await storeCartRepository.addItem({
          storeCartId: cart.id,  // ✅ BIGINT number
          productId,             // ✅ UUID string
          quantity,
          colorId: normalizedColorId,
          colorValue: normalizedColorValue,
          colorIndex: normalizedColorIndex,
          size: normalizedSize,
        });
      }
    }

    return await storeCartRepository.findByUserAndStore(
      userId,   // ✅ UUID string
      storeId   // ✅ UUID string
    );
  }

  // ─── GET CART ───

  async getStoreCart(
  userId: string,
  storeId: string
): Promise<GetCartResponse> {
  const cart = await storeCartRepository.findByUserAndStore(userId, storeId);

  if (!cart || cart.items.length === 0) {
    return {
      items: [],
      total: 0,
      totalSavings: 0,
      totalQuantity: 0,
    };
  }

  const productIds = [
    ...new Set(
      cart.items
        .map((item) => item.productId)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const products = await storeCartRepository.findProductsByIdsAndStore(
    productIds,
    storeId
  );

  const productMap = new Map(products.map((p) => [p.id, p]));

  const items = cart.items.map((item) => {
    const product = productMap.get(item.productId as string);

    const productPrice = Number(product?.productPrice ?? 0);
    const finalPrice = Number(product?.finalPrice ?? productPrice);
    const productDiscount = Number(product?.productDiscount ?? 0);
    const stock = Number(product?.stock ?? 0);

    return {
      _id :item.id,
      productId: item.productId as string,
      productName: product?.productName ?? null,
      productImages: product?.productImages ?? [],
      productPrice,
      finalPrice,
      productDiscount,
      stock,
      category: product?.category ?? null,
      quantity: item.quantity,
      color:
        item.colorId !== null
          ? {
              _id: item.colorId,
              color: item.colorValue ?? null,
              index: item.colorIndex ?? null,
            }
          : null,
      size: item.size ?? null,
    };
  });

  const total = items.reduce((sum, item) => {
    const price = item.finalPrice ?? item.productPrice ?? 0;
    return sum + price * item.quantity;
  }, 0);

  const totalSavings = items.reduce((sum, item) => {
    const original = item.productPrice ?? 0;
    const discounted = item.finalPrice ?? original;
    return sum + (original - discounted) * item.quantity;
  }, 0);

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    total,
    totalSavings,
    totalQuantity,
  };
}

  
  // ─── REMOVE FROM CART ───
  async removeFromStoreCart(input: RemoveFromStoreCartInput) {
    const { userId, storeId, productId, color, size } = input;

    const cart = await storeCartRepository.findByUserAndStore(
      userId,    // ✅ UUID string
      storeId    // ✅ UUID string
    );

    if (!cart) {
      throw new ApiError(404, "Cart not found");
    }

    const hasColorOrSize: boolean = !!(color?._id || size);

    if (hasColorOrSize) {
      const normalizedColorId: number | null = color?._id ?? null;
      const normalizedSize: string | null = size ?? null;

      const existingItem = await storeCartRepository.findStoreCartItem(
        cart.id,       // ✅ BIGINT number
        productId,     // ✅ UUID string
        normalizedColorId,
        normalizedSize,
      );

      if (!existingItem) {
        throw new ApiError(
          404,
          "Product with this color and size not found in cart"
        );
      }

      await storeCartRepository.removeItem(existingItem.id);

    } else {
      // ✅ Compare UUID strings
      const matchedItems: StoreCartItem[] = cart.items.filter(
        (item: StoreCartItem): boolean => item.productId === productId,
      );

      if (matchedItems.length === 0) {
        throw new ApiError(404, "Product not found in cart");
      }

      await storeCartRepository.removeByProduct(
        cart.id,     // ✅ BIGINT number
        productId    // ✅ UUID string
      );
    }

    return await storeCartRepository.findByUserAndStore(
      userId,    // ✅ UUID string
      storeId    // ✅ UUID string
    );
  }

  // ─── CLEAR CART ───
  async clearStoreCart(
    userId: string,    // ✅ UUID string
    storeId: string    // ✅ UUID string
  ): Promise<null> {
    const cart = await storeCartRepository.findByUserAndStore(userId, storeId);

    if (!cart) {
      throw new ApiError(404, "Cart not found for this store");
    }

    await storeCartRepository.deleteByUserAndStore(userId, storeId);
    return null;
  }
}

export const storeCartService = new StoreCartService();