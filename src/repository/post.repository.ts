import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../db";
import { post_counters, posts, users, type NewPost } from "../schemas";

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

  async findById(postId: string) {
    const [row] = await db.select().from(posts).where(eq(posts._id, postId)).limit(1);
    return row ?? null;
  }

  async findPublishedByIdWithOwner(postId: string) {
    const [row] = await db
      .select({
        post: posts,
        owner: {
          _id: users.id,
          username: users.username,
          fullName: users.fullName,
          avatar: users.avatar,
          email: users.email,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.owner, users.id))
      .where(and(eq(posts._id, postId), eq(posts.isPublished, true)))
      .limit(1);
    return row ?? null;
  }

  async updateById(postId: string, patch: Partial<NewPost>) {
    const [row] = await db
      .update(posts)
      .set({ ...(patch as any), updatedAt: new Date() })
      .where(eq(posts._id, postId))
      .returning();
    return row ?? null;
  }

  async deleteById(postId: string) {
    const [row] = await db.delete(posts).where(eq(posts._id, postId)).returning();
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
      .where(eq(posts._id, postId))
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
    userIdFilter?: string | null; // owner filter
    isOwnerRequest?: boolean; // if viewing user's posts as owner
  }) {
    const limitNumber = Math.min(Math.max(params.limit || 20, 1), 100);

    const finalSortBy: SortBy = (params.sortBy as any) || "createdAt";
    const finalSortType: SortType = params.sortType === "asc" ? "asc" : "desc";
    const scrollDirection: Direction = params.direction === "newer" ? "newer" : "older";

    const whereParts: any[] = [];

    // Filters
    if (params.query && params.query.trim()) {
      const q = `%${params.query.trim()}%`;
      whereParts.push(or(ilike(posts.title, q), ilike(posts.description, q)));
    }

    if (params.category && params.category.trim()) {
      whereParts.push(eq(posts.category, params.category.trim()));
    }

    if (params.userIdFilter) {
      whereParts.push(eq(posts.owner, params.userIdFilter));
      if (!params.isOwnerRequest) {
        whereParts.push(eq(posts.isPublished, true));
      }
    } else {
      whereParts.push(eq(posts.isPublished, true));
    }

    // Cursor parsing: "sortValue_inCategoryId"
    let cursorSortValue: string | null = null;
    let cursorInCategoryId: string | null = null;
    if (params.cursor) {
      const parts = String(params.cursor).split("_");
      if (parts.length === 2) {
        cursorSortValue = parts[0];
        cursorInCategoryId = parts[1];
      }
    }

    // Cursor condition builder (matches your old Mongo logic)
    const addCursorCondition = () => {
      if (!cursorSortValue || !cursorInCategoryId) return;

      // direction aware multiplier: in Mongo you inverted sort order; here we implement cursor predicate
      const wantNewer = scrollDirection === "newer";

      if (finalSortBy === "createdAt") {
        const cursorDate = new Date(cursorSortValue);
        if (Number.isNaN(cursorDate.getTime())) return;

        // For desc sort:
        // - older: createdAt < cursorDate OR (createdAt = cursorDate AND inCategoryId < cursorInCategoryId)
        // - newer: createdAt > cursorDate OR (createdAt = cursorDate AND inCategoryId > cursorInCategoryId)
        const sign =
          (finalSortType === "desc" && !wantNewer) || (finalSortType === "asc" && wantNewer)
            ? "older"
            : "newer";

        if (sign === "older") {
          whereParts.push(
            or(
              sql`${posts.createdAt} < ${cursorDate}`,
              and(sql`${posts.createdAt} = ${cursorDate}`, sql`${posts.inCategoryId} < ${cursorInCategoryId}`)
            )
          );
        } else {
          whereParts.push(
            or(
              sql`${posts.createdAt} > ${cursorDate}`,
              and(sql`${posts.createdAt} = ${cursorDate}`, sql`${posts.inCategoryId} > ${cursorInCategoryId}`)
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
              and(sql`${col} = ${cursorNum}`, sql`${posts.inCategoryId} < ${cursorInCategoryId}`)
            )
          );
        } else {
          whereParts.push(
            or(
              sql`${col} > ${cursorNum}`,
              and(sql`${col} = ${cursorNum}`, sql`${posts.inCategoryId} > ${cursorInCategoryId}`)
            )
          );
        }
      } else {
        // inCategoryId direct
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

    // Sort order (direction-aware). When fetching "newer" we invert order then reverse in service.
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

    const rows = await db
      .select({
        post: posts,
        owner: {
          _id: users.id,
          username: users.username,
          fullName: users.fullName,
          avatar: users.avatar,
          email: users.email,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.owner, users.id))
      .where(whereParts.length ? and(...whereParts) : undefined)
      .orderBy(...orderBys)
      .limit(limitNumber + 1);

    return {
      rows,
      limit: limitNumber,
      sortBy: finalSortBy,
      sortType: finalSortType,
      direction: scrollDirection,
    };
  }
}

export const postRepository = new PostRepository();

