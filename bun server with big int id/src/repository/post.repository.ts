import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  bids,
  comments,
  createStore,
  followLists,
  post_counters,
  posts,
  ratings,
  store_product,
  users,
  type NewPost,
} from "../schemas";

type SortBy = "createdAt" | "averageRating" | "totalViews" | "inCategoryId";
type SortType = "asc" | "desc";
type Direction = "older" | "newer";

export class PostRepository {
  async generatePostIds(category?: string | null) {
    const categoryName = category && category.trim() ? category.trim() : "All";
    const globalKey = "post_counter";
    const categoryKey = `category_counter_${categoryName}`;

    return db.transaction(async (tx) => {
      const [globalRow] = await tx
        .insert(post_counters)
        .values({ key: globalKey, seq: 1n } as any)
        .onConflictDoUpdate({
          target: post_counters.key,
          set: { seq: sql`${post_counters.seq} + 1` },
        })
        .returning({ seq: post_counters.seq });

      const [categoryRow] = await tx
        .insert(post_counters)
        .values({ key: categoryKey, seq: 1n } as any)
        .onConflictDoUpdate({
          target: post_counters.key,
          set: { seq: sql`${post_counters.seq} + 1` },
        })
        .returning({ seq: post_counters.seq });

      const globalSeq = Number(globalRow?.seq ?? 0n);
      const categorySeq = Number(categoryRow?.seq ?? 0n);

      const postIdUnique = `${categoryName}${String(globalSeq).padStart(10, "0")}`;
      const inCategoryId = `${categoryName}${categorySeq}`;

      return { categoryName, postIdUnique, inCategoryId };
    });
  }

  async create(data: NewPost) {
    const [row] = await db.insert(posts).values(data).returning();
    return row ?? null;
  }

  // Ã¢Å“â€¦ postId comes as string from URL Ã¢â‚¬â€ convert to number for DB
  async findById(postId: string) {
    const [row] = await db
      .select()
      .from(posts)
      .where(eq(posts._id, Number(postId))) // Ã¢Å“â€¦ convert
      .limit(1);
    return row ?? null;
  }

