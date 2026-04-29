// src/services/store_cart.service.ts
import { storeCartRepository } from "../../repository/store/store_cart.repository";
import { ApiError } from "../../utils/ApiError";
import type { StoreCartItem } from "../../schemas/store/store_cart.schema";

// â”€â”€â”€ Input Interfaces â”€â”€â”€
interface AddToStoreCartInput {
  userId: string;      // âœ… string (UUID)
  storeId: string;     // âœ… string (UUID)
  productId: string;   // âœ… string (UUID)
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
  userId: string;      // âœ… string (UUID)
  storeId: string;     // âœ… string (UUID)
  productId: string;   // âœ… string (UUID)
  color: {
    _id: number | null;
  } | null;
  size: string | null;
}

// â”€â”€â”€ Response Interfaces â”€â”€â”€
interface CartItemResponse {
  productId: string;   // âœ… string (UUID)
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

  // â”€â”€â”€ ADD TO CART â”€â”€â”€
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

    // â”€â”€â”€ Find or Create Cart â”€â”€â”€
    let cart = await storeCartRepository.findByUserAndStore(
      userId,    // âœ… UUID string
      storeId    // âœ… UUID string
    );

    if (!cart) {
      // âœ… Create new cart with UUID strings
      const newCart = await storeCartRepository.create({
        userId,   // âœ… UUID string
        storeId   // âœ… UUID string
      });

      if (!newCart) {
        throw new ApiError(500, "Failed to create cart");
      }

      // âœ… Add first item
      await storeCartRepository.addItem({
        storeCartId: newCart._id,   // âœ… BIGINT number
        productId,                 // âœ… UUID string
        quantity,
        colorId: normalizedColorId,
        colorValue: normalizedColorValue,
        colorIndex: normalizedColorIndex,
        size: normalizedSize,
      });

    } else {
      const existingItem = await storeCartRepository.findStoreCartItem(
        cart._id,       // âœ… BIGINT number
        productId,     // âœ… UUID string
        normalizedColorId,
        normalizedSize,
      );

      if (existingItem) {
        const newQuantity: number = replaceQuantity
          ? quantity
          : existingItem.quantity + quantity;

        await storeCartRepository.updateItemQuantity(
          existingItem._id,
          newQuantity
        );
      } else {
        await storeCartRepository.addItem({
          storeCartId: cart._id,  // âœ… BIGINT number
          productId,             // âœ… UUID string
          quantity,
          colorId: normalizedColorId,
          colorValue: normalizedColorValue,
          colorIndex: normalizedColorIndex,
          size: normalizedSize,
        });
      }
    }

    return await storeCartRepository.findByUserAndStore(
      userId,   // âœ… UUID string
      storeId   // âœ… UUID string
    );
  }

  // â”€â”€â”€ GET CART â”€â”€â”€

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

  const productMap = new Map(products.map((p) => [p._id, p]));

  const items = cart.items.map((item) => {
    const product = productMap.get(item.productId as string);

    const productPrice = Number(product?.productPrice ?? 0);
    const finalPrice = Number(product?.finalPrice ?? productPrice);
    const productDiscount = Number(product?.productDiscount ?? 0);
    const stock = Number(product?.stock ?? 0);

    return {
      _id :item._id,
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

  
  // â”€â”€â”€ REMOVE FROM CART â”€â”€â”€
  async removeFromStoreCart(input: RemoveFromStoreCartInput) {
    const { userId, storeId, productId, color, size } = input;

    const cart = await storeCartRepository.findByUserAndStore(
      userId,    // âœ… UUID string
      storeId    // âœ… UUID string
    );

    if (!cart) {
      throw new ApiError(404, "Cart not found");
    }

    const hasColorOrSize: boolean = !!(color?._id || size);

    if (hasColorOrSize) {
      const normalizedColorId: number | null = color?._id ?? null;
      const normalizedSize: string | null = size ?? null;

      const existingItem = await storeCartRepository.findStoreCartItem(
        cart._id,       // âœ… BIGINT number
        productId,     // âœ… UUID string
        normalizedColorId,
        normalizedSize,
      );

      if (!existingItem) {
        throw new ApiError(
          404,
          "Product with this color and size not found in cart"
        );
      }

      await storeCartRepository.removeItem(existingItem._id);

    } else {
      // âœ… Compare UUID strings
      const matchedItems: StoreCartItem[] = cart.items.filter(
        (item: StoreCartItem): boolean => item.productId === productId,
      );

      if (matchedItems.length === 0) {
        throw new ApiError(404, "Product not found in cart");
      }

      await storeCartRepository.removeByProduct(
        cart._id,     // âœ… BIGINT number
        productId    // âœ… UUID string
      );
    }

    return await storeCartRepository.findByUserAndStore(
      userId,    // âœ… UUID string
      storeId    // âœ… UUID string
    );
  }

  // â”€â”€â”€ CLEAR CART â”€â”€â”€
  async clearStoreCart(
    userId: string,    // âœ… UUID string
    storeId: string    // âœ… UUID string
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