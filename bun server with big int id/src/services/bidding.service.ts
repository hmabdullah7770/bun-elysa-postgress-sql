import { biddingRepository } from "../repository/bidding.repository";
import type { NewBid } from "../schemas/bidding.schema";
import { ApiError } from "../utils/ApiError";

const normalizeBid = (row: NonNullable<Awaited<ReturnType<typeof biddingRepository.findDetailedById>>>) => ({
  ...row.bid,
  bidAmount: Number(row.bid.bidAmount),
  bidder: row.bidder,
  bidForUser: row.bidForUser?._id ? row.bidForUser : null,
});

export class BiddingService {
  async addBid(
    userId: string,
    input: Omit<NewBid, "userId" | "owner" | "bidForUserId">
  ) {
    const [post, product, store] = await Promise.all([
      biddingRepository.findPostOwner(input.postId),
      biddingRepository.findProductStore(input.productId),
      biddingRepository.findStore(input.storeId),
    ]);
    if (!post) throw new ApiError(404, "Post not found");
    if (!product) throw new ApiError(404, "Product not found");
    if (!store) throw new ApiError(404, "Store not found");
    if (product.storeId !== input.storeId) {
      throw new ApiError(400, "Product does not belong to the supplied store");
    }
    if (userId === post.owner) throw new ApiError(400, "You cannot bid on your own post");

    const bid = await biddingRepository.insert({
      ...input,
      userId,
      owner: post.owner,
      bidForUserId: null,
    });
    if (!bid) throw new ApiError(500, "Bid could not be created");
    return normalizeBid(bid);
  }

  async addBidForOther(
    userId: string,
    bidForUserId: string,
    input: Omit<NewBid, "userId" | "owner" | "bidForUserId">
  ) {
    const [post, product, store, recipient] = await Promise.all([
      biddingRepository.findPostOwner(input.postId),
      biddingRepository.findProductStore(input.productId),
      biddingRepository.findStore(input.storeId),
      biddingRepository.findUser(bidForUserId),
    ]);
    if (!post) throw new ApiError(404, "Post not found");
    if (!product) throw new ApiError(404, "Product not found");
    if (!store) throw new ApiError(404, "Store not found");
    if (!recipient) throw new ApiError(404, "Bid recipient user not found");
    if (product.storeId !== input.storeId) {
      throw new ApiError(400, "Product does not belong to the supplied store");
    }
    if (userId === post.owner) throw new ApiError(400, "You cannot bid on your own post");
    if (bidForUserId === post.owner) throw new ApiError(400, "Cannot bid for the post owner");
    if (bidForUserId === userId) throw new ApiError(400, "Use the add-bid endpoint to bid for yourself");

    const bid = await biddingRepository.insert({
      ...input,
      userId,
      owner: post.owner,
      bidForUserId,
    });
    if (!bid) throw new ApiError(500, "Bid could not be created");
    return normalizeBid(bid);
  }

  async listForUser(params: {
    postId: number;
    userId: string;
    page: number;
    limit: number;
    receivedOnly?: boolean;
  }) {
    const post = await biddingRepository.findPostOwner(params.postId);
    if (!post) throw new ApiError(404, "Post not found");

    const { rows, totals } = await biddingRepository.listForUser(params);
    const totalBids = Number(totals?.totalBids ?? 0);
    const totalPages = Math.ceil(totalBids / params.limit);
    return {
      docs: rows.map(normalizeBid),
      totalDocs: totalBids,
      limit: params.limit,
      page: params.page,
      totalPages,
      hasPrevPage: params.page > 1,
      hasNextPage: params.page < totalPages,
      summary: {
        totalBidAmount: Number(totals?.totalBidAmount ?? 0),
        highestBid: Number(totals?.highestBid ?? 0),
        ownBidsCount: Number(totals?.ownBidsCount ?? 0),
        receivedBidsCount: Number(totals?.receivedBidsCount ?? 0),
      },
    };
  }

  async updateBid(
    id: number,
    userId: string,
    bidAmount: string,
    message: string | undefined,
    forOther: boolean
  ) {
    const existing = await biddingRepository.findOwnedBid(id, userId);
    if (!existing) {
      const anyBid = await biddingRepository.findDetailedById(id);
      if (!anyBid) throw new ApiError(404, "Bid not found");
      throw new ApiError(403, "You can only update bids you placed");
    }
    if (Boolean(existing.bidForUserId) !== forOther) {
      throw new ApiError(400, forOther
        ? "This is not a bid for another user. Use update-bid endpoint"
        : "Use update-other-bid endpoint for bids placed for others");
    }

    const updated = await biddingRepository.updateOwnedBid(id, userId, {
      bidAmount,
      ...(message !== undefined ? { message } : {}),
    });
    if (!updated) throw new ApiError(404, "Bid not found");
    return normalizeBid(updated);
  }

  async deleteBid(id: number, userId: string) {
    const deleted = await biddingRepository.deleteOwnedBid(id, userId);
    if (!deleted) {
      const bid = await biddingRepository.findDetailedById(id);
      if (!bid) throw new ApiError(404, "Bid not found");
      throw new ApiError(403, "You can only delete bids you placed");
    }
    return deleted._id;
  }

  async findUserBids(postId: number, targetUserId: string) {
    const [post, user] = await Promise.all([
      biddingRepository.findPostOwner(postId),
      biddingRepository.findUser(targetUserId),
    ]);
    if (!post) throw new ApiError(404, "Post not found");
    if (!user) throw new ApiError(404, "User not found");

    const rows = await biddingRepository.findBidsForUserOnPost(postId, targetUserId);
    const ownBids = rows.filter(({ bid }) => !bid.bidForUserId);
    const receivedBids = rows.filter(({ bid }) => Boolean(bid.bidForUserId));
    return {
      user,
      hasBid: rows.length > 0,
      summary: {
        totalBidAmount: rows.reduce((total, { bid }) => total + Number(bid.bidAmount), 0),
        totalBidsCount: rows.length,
        ownBidsCount: ownBids.length,
        receivedBidsCount: receivedBids.length,
        highestBid: rows[0] ? Number(rows[0].bid.bidAmount) : 0,
        ownBidsTotal: ownBids.reduce((total, { bid }) => total + Number(bid.bidAmount), 0),
        receivedBidsTotal: receivedBids.reduce((total, { bid }) => total + Number(bid.bidAmount), 0),
      },
      bids: rows.map(normalizeBid),
    };
  }

  async findUserByUsername(username: string) {
    return biddingRepository.findUserByUsername(username);
  }

  async findUserById(userId: string) {
    return biddingRepository.findUser(userId);
  }
}

export const biddingService = new BiddingService();