import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { favorites, posts } from "../schemas";

export class FavoriteRepository {
  async findPublishedPostIds(postIds: number[]) {
    return db
      .select({ postId: posts._id })
      .from(posts)
      .where(and(inArray(posts._id, postIds), eq(posts.isPublished, true)));
  }

  async add(owner: string, postIds: number[]) {
    return db
      .insert(favorites)
      .values(postIds.map((postId) => ({ owner, postId })))
      .onConflictDoNothing({
        target: [favorites.owner, favorites.postId],
      })
      .returning({ postId: favorites.postId });
  }

  async remove(owner: string, postIds: number[]) {
    return db
      .delete(favorites)
      .where(and(eq(favorites.owner, owner), inArray(favorites.postId, postIds)))
      .returning({ postId: favorites.postId });
  }

  async listByOwner(owner: string) {
    return db
      .select({ postId: favorites.postId, createdAt: favorites.createdAt })
      .from(favorites)
      .where(eq(favorites.owner, owner))
      .orderBy(desc(favorites.createdAt));
  }
}

export const favoriteRepository = new FavoriteRepository();