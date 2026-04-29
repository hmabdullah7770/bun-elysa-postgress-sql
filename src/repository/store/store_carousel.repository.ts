
// JSONB


// src/repository/store/store_carousel.repository.ts
import { db } from "../../db";
import { store_carousel, type CarouselItem } from "../../schemas/store/store_carousel.schema";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { ApiError } from "../../utils/ApiError";

class StoreCarouselRepository {

  // Ã¢Å“â€¦ Find by storeId - 1 DB call!
  async findByStoreId(storeId: string) {
    const [doc] = await db
      .select()
      .from(store_carousel)
      .where(eq(store_carousel.storeId, storeId))
      .limit(1);
    return doc || null;
  }

  // Ã¢Å“â€¦ Upsert
  async upsertByStoreId(storeId: string) {
    const existing = await db
      .select()
      .from(store_carousel)
      .where(eq(store_carousel.storeId, storeId))
      .limit(1);

    if (existing[0]) return existing[0];

    const [created] = await db
      .insert(store_carousel)
      .values({ storeId, carousels: [] })
      .returning();

    return created;
  }

  // Ã¢Å“â€¦ Create carousel items
  async createCarouselItems(
    storeId: string,
    newItems: Omit<CarouselItem, "id" | "createdAt" | "updatedAt">[]
  ) {
    const now = new Date().toISOString();

    const itemsWithId: CarouselItem[] = newItems.map(item => ({
      ...item,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    }));

    const [updated] = await db
      .update(store_carousel)
      .set({
        carousels: sql`carousels || ${JSON.stringify(itemsWithId)}::jsonb`,
        updatedAt: new Date(),
      })
      .where(eq(store_carousel.storeId, storeId))
      .returning();

    return itemsWithId;
  }

  // Ã¢Å“â€¦ Update single carousel item by id
  async updateCarouselItem(
    storeId: string,
    carouselId: string,
    updates: Partial<Omit<CarouselItem, "id" | "createdAt">>
  ) {
    // Ã¢Å“â€¦ Check store exists first
    const existing = await db
      .select()
      .from(store_carousel)
      .where(eq(store_carousel.storeId, storeId))
      .limit(1);

    if (!existing[0]) throw new ApiError(404, "Store carousel not found");

    // Ã¢Å“â€¦ Check item exists
    const carousels = existing[0].carousels as CarouselItem[];
    const itemExists = carousels.find(c => c._id === carouselId);
    if (!itemExists) throw new ApiError(404, "Carousel item not found");

    // Ã¢Å“â€¦ Update specific item in JSONB array
    const updatePayload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const [updated] = await db
      .update(store_carousel)
      .set({
        carousels: sql`(
          SELECT jsonb_agg(
            CASE
              WHEN item->>'id' = ${carouselId}
              THEN item || ${JSON.stringify(updatePayload)}::jsonb
              ELSE item
            END
          )
          FROM jsonb_array_elements(carousels) item
        )`,
        updatedAt: new Date(),
      })
      .where(eq(store_carousel.storeId, storeId))
      .returning();

    // Ã¢Å“â€¦ Return updated item only
    if (!updated) throw new ApiError(500, "Failed to update carousel");
    const updatedCarousels = updated.carousels as CarouselItem[];
    return updatedCarousels.find(c => c._id === carouselId);
  }

  // Ã¢Å“â€¦ Delete single carousel item
  async deleteCarouselItem(storeId: string, carouselId: string) {
    // Ã¢Å“â€¦ Check exists first
    const existing = await db
      .select()
      .from(store_carousel)
      .where(eq(store_carousel.storeId, storeId))
      .limit(1);

    if (!existing[0]) throw new ApiError(404, "Store carousel not found");

    const carousels = existing[0].carousels as CarouselItem[];
    const itemExists = carousels.find(c => c._id === carouselId);
    if (!itemExists) throw new ApiError(404, "Carousel item not found");

    // Ã¢Å“â€¦ Remove item from array
    const [updated] = await db
      .update(store_carousel)
      .set({
        carousels: sql`(
          SELECT jsonb_agg(item)
          FROM jsonb_array_elements(carousels) item
          WHERE item->>'id' != ${carouselId}
        )`,
        updatedAt: new Date(),
      })
      .where(eq(store_carousel.storeId, storeId))
      .returning();

    return updated;
  }

  // Ã¢Å“â€¦ Get single carousel item
  async findCarouselItemById(storeId: string, carouselId: string) {
    const [doc] = await db
      .select()
      .from(store_carousel)
      .where(eq(store_carousel.storeId, storeId))
      .limit(1);

    if (!doc) throw new ApiError(404, "Store carousel not found");

    const carousels = doc.carousels as CarouselItem[];
    const item = carousels.find(c => c._id === carouselId);
    if (!item) throw new ApiError(404, "Carousel item not found");

    return item;
  }
}

export const storeCarouselRepository = new StoreCarouselRepository();



// with normalized tables

// src/repository/store_carousel.repository.ts
// import { db } from "../../db/index";
// import { store_carousel, carousel_items } from "../../schemas/store/store_carousel.schema";
// import { eq } from "drizzle-orm";

// class StoreCarouselRepository {

//   // Upsert store_carousel doc Ã¢â‚¬â€ same as MongoDB findOneAndUpdate with upsert:true
//   async upsertByStoreId(storeId: string) {
    
//       console.log("upsertByStoreId called with storeId:", storeId);
//   console.log("storeId type:", typeof storeId);
    
//     const existing = await db
//       .select()
//       .from(store_carousel)
//       .where(eq(store_carousel.storeId, storeId))
//       .limit(1);

//     if (existing[0]) return existing[0];

//     const created = await db
//       .insert(store_carousel)
//       .values({ storeId })
//       .returning();

//     return created[0];
//   }

//   async findByStoreId(storeId: string) {
//     const doc = await db
//       .select()
//       .from(store_carousel)
//       .where(eq(store_carousel.storeId, storeId))
//       .limit(1);

//     if (!doc[0]) return null;

//     const carousels = await db
//       .select()
//       .from(carousel_items)
//       .where(eq(carousel_items.storeCarouselId, doc[0].id));

//     return { ...doc[0], carousels };
//   }

//   async createCarouselItems(storeCarouselId: string, items: any[]) {
//     return await db
//       .insert(carousel_items)
//       .values(items.map(item => ({ ...item, storeCarouselId })))
//       .returning();
//   }

//   async findCarouselItem(storeId: string, carouselId: string) {
//     const doc = await db
//       .select()
//       .from(store_carousel)
//       .where(eq(store_carousel.storeId, storeId))
//       .limit(1);

//     if (!doc[0]) return null;

//     const item = await db
//       .select()
//       .from(carousel_items)
//       .where(eq(carousel_items._id, carouselId))
//       .limit(1);

//     return item[0] || null;
//   }

//   async updateCarouselItem(carouselId: string, fields: Partial<typeof carousel_items.$inferInsert>) {
//     const updated = await db
//       .update(carousel_items)
//       .set({ ...fields, updatedAt: new Date() })
//       .where(eq(carousel_items._id, carouselId))
//       .returning();

//     return updated[0];
//   }

//   async deleteCarouselItem(carouselId: string) {
//     return await db
//       .delete(carousel_items)
//       .where(eq(carousel_items._id, carouselId));
//   }
// }

// export const storeCarouselRepository = new StoreCarouselRepository();