  async findPublishedByIdWithOwner(postId: string) {
    const [row] = await db
      .select({
        post: posts,
        owner: {
          _id: users._id,
          username: users.username,
          fullName: users.fullName,
          avatar: users.avatar,
          email: users.email,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.owner, users._id))
      .where(
        and(
          eq(posts._id, Number(postId)), // Ã¢Å“â€¦ convert
          eq(posts.isPublished, true)
        )
      )
      .limit(1);
    return row ?? null;
  }

  async findPublishedByIdsWithOwner(postIds: number[]) {
    if (postIds.length === 0) return [];

    return db
      .select({
        post: posts,
        owner: {
          _id: users._id,
          username: users.username,
          fullName: users.fullName,
          avatar: users.avatar,
          email: users.email,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.owner, users._id))
      .where(and(inArray(posts._id, postIds), eq(posts.isPublished, true)));
  }

  async findByIdWithOwner(postId: string) {
    const [row] = await db
      .select({
        post: posts,
        owner: {
          _id: users._id,
          username: users.username,
          fullName: users.fullName,
          avatar: users.avatar,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.owner, users._id))
      .where(eq(posts._id, Number(postId)))
      .limit(1);
    return row ?? null;
  }

  async findByIdWithOwnerAndCatalog(postId: string) {
    const row = await this.findByIdWithOwner(postId);
    if (!row) return null;

    const storeIds = (row.post.store ?? [])
      .map((item) => item.storeId)
      .filter((id): id is string => Boolean(id));
    const productIds = (row.post.product ?? [])
      .map((item) => item.ProductId)
      .filter((id): id is number => typeof id === "number");
    const [storeRows, productRows] = await Promise.all([
      storeIds.length
        ? db.select().from(createStore).where(inArray(createStore._id, storeIds))
        : Promise.resolve([]),
      productIds.length
        ? db.select().from(store_product).where(inArray(store_product._id, productIds))
        : Promise.resolve([]),
    ]);
    const storesById = new Map(storeRows.map((store) => [store._id, store]));
    const productsById = new Map(productRows.map((product) => [product._id, product]));

    return {
      ...row,
      post: {
        ...row.post,
        store: (row.post.store ?? []).map((item) => ({
          ...item,
          storeId: item.storeId ? storesById.get(item.storeId) ?? null : null,
        })),
        product: (row.post.product ?? []).map((item) => ({
          ...item,
          ProductId:
            item.ProductId !== undefined
              ? productsById.get(item.ProductId) ?? null
              : null,
        })),
      },
    };
  }

  async getUserPostEnrichment(
    postIds: number[],
    ownerIds: string[],
    userId: string,
    includeComments: "none" | "counts" | "details"
  ) {
    if (postIds.length === 0) {
      return { following: [], followers: [], bids: [], ratings: [], comments: [] };
    }

    const [following, followers, userBids, userRatings, userComments] =
      await Promise.all([
        ownerIds.length
          ? db
              .select({ followingId: followLists.followingId })
              .from(followLists)
              .where(
                and(
                  eq(followLists.followerId, userId),
                  inArray(followLists.followingId, ownerIds)
                )
              )
          : Promise.resolve([]),
        ownerIds.length
          ? db
              .select({ followerId: followLists.followerId })
              .from(followLists)
              .where(
                and(
                  inArray(followLists.followerId, ownerIds),
                  eq(followLists.followingId, userId)
                )
              )
          : Promise.resolve([]),
        db
          .select({ postId: bids.postId, bidAmount: bids.bidAmount })
          .from(bids)
          .where(and(inArray(bids.postId, postIds), eq(bids.userId, userId))),
        db
          .select({ postId: ratings.postId, rating: ratings.rating })
          .from(ratings)
          .where(and(inArray(ratings.postId, postIds), eq(ratings.owner, userId))),
        includeComments === "none"
          ? Promise.resolve([])
          : db
              .select({
                _id: comments._id,
                postId: comments.postId,
                content: comments.content,
                audioUrl: comments.audioUrl,
                videoUrl: comments.videoUrl,
                stickerUrl: comments.stickerUrl,
                createdAt: comments.createdAt,
              })
              .from(comments)
              .where(
                and(
                  inArray(comments.postId, postIds),
                  eq(comments.owner, userId),
                  eq(comments.isReply, false)
                )
              )
              .orderBy(desc(comments.createdAt)),
      ]);

    return { following, followers, bids: userBids, ratings: userRatings, comments: userComments };
  }

  async getStoreIdsForOwners(ownerIds: string[]) {
    if (ownerIds.length === 0) return [];
    return db
      .select({ _id: createStore._id, ownerId: createStore.ownerId })
      .from(createStore)
      .where(inArray(createStore.ownerId, ownerIds));
  }

  async findCursorByInCategoryId(inCategoryId: string) {
    const [row] = await db
      .select({
        createdAt: posts.createdAt,
        averageRating: posts.averageRating,
        totalViews: posts.totalViews,
        inCategoryId: posts.inCategoryId,
      })
      .from(posts)
      .where(eq(posts.inCategoryId, inCategoryId))
      .limit(1);
    return row ?? null;
  }

  async updateById(postId: string, patch: Partial<NewPost>) {
    const [row] = await db
      .update(posts)
      .set({ ...(patch as any), updatedAt: new Date() })
      .where(eq(posts._id, Number(postId))) // Ã¢Å“â€¦ convert
      .returning();
    return row ?? null;
  }

  async deleteById(postId: string) {
    const [row] = await db
      .delete(posts)
      .where(eq(posts._id, Number(postId))) // Ã¢Å“â€¦ convert
      .returning();
    return row ?? null;
  }

  async incrementViews(postId: string) {
    const [row] = await db
      .update(posts)
      .set({
        views: sql`${posts.views} + 1`,
        totalViews: sql`${posts.totalViews} + 1`,
        updatedAt: new Date(),
      } as any)
      .where(eq(posts._id, Number(postId))) // Ã¢Å“â€¦ convert
      .returning();
    return row ?? null;
  }

  async list(params: {
    limit: number;
    cursor?: string | null;
    query?: string | null;
    category?: string | null;
    sortBy?: SortBy | null;
    sortType?: SortType | null;
    direction?: Direction | null;
    userIdFilter?: string | null;
    userIdsFilter?: string[];
    videosOnly?: boolean;
    imagesOnly?: boolean;
    isOwnerRequest?: boolean;
    includeCount?: boolean;
    page?: number;
    postIdsFilter?: number[];
  }) {
    const limitNumber = Math.min(Math.max(params.limit || 20, 1), 100);

    const finalSortBy: SortBy = (params.sortBy as any) || "createdAt";
    const finalSortType: SortType = params.sortType === "asc" ? "asc" : "desc";
    const scrollDirection: Direction = params.direction === "newer" ? "newer" : "older";

    const whereParts: any[] = [];

    if (params.query && params.query.trim()) {
      const q = `%${params.query.trim()}%`;
      whereParts.push(or(ilike(posts.title, q), ilike(posts.description, q)));
    }

    const category = params.category?.trim();
    if (category && category !== "All") {
      whereParts.push(eq(posts.category, category));
    }

    if (params.userIdFilter) {
      whereParts.push(eq(posts.owner, params.userIdFilter));
      if (!params.isOwnerRequest) {
        whereParts.push(eq(posts.isPublished, true));
      }
    } else {
      whereParts.push(eq(posts.isPublished, true));
    }

    if (params.userIdsFilter) {
      whereParts.push(
        params.userIdsFilter.length
          ? inArray(posts.owner, params.userIdsFilter)
          : sql`false`
      );
    }

    if (params.videosOnly) whereParts.push(sql`${posts.videocount} > 0`);
    if (params.imagesOnly) {
      whereParts.push(sql`${posts.imagecount} > 0 and ${posts.videocount} = 0`);
    }

    if (params.postIdsFilter) {
      whereParts.push(
        params.postIdsFilter.length
          ? inArray(posts._id, params.postIdsFilter)
          : sql`false`
      );
    }

    const countWhereParts = [...whereParts];

    // Ã¢Å“â€¦ Fixed cursor parsing
    let cursorSortValue: string | null = null;
    let cursorInCategoryId: string | null = null;
    if (params.cursor) {
      const parts = String(params.cursor).split("_");
      if (parts.length === 2) {
        cursorSortValue = parts[0] ?? null;      // Ã¢Å“â€¦
        cursorInCategoryId = parts[1] ?? null;   // Ã¢Å“â€¦
      }
    }

    const addCursorCondition = () => {
      if (!cursorSortValue || !cursorInCategoryId) return;

      const wantNewer = scrollDirection === "newer";

      if (finalSortBy === "createdAt") {
        const cursorDate = new Date(cursorSortValue);
        if (Number.isNaN(cursorDate.getTime())) return;

        const sign =
          (finalSortType === "desc" && !wantNewer) || (finalSortType === "asc" && wantNewer)
            ? "older"
            : "newer";

        if (sign === "older") {
          whereParts.push(
            or(
              sql`${posts.createdAt} < ${cursorDate}`,
              and(
                sql`${posts.createdAt} = ${cursorDate}`,
                sql`${posts.inCategoryId} < ${cursorInCategoryId}`
              )
            )
          );
        } else {
          whereParts.push(
            or(
              sql`${posts.createdAt} > ${cursorDate}`,
              and(
                sql`${posts.createdAt} = ${cursorDate}`,
                sql`${posts.inCategoryId} > ${cursorInCategoryId}`
              )
            )
          );
        }
      } else if (finalSortBy === "averageRating" || finalSortBy === "totalViews") {
        const cursorNum = Number(cursorSortValue);
        if (!Number.isFinite(cursorNum)) return;

        const col = finalSortBy === "averageRating" ? posts.averageRating : posts.totalViews;
        const sign =
          (finalSortType === "desc" && !wantNewer) || (finalSortType === "asc" && wantNewer)
            ? "older"
            : "newer";

        if (sign === "older") {
          whereParts.push(
            or(
              sql`${col} < ${cursorNum}`,
              and(
                sql`${col} = ${cursorNum}`,
                sql`${posts.inCategoryId} < ${cursorInCategoryId}`
              )
            )
          );
        } else {
          whereParts.push(
            or(
              sql`${col} > ${cursorNum}`,
              and(
                sql`${col} = ${cursorNum}`,
                sql`${posts.inCategoryId} > ${cursorInCategoryId}`
              )
            )
          );
        }
      } else {
        const sign =
          (finalSortType === "desc" && !wantNewer) || (finalSortType === "asc" && wantNewer)
            ? "older"
            : "newer";
        whereParts.push(
          sign === "older"
            ? sql`${posts.inCategoryId} < ${cursorInCategoryId}`
            : sql`${posts.inCategoryId} > ${cursorInCategoryId}`
        );
      }
    };

    addCursorCondition();

    let multiplier = finalSortType === "desc" ? "desc" : "asc";
    if (scrollDirection === "newer") {
      multiplier = multiplier === "desc" ? "asc" : "desc";
    }

    const order = (col: any) => (multiplier === "desc" ? desc(col) : asc(col));

    const orderBys: any[] = [];
    if (finalSortBy === "createdAt") {
      orderBys.push(order(posts.createdAt));
      orderBys.push(order(posts.inCategoryId));
    } else if (finalSortBy === "averageRating") {
      orderBys.push(order(posts.averageRating));
      orderBys.push(order(posts.inCategoryId));
    } else if (finalSortBy === "totalViews") {
      orderBys.push(order(posts.totalViews));
      orderBys.push(order(posts.inCategoryId));
    } else {
      orderBys.push(order(posts.inCategoryId));
    }

    const [rows, totalCount] = await Promise.all([
      db
        .select({
          post: posts,
          owner: {
            _id: users._id,
            username: users.username,
            fullName: users.fullName,
            avatar: users.avatar,
            email: users.email,
          },
        })
        .from(posts)
        .leftJoin(users, eq(posts.owner, users._id))
        .where(whereParts.length ? and(...whereParts) : undefined)
        .orderBy(...orderBys)
        .offset(params.page ? (params.page - 1) * limitNumber : 0)
        .limit(limitNumber + 1),
      params.includeCount
        ? db
            .select({ totalCount: count() })
            .from(posts)
            .where(countWhereParts.length ? and(...countWhereParts) : undefined)
            .then(([row]) => row?.totalCount ?? 0)
        : Promise.resolve(null),
    ]);

    return {
      rows,
      totalCount,
      limit: limitNumber,
      sortBy: finalSortBy,
      sortType: finalSortType,
      direction: scrollDirection,
    };
  }
}

export const postRepository = new PostRepository();


// import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
// import { db } from "../db";
// import { post_counters, posts, users, type NewPost } from "../schemas";

// type SortBy = "createdAt" | "averageRating" | "totalViews" | "inCategoryId";
// type SortType = "asc" | "desc";
// type Direction = "older" | "newer";

// export class PostRepository {
//   async generatePostIds(category?: string | null) {
//     const categoryName = category && category.trim() ? category.trim() : "All";
//     const globalKey = "post_counter";
//     const categoryKey = `category_counter_${categoryName}`;

//     return db.transaction(async (tx) => {
//       const [globalRow] = await tx
//         .insert(post_counters)
//         .values({ key: globalKey, seq: 1n } as any)
//         .onConflictDoUpdate({
//           target: post_counters.key,
//           set: { seq: sql`${post_counters.seq} + 1` },
//         })
//         .returning({ seq: post_counters.seq });

//       const [categoryRow] = await tx
//         .insert(post_counters)
//         .values({ key: categoryKey, seq: 1n } as any)
//         .onConflictDoUpdate({
//           target: post_counters.key,
//           set: { seq: sql`${post_counters.seq} + 1` },
//         })
//         .returning({ seq: post_counters.seq });

//       const globalSeq = Number(globalRow?.seq ?? 0n);
//       const categorySeq = Number(categoryRow?.seq ?? 0n);

//       const postIdUnique = `${categoryName}${String(globalSeq).padStart(10, "0")}`;
//       const inCategoryId = `${categoryName}${categorySeq}`;

//       return { categoryName, postIdUnique, inCategoryId };
//     });
//   }

//   async create(data: NewPost) {
//     const [row] = await db.insert(posts).values(data).returning();
//     return row ?? null;
//   }

//   async findById(postId: string) {
//     const [row] = await db.select().from(posts).where(eq(posts._id, postId)).limit(1);
//     return row ?? null;
//   }

//   async findPublishedByIdWithOwner(postId: string) {
//     const [row] = await db
//       .select({
//         post: posts,
//         owner: {
//           _id: users._id,
//           username: users.username,
//           fullName: users.fullName,
//           avatar: users.avatar,
//           email: users.email,
//         },
//       })
//       .from(posts)
//       .leftJoin(users, eq(posts.owner, users._id))
//       .where(and(eq(posts._id, postId), eq(posts.isPublished, true)))
//       .limit(1);
//     return row ?? null;
//   }

//   async updateById(postId: string, patch: Partial<NewPost>) {
//     const [row] = await db
//       .update(posts)
//       .set({ ...(patch as any), updatedAt: new Date() })
//       .where(eq(posts._id, postId))
//       .returning();
//     return row ?? null;
//   }

//   async deleteById(postId: string) {
//     const [row] = await db.delete(posts).where(eq(posts._id, postId)).returning();
//     return row ?? null;
//   }

//   async incrementViews(postId: string) {
//     const [row] = await db
//       .update(posts)
//       .set({
//         views: sql`${posts.views} + 1`,
//         totalViews: sql`${posts.totalViews} + 1`,
//         updatedAt: new Date(),
//       } as any)
//       .where(eq(posts._id, postId))
//       .returning();
//     return row ?? null;
//   }

//   async list(params: {
//     limit: number;
//     cursor?: string | null;
//     query?: string | null;
//     category?: string | null;
//     sortBy?: SortBy | null;
//     sortType?: SortType | null;
//     direction?: Direction | null;
//     userIdFilter?: string | null; // owner filter
//     isOwnerRequest?: boolean; // if viewing user's posts as owner
//   }) {
//     const limitNumber = Math.min(Math.max(params.limit || 20, 1), 100);

//     const finalSortBy: SortBy = (params.sortBy as any) || "createdAt";
//     const finalSortType: SortType = params.sortType === "asc" ? "asc" : "desc";
//     const scrollDirection: Direction = params.direction === "newer" ? "newer" : "older";

//     const whereParts: any[] = [];

//     // Filters
//     if (params.query && params.query.trim()) {
//       const q = `%${params.query.trim()}%`;
//       whereParts.push(or(ilike(posts.title, q), ilike(posts.description, q)));
//     }

//     if (params.category && params.category.trim()) {
//       whereParts.push(eq(posts.category, params.category.trim()));
//     }

//     if (params.userIdFilter) {
//       whereParts.push(eq(posts.owner, params.userIdFilter));
//       if (!params.isOwnerRequest) {
//         whereParts.push(eq(posts.isPublished, true));
//       }
//     } else {
//       whereParts.push(eq(posts.isPublished, true));
//     }

//     // Cursor parsing: "sortValue_inCategoryId"
//     let cursorSortValue: string | null = null;
//     let cursorInCategoryId: string | null = null;
//     if (params.cursor) {
//       const parts = String(params.cursor).split("_");
//       if (parts.length === 2) {
//         cursorSortValue = parts[0];
//         cursorInCategoryId = parts[1];
//       }
//     }

//     // Cursor condition builder (matches your old Mongo logic)
//     const addCursorCondition = () => {
//       if (!cursorSortValue || !cursorInCategoryId) return;

//       // direction aware multiplier: in Mongo you inverted sort order; here we implement cursor predicate
//       const wantNewer = scrollDirection === "newer";

//       if (finalSortBy === "createdAt") {
//         const cursorDate = new Date(cursorSortValue);
//         if (Number.isNaN(cursorDate.getTime())) return;

//         // For desc sort:
//         // - older: createdAt < cursorDate OR (createdAt = cursorDate AND inCategoryId < cursorInCategoryId)
//         // - newer: createdAt > cursorDate OR (createdAt = cursorDate AND inCategoryId > cursorInCategoryId)
//         const sign =
//           (finalSortType === "desc" && !wantNewer) || (finalSortType === "asc" && wantNewer)
//             ? "older"
//             : "newer";

//         if (sign === "older") {
//           whereParts.push(
//             or(
//               sql`${posts.createdAt} < ${cursorDate}`,
//               and(sql`${posts.createdAt} = ${cursorDate}`, sql`${posts.inCategoryId} < ${cursorInCategoryId}`)
//             )
//           );
//         } else {
//           whereParts.push(
//             or(
//               sql`${posts.createdAt} > ${cursorDate}`,
//               and(sql`${posts.createdAt} = ${cursorDate}`, sql`${posts.inCategoryId} > ${cursorInCategoryId}`)
//             )
//           );
//         }
//       } else if (finalSortBy === "averageRating" || finalSortBy === "totalViews") {
//         const cursorNum = Number(cursorSortValue);
//         if (!Number.isFinite(cursorNum)) return;

//         const col = finalSortBy === "averageRating" ? posts.averageRating : posts.totalViews;
//         const sign =
//           (finalSortType === "desc" && !wantNewer) || (finalSortType === "asc" && wantNewer)
//             ? "older"
//             : "newer";

//         if (sign === "older") {
//           whereParts.push(
//             or(
//               sql`${col} < ${cursorNum}`,
//               and(sql`${col} = ${cursorNum}`, sql`${posts.inCategoryId} < ${cursorInCategoryId}`)
//             )
//           );
//         } else {
//           whereParts.push(
//             or(
//               sql`${col} > ${cursorNum}`,
//               and(sql`${col} = ${cursorNum}`, sql`${posts.inCategoryId} > ${cursorInCategoryId}`)
//             )
//           );
//         }
//       } else {
//         // inCategoryId direct
//         const sign =
//           (finalSortType === "desc" && !wantNewer) || (finalSortType === "asc" && wantNewer)
//             ? "older"
//             : "newer";
//         whereParts.push(
//           sign === "older"
//             ? sql`${posts.inCategoryId} < ${cursorInCategoryId}`
//             : sql`${posts.inCategoryId} > ${cursorInCategoryId}`
//         );
//       }
//     };

//     addCursorCondition();

//     // Sort order (direction-aware). When fetching "newer" we invert order then reverse in service.
//     let multiplier = finalSortType === "desc" ? "desc" : "asc";
//     if (scrollDirection === "newer") {
//       multiplier = multiplier === "desc" ? "asc" : "desc";
//     }

//     const order = (col: any) => (multiplier === "desc" ? desc(col) : asc(col));

//     const orderBys: any[] = [];
//     if (finalSortBy === "createdAt") {
//       orderBys.push(order(posts.createdAt));
//       orderBys.push(order(posts.inCategoryId));
//     } else if (finalSortBy === "averageRating") {
//       orderBys.push(order(posts.averageRating));
//       orderBys.push(order(posts.inCategoryId));
//     } else if (finalSortBy === "totalViews") {
//       orderBys.push(order(posts.totalViews));
//       orderBys.push(order(posts.inCategoryId));
//     } else {
//       orderBys.push(order(posts.inCategoryId));
//     }

//     const rows = await db
//       .select({
//         post: posts,
//         owner: {
//           _id: users._id,
//           username: users.username,
//           fullName: users.fullName,
//           avatar: users.avatar,
//           email: users.email,
//         },
//       })
//       .from(posts)
//       .leftJoin(users, eq(posts.owner, users._id))
//       .where(whereParts.length ? and(...whereParts) : undefined)
//       .orderBy(...orderBys)
//       .limit(limitNumber + 1);

//     return {
//       rows,
//       limit: limitNumber,
//       sortBy: finalSortBy,
//       sortType: finalSortType,
//       direction: scrollDirection,
//     };
//   }
// }

// export const postRepository = new PostRepository();
