import { Elysia, t } from "elysia";
import {
  addBidToOtherUser,
  addBidToPost,
  deleteBid,
  getAllBidsOfUser,
  getBidByUser,
  getOtherUsersBids,
  updateBid,
  updateOtherUserBid,
} from "../controller/bidding.controller";
import { createAuthMiddleware } from "../middleware/auth";

const bidBody = t.Object({
  postId: t.Union([t.String(), t.Number()]),
  productId: t.Union([t.String(), t.Number()]),
  storeId: t.String(),
  bidAmount: t.Union([t.Number(), t.String()]),
  message: t.Optional(t.String({ maxLength: 500 })),
});

const updateBody = t.Object({
  bidAmount: t.Union([t.Number(), t.String()]),
  message: t.Optional(t.String({ maxLength: 500 })),
});

const biddingRoutes = new Elysia({ prefix: "/api/v1/bids" })
  .use(createAuthMiddleware())
  .post("/add-bid", addBidToPost, {
    body: bidBody,
  })
  .post("/add-bid-for-other", addBidToOtherUser, {
    body: t.Intersect([
      bidBody,
      t.Object({ bidForUserId: t.String() }),
    ]),
  })
  .get("/other-users-bids/:postId", getOtherUsersBids, {
    params: t.Object({ postId: t.String() }),
    query: t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()) }),
  })
  .get("/user-bids/:postId/:targetUserId", getAllBidsOfUser, {
    params: t.Object({ postId: t.String(), targetUserId: t.String() }),
    query: t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()) }),
  })
  .get("/search/:postId", getBidByUser, {
    params: t.Object({ postId: t.String() }),
    query: t.Object({
      username: t.Optional(t.String()),
      userId: t.Optional(t.String()),
    }),
  })
  .patch("/update-bid/:bidId", updateBid, {
    params: t.Object({ bidId: t.String() }),
    body: updateBody,
  })
  .patch("/update-other-bid/:bidId", updateOtherUserBid, {
    params: t.Object({ bidId: t.String() }),
    body: updateBody,
  })
  .delete("/delete-bid/:bidId", deleteBid, {
    params: t.Object({ bidId: t.String() }),
  });

export default biddingRoutes;