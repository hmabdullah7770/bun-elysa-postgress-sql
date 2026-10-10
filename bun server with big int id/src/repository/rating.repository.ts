import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { posts } from "../schemas/post.schema";
import { ratings } from "../schemas/rating.schema";
import { users } from "../schemas/user.schema";

export type RatingInput = {
  postId: number;
  rating: number | null;
};

type RatingPatch = {
  rating?: number;
  comment?: string | null;
};

const updatePostTotals = async (
  tx: any,
  postId: number,
  totalRating: number,
  ratingCount: number
) => {
  await tx
    .update(posts)
    .set({
      totalRating,
      ratingCount,
      averageRating: ratingCount > 0 ? (totalRating / ratingCount).toFixed(2) : "0.00",
      updatedAt: new Date(),
    })
    .where(eq(posts._id, postId));
};

export class RatingRepository {
  async findPublishedPost(postId: number) {
    const rows = await db
      .select({
        _id: posts._id,
        averageRating: posts.averageRating,
        ratingCount: posts.ratingCount,
      })
      .from(posts)
      .where(and(eq(posts._id, postId), eq(posts.isPublished, true)))
      .limit(1);
    return rows[0] ?? null;
  }

  async listForPost(params: {
    postId: number;
    page: number;
    limit: number;
    sortBy: "rating" | "createdAt" | "updatedAt";
    sortType: "asc" | "desc";
  }) {
    const sortColumn =
      params.sortBy === "createdAt"
        ? ratings.createdAt
        : params.sortBy === "updatedAt"
          ? ratings.updatedAt
          : ratings.rating;
    const order = params.sortType === "asc" ? asc(sortColumn) : desc(sortColumn);

    return db
      .select({
        rating: ratings,
        owner: {
          _id: users._id,
          username: users.username,
          fullName: users.fullName,
          avatar: users.avatar,
        },
      })
      .from(ratings)
      .leftJoin(users, eq(ratings.owner, users._id))
      .where(eq(ratings.postId, params.postId))
      .orderBy(order, desc(ratings._id))
      .limit(params.limit)
      .offset((params.page - 1) * params.limit);
  }

  async countForPost(postId: number) {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(ratings)
      .where(eq(ratings.postId, postId));
    return Number(rows[0]?.count ?? 0);
  }

  async distributionForPost(postId: number) {
    return db
      .select({ rating: ratings.rating, count: sql<number>`count(*)::int` })
      .from(ratings)
      .where(eq(ratings.postId, postId))
      .groupBy(ratings.rating)
      .orderBy(desc(ratings.rating));
  }

  async findByPostAndOwner(postId: number, owner: string) {
    const rows = await db
      .select()
      .from(ratings)
      .where(and(eq(ratings.postId, postId), eq(ratings.owner, owner)))
      .limit(1);
    return rows[0] ?? null;
  }

  async processBulk(owner: string, entries: RatingInput[]) {
    return db.transaction(async (tx) => {
      const postIds = entries.map(({ postId }) => postId);
      const lockedPosts = await tx
        .select({
          _id: posts._id,
          totalRating: posts.totalRating,
          ratingCount: posts.ratingCount,
        })
        .from(posts)
        .where(and(inArray(posts._id, postIds), eq(posts.isPublished, true)))
        .orderBy(asc(posts._id))
        .for("update");

      if (lockedPosts.length === 0) return [];

      const lockedRatings = await tx
        .select()
        .from(ratings)
        .where(and(inArray(ratings.postId, lockedPosts.map(({ _id }) => _id)), eq(ratings.owner, owner)))
        .for("update");
      const postById = new Map(lockedPosts.map((post) => [post._id, post]));
      const ratingByPostId = new Map(lockedRatings.map((row) => [row.postId, row]));
      const results: Array<{ postId: number; rating: number | null; action: string }> = [];

      for (const entry of entries) {
        const post = postById.get(entry.postId);
        if (!post) continue;

        const previous = ratingByPostId.get(entry.postId);
        if (entry.rating === null) {
          if (!previous) {
            results.push({ postId: entry.postId, rating: null, action: "nothing_to_unrate" });
            continue;
          }

          await tx
            .delete(ratings)
            .where(and(eq(ratings.postId, entry.postId), eq(ratings.owner, owner)));
          const totalRating = post.totalRating - previous.rating;
          const ratingCount = Math.max(0, post.ratingCount - 1);
          await updatePostTotals(tx, entry.postId, totalRating, ratingCount);
          ratingByPostId.delete(entry.postId);
          results.push({ postId: entry.postId, rating: null, action: "removed" });
          continue;
        }

        if (previous) {
          await tx
            .update(ratings)
            .set({
              rating: entry.rating,
              updatedAt: new Date(),
            })
            .where(eq(ratings._id, previous._id));
        } else {
          await tx.insert(ratings).values({
            postId: entry.postId,
            owner,
            rating: entry.rating,
          });
        }

        const difference = entry.rating - (previous?.rating ?? 0);
        const totalRating = post.totalRating + difference;
        const ratingCount = previous ? post.ratingCount : post.ratingCount + 1;
        await updatePostTotals(tx, entry.postId, totalRating, ratingCount);
        results.push({
          postId: entry.postId,
          rating: entry.rating,
          action: previous ? "updated" : "added",
        });
      }

      return results;
    });
  }

  async updateById(id: number, owner: string, patch: RatingPatch) {
    const initial = await db
      .select({ postId: ratings.postId })
      .from(ratings)
      .where(and(eq(ratings._id, id), eq(ratings.owner, owner)))
      .limit(1);
    const initialRating = initial[0];
    if (!initialRating) return null;

    return db.transaction(async (tx) => {
      const lockedPosts = await tx
        .select({
          _id: posts._id,
          totalRating: posts.totalRating,
          ratingCount: posts.ratingCount,
        })
        .from(posts)
        .where(eq(posts._id, initialRating.postId))
        .for("update")
        .limit(1);
      if (!lockedPosts[0]) return null;

      const lockedRatings = await tx
        .select()
        .from(ratings)
        .where(and(eq(ratings._id, id), eq(ratings.owner, owner)))
        .for("update")
        .limit(1);
      const current = lockedRatings[0];
      if (!current) return null;

      const nextRating = patch.rating ?? current.rating;
      const difference = nextRating - current.rating;
      await tx
        .update(ratings)
        .set({
          ...(patch.rating !== undefined ? { rating: patch.rating } : {}),
          ...(patch.comment !== undefined ? { comment: patch.comment?.trim() ?? null } : {}),
          updatedAt: new Date(),
        })
        .where(eq(ratings._id, id));

      if (difference !== 0) {
        const post = lockedPosts[0];
        await updatePostTotals(
          tx,
          post._id,
          post.totalRating + difference,
          post.ratingCount
        );
      }

      const rows = await tx
        .select({
          rating: ratings,
          owner: {
            _id: users._id,
            username: users.username,
            fullName: users.fullName,
            avatar: users.avatar,
          },
        })
        .from(ratings)
        .leftJoin(users, eq(ratings.owner, users._id))
        .where(eq(ratings._id, id))
        .limit(1);
      return rows[0] ?? null;
    });
  }

  async deleteById(id: number, owner: string) {
    const initial = await db
      .select({ postId: ratings.postId })
      .from(ratings)
      .where(and(eq(ratings._id, id), eq(ratings.owner, owner)))
      .limit(1);
    const initialRating = initial[0];
    if (!initialRating) return null;

    return db.transaction(async (tx) => {
      const lockedPosts = await tx
        .select({
          _id: posts._id,
          totalRating: posts.totalRating,
          ratingCount: posts.ratingCount,
        })
        .from(posts)
        .where(eq(posts._id, initialRating.postId))
        .for("update")
        .limit(1);
      if (!lockedPosts[0]) return null;

      const deleted = await tx
        .delete(ratings)
        .where(and(eq(ratings._id, id), eq(ratings.owner, owner)))
        .returning();
      const rating = deleted[0];
      if (!rating) return null;

      const post = lockedPosts[0];
      await updatePostTotals(
        tx,
        post._id,
        post.totalRating - rating.rating,
        Math.max(0, post.ratingCount - 1)
      );
      return rating;
    });
  }
}

export const ratingRepository = new RatingRepository();