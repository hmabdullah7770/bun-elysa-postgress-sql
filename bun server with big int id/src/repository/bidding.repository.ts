import { and, desc, eq, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../db";
import { bids, type NewBid } from "../schemas/bidding.schema";
import { posts } from "../schemas/post.schema";
import { createStore } from "../schemas/store/createStore.schema";
import { store_product } from "../schemas/store/store_product.schema";
import { users } from "../schemas/user.schema";

const bidRecipient = alias(users, "bid_recipient");

const bidDetailsSelection = {
  bid: bids,
  bidder: {
    _id: users._id,
    username: users.username,
    fullName: users.fullName,
    avatar: users.avatar,
  },
  bidForUser: {
    _id: bidRecipient._id,
    username: bidRecipient.username,
    fullName: bidRecipient.fullName,
    avatar: bidRecipient.avatar,
  },
};

export class BiddingRepository {
  async findPostOwner(postId: number) {
    const rows = await db
      .select({ _id: posts._id, owner: posts.owner })
      .from(posts)
      .where(eq(posts._id, postId))
      .limit(1);
    return rows[0] ?? null;
  }

  async findProductStore(productId: number) {
    const rows = await db
      .select({ storeId: store_product.storeId })
      .from(store_product)
      .where(eq(store_product._id, productId))
      .limit(1);
    return rows[0] ?? null;
  }

  async findStore(storeId: string) {
    const rows = await db
      .select({ _id: createStore._id })
      .from(createStore)
      .where(eq(createStore._id, storeId))
      .limit(1);
    return rows[0] ?? null;
  }

  async findUser(userId: string) {
    const rows = await db
      .select({
        _id: users._id,
        username: users.username,
        fullName: users.fullName,
        avatar: users.avatar,
      })
      .from(users)
      .where(eq(users._id, userId))
      .limit(1);
    return rows[0] ?? null;
  }

  async findUserByUsername(username: string) {
    const rows = await db
      .select({
        _id: users._id,
        username: users.username,
        fullName: users.fullName,
        avatar: users.avatar,
      })
      .from(users)
      .where(eq(sql`lower(${users.username})`, username.toLowerCase()))
      .limit(1);
    return rows[0] ?? null;
  }

  async insert(values: NewBid) {
    const rows = await db.insert(bids).values(values).returning({ _id: bids._id });
    return rows[0] ? this.findDetailedById(rows[0]._id) : null;
  }

  async findDetailedById(id: number) {
    const rows = await db
      .select(bidDetailsSelection)
      .from(bids)
      .leftJoin(users, eq(bids.userId, users._id))
      .leftJoin(bidRecipient, eq(bids.bidForUserId, bidRecipient._id))
      .where(eq(bids._id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async findOwnedBid(id: number, userId: string) {
    const rows = await db
      .select({ _id: bids._id, bidForUserId: bids.bidForUserId })
      .from(bids)
      .where(and(eq(bids._id, id), eq(bids.userId, userId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async updateOwnedBid(id: number, userId: string, patch: { bidAmount?: string; message?: string }) {
    const rows = await db
      .update(bids)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(bids._id, id), eq(bids.userId, userId)))
      .returning({ _id: bids._id });
    return rows[0] ? this.findDetailedById(rows[0]._id) : null;
  }

  async deleteOwnedBid(id: number, userId: string) {
    const rows = await db
      .delete(bids)
      .where(and(eq(bids._id, id), eq(bids.userId, userId)))
      .returning({ _id: bids._id });
    return rows[0] ?? null;
  }

  async listForUser(params: {
    postId: number;
    userId: string;
    page: number;
    limit: number;
    receivedOnly?: boolean;
  }) {
    const userBids = params.receivedOnly
      ? eq(bids.bidForUserId, params.userId)
      : or(
          and(eq(bids.userId, params.userId), sql`${bids.bidForUserId} is null`),
          eq(bids.bidForUserId, params.userId)
        );
    const where = and(eq(bids.postId, params.postId), userBids);

    const [rows, totals] = await Promise.all([
      db
        .select(bidDetailsSelection)
        .from(bids)
        .leftJoin(users, eq(bids.userId, users._id))
        .leftJoin(bidRecipient, eq(bids.bidForUserId, bidRecipient._id))
        .where(where)
        .orderBy(desc(bids.bidAmount), desc(bids.createdAt))
        .limit(params.limit)
        .offset((params.page - 1) * params.limit),
      db
        .select({
          totalBids: sql<number>`count(*)::int`,
          totalBidAmount: sql<number>`coalesce(sum(${bids.bidAmount}), 0)::float8`,
          highestBid: sql<number>`coalesce(max(${bids.bidAmount}), 0)::float8`,
          ownBidsCount: sql<number>`count(*) filter (where ${bids.bidForUserId} is null)::int`,
          receivedBidsCount: sql<number>`count(*) filter (where ${bids.bidForUserId} is not null)::int`,
        })
        .from(bids)
        .where(where),
    ]);

    return { rows, totals: totals[0] };
  }

  async findBidsForUserOnPost(postId: number, userId: string) {
    return db
      .select(bidDetailsSelection)
      .from(bids)
      .leftJoin(users, eq(bids.userId, users._id))
      .leftJoin(bidRecipient, eq(bids.bidForUserId, bidRecipient._id))
      .where(
        and(
          eq(bids.postId, postId),
          or(
            and(eq(bids.userId, userId), sql`${bids.bidForUserId} is null`),
            eq(bids.bidForUserId, userId)
          )
        )
      )
      .orderBy(desc(bids.bidAmount), desc(bids.createdAt));
  }
}

export const biddingRepository = new BiddingRepository();