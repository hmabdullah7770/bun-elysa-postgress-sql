import { biddingService } from "../services/bidding.service";
import { isValidId } from "../Validators/bigintvalidator";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const parseId = (value: unknown, label: string) => {
  const validString = typeof value === "string" && /^\d+$/.test(value);
  const validNumber = typeof value === "number" && Number.isSafeInteger(value);
  if ((!validString && !validNumber) || !isValidId(value as string | number)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
  return Number(value);
};

const parseUuid = (value: unknown, label: string) => {
  if (typeof value !== "string" || !uuidPattern.test(value)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
  return value;
};

const parseBidAmount = (value: unknown) => {
  const amount = typeof value === "number" || typeof value === "string"
    ? Number(value)
    : NaN;
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount * 100)) {
    throw new ApiError(400, "Bid amount must be greater than 0 and use at most 2 decimal places");
  }
  return amount.toFixed(2);
};

const parseMessage = (value: unknown) => {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > 500) {
    throw new ApiError(400, "Message must be a string of at most 500 characters");
  }
  return value.trim();
};

const parsePage = (value: unknown, fallback: number, label: string) => {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new ApiError(400, `Invalid ${label}`);
  }
  return parsed;
};

const parseBidInput = (body: any) => ({
  postId: parseId(body.postId, "post ID"),
  productId: parseId(body.productId, "product ID"),
  storeId: parseUuid(body.storeId, "store ID"),
  bidAmount: parseBidAmount(body.bidAmount),
  message: parseMessage(body.message) ?? "",
});

export const addBidToPost = async ({ body, userVerified }: any) => {
  const bid = await biddingService.addBid(userVerified._id, parseBidInput(body));
  return new ApiResponse(201, bid, "Bid placed successfully");
};

export const addBidToOtherUser = async ({ body, userVerified }: any) => {
  const bidForUserId = parseUuid(body.bidForUserId, "bid recipient user ID");
  const bid = await biddingService.addBidForOther(
    userVerified._id,
    bidForUserId,
    parseBidInput(body)
  );
  return new ApiResponse(201, bid, "Bid placed for other user successfully");
};

const parsePagination = (query: any) => {
  const page = parsePage(query.page, 1, "page");
  const limit = Math.min(parsePage(query.limit, 10, "limit"), 100);
  return { page, limit };
};

export const getOtherUsersBids = async ({ params, query, userVerified }: any) => {
  const postId = parseId(params.postId, "post ID");
  const data = await biddingService.listForUser({
    postId,
    userId: userVerified._id,
    ...parsePagination(query),
    receivedOnly: true,
  });
  return new ApiResponse(200, data, "Other users' bids fetched successfully");
};

export const getAllBidsOfUser = async ({ params, query }: any) => {
  const postId = parseId(params.postId, "post ID");
  const targetUserId = parseUuid(params.targetUserId, "user ID");
  const data = await biddingService.listForUser({
    postId,
    userId: targetUserId,
    ...parsePagination(query),
  });
  return new ApiResponse(200, data, "All bids of user fetched successfully");
};

export const updateBid = async ({ params, body, userVerified }: any) => {
  const id = parseId(params.bidId, "bid ID");
  const bid = await biddingService.updateBid(
    id,
    userVerified._id,
    parseBidAmount(body.bidAmount),
    parseMessage(body.message),
    false
  );
  return new ApiResponse(200, bid, "Bid updated successfully");
};

export const updateOtherUserBid = async ({ params, body, userVerified }: any) => {
  const id = parseId(params.bidId, "bid ID");
  const bid = await biddingService.updateBid(
    id,
    userVerified._id,
    parseBidAmount(body.bidAmount),
    parseMessage(body.message),
    true
  );
  return new ApiResponse(200, bid, "Other user bid updated successfully");
};

export const deleteBid = async ({ params, userVerified }: any) => {
  const id = parseId(params.bidId, "bid ID");
  const deletedBidId = await biddingService.deleteBid(id, userVerified._id);
  return new ApiResponse(200, { deletedBidId }, "Bid deleted successfully");
};

export const getBidByUser = async ({ params, query }: any) => {
  const postId = parseId(params.postId, "post ID");
  if (!query.username && !query.userId) {
    throw new ApiError(400, "Please provide username or userId");
  }

  const user = query.username
    ? await biddingService.findUserByUsername(query.username)
    : await biddingService.findUserById(parseUuid(query.userId, "user ID"));
  if (!user) return new ApiResponse(404, null, "User not found");

  const result = await biddingService.findUserBids(postId, user._id);
  if (!result.hasBid) {
    return new ApiResponse(200, { hasBid: false, user: result.user, bids: [] }, "User has not bid on this post");
  }
  return new ApiResponse(200, result, "User bids fetched successfully");
};