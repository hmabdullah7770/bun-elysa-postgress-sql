// src/repository/store/store_product.repository.ts
import { db } from "../../db";
import {
  store_product,
  type NewStoreProduct,
  type StoreProduct
} from "../../schemas/store/store_product.schema";
// import { eq, and, desc, asc, ilike } from "drizzle-orm";
import { ApiError } from "../../utils/ApiError";
import { eq, and, desc, asc, ilike, sql } from "drizzle-orm";

class StoreProductRepository {

  // ✅ Find product by ID
  async findById(productId: string) {
    const [product] = await db
      .select()
      .from(store_product)
      .where(eq(store_product.id, productId))
      .limit(1);
    return product || null;
  }


  // ✅ Increment ordersalltime counter
async incrementOrdersAllTime(productId: string): Promise<void> {
  await db
    .update(store_product)
    .set({
      ordersAllTime: sql`${store_product.ordersAllTime} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(store_product.id, productId));
}


  // ✅ Find product by name in store
  async findByName(storeId: string, productName: string) {
    const [product] = await db
      .select()
      .from(store_product)
      .where(
        and(
          eq(store_product.storeId, storeId),
          eq(store_product.productName, productName)
        )
      )
      .limit(1);
    return product || null;
  }

  // ✅ Get all products for store
  async findByStoreId(
    storeId: string,
    options: {
      page?: number;
      limit?: number;
      category?: string;
      sort?: string;
    } = {}
  ) {
    const {
      page = 1,
      limit = 10,
      category,
      sort = "createdAt:desc"
    } = options;

    const offset = (page - 1) * limit;
    const [sortField, sortOrder] = sort.split(":");

    // ✅ Build query
    let query = db
      .select({
        _id: store_product.id,
        storeId: store_product.storeId,
        productName: store_product.productName,
        productPrice: store_product.productPrice,
        productDiscount: store_product.productDiscount,
        finalPrice: store_product.finalPrice,
        productImages: store_product.productImages,
        productColors: store_product.productColors,
        category: store_product.category,
        stock: store_product.stock,
        tags: store_product.tags,
        createdAt: store_product.createdAt,
      })
      .from(store_product)
      .where(
        category
          ? and(
              eq(store_product.storeId, storeId),
              eq(store_product.category, category)
            )
          : eq(store_product.storeId, storeId)
      )
      .limit(limit)
      .offset(offset);

    return await query;
  }

  // ✅ Create product
  async create(data: NewStoreProduct) {
    const [product] = await db
      .insert(store_product)
      .values(data)
      .returning();
    return product;
  }

  // ✅ Update product
  async update(
    productId: string,
    data: Partial<NewStoreProduct>
  ) {
    const [updated] = await db
      .update(store_product)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(store_product.id, productId))
      .returning();
    return updated || null;
  }

  // ✅ Delete product
  async delete(productId: string) {
    const [deleted] = await db
      .delete(store_product)
      .where(eq(store_product.id, productId))
      .returning();
    return deleted || null;
  }

  // ✅ Remove specific image from product
  async removeImage(productId: string, imageUrl: string) {
    // Get current images
    const product = await this.findById(productId);
    if (!product) throw new ApiError(404, "Product not found");

    // Filter out the image
    const updatedImages = (product.productImages as string[])
      .filter(url => url !== imageUrl);

    if (updatedImages.length === 0)
      throw new ApiError(400, "Product must have at least one image");

    const [updated] = await db
      .update(store_product)
      .set({
        productImages: updatedImages,
        updatedAt: new Date()
      })
      .where(eq(store_product.id, productId))
      .returning();

    return updated;
  }
}

export const storeProductRepository = new StoreProductRepository();