import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth";
import {
  newAddComment,
  newDeleteComment,
  newGetComments,
  newGetCommentsWithRatings,
  newUpdateComment,
  newAddReply,
  newGetReplies,
  pinComment,
  unpinComment,
  searchComments,
  toggleCommentLike,
  toggleCommentDislike,
  getCommentLikeStatus,
} from "../controller/comment.controller";

const commentRoutes = new Elysia({ prefix: "/api/v1/newcomments" }).use(
  authMiddleware
    // Remap :storeId → postId before hitting controller
    .get("/:storeId", (ctx) => newGetComments({ ...ctx, params: { postId: ctx.params.storeId } }), {
      params: t.Object({ storeId: t.String() }),
    })
    .post("/:storeId", (ctx) => newAddComment({ ...ctx, params: { postId: ctx.params.storeId } }), {
      params: t.Object({ storeId: t.String() }),
      body: t.Object({
        content: t.Optional(t.String()),
        pinned: t.Optional(t.Union([t.Boolean(), t.String()])),
        audioComment: t.Optional(t.File()),
        videoComment: t.Optional(t.File()),
        sticker: t.Optional(t.File()),
        fileComment: t.Optional(t.File()),
        imageComment: t.Optional(t.File()),
      }),
    })

    // Remap :storeId → commentId before hitting controller
    .patch("/:storeId", (ctx) => newUpdateComment({ ...ctx, params: { commentId: ctx.params.storeId } }), {
      params: t.Object({ storeId: t.String() }),
      body: t.Object({
        content: t.Optional(t.String()),
        audioComment: t.Optional(t.File()),
        videoComment: t.Optional(t.File()),
        sticker: t.Optional(t.File()),
      }),
    })
    .delete("/:storeId", (ctx) => newDeleteComment({ ...ctx, params: { commentId: ctx.params.storeId } }), {
      params: t.Object({ storeId: t.String() }),
      body: t.Object({ postId: t.String() }),
    })
    .get("/:storeId/replies", (ctx) => newGetReplies({ ...ctx, params: { commentId: ctx.params.storeId } }), {
      params: t.Object({ storeId: t.String() }),
    })
    .post("/:storeId/reply", (ctx) => newAddReply({ ...ctx, params: { commentId: ctx.params.storeId } }), {
      params: t.Object({ storeId: t.String() }),
      body: t.Object({
        content: t.Optional(t.String()),
        audioComment: t.Optional(t.File()),
        videoComment: t.Optional(t.File()),
        sticker: t.Optional(t.File()),
        fileComment: t.Optional(t.File()),
        imageComment: t.Optional(t.File()),
      }),
    })

    // These already have unique static prefixes — no changes needed
    .get("/with-ratings/:postId", newGetCommentsWithRatings, {
      params: t.Object({ postId: t.String() }),
    })
    .post("/comment/:commentId/pin", pinComment, {
      params: t.Object({ commentId: t.String() }),
      body: t.Object({ postId: t.String() }),
    })
    .post("/comment/:commentId/unpin", unpinComment, {
      params: t.Object({ commentId: t.String() }),
      body: t.Object({ postId: t.String() }),
    })
    .post("/comment/:commentId/like", toggleCommentLike, {
      params: t.Object({ commentId: t.String() }),
    })
    .post("/comment/:commentId/dislike", toggleCommentDislike, {
      params: t.Object({ commentId: t.String() }),
    })
    .get("/comment/:commentId/like-status", getCommentLikeStatus, {
      params: t.Object({ commentId: t.String() }),
    })
    .get("/search/:postId", searchComments, {
      params: t.Object({ postId: t.String() }),
    })
);

export default commentRoutes;


// import { Elysia, t } from "elysia";
// import { authMiddleware } from "../middleware/auth";
// import {
//   newAddComment,
//   newDeleteComment,
//   newGetComments,
//   newGetCommentsWithRatings,
//   newUpdateComment,
//   newAddReply,
//   newGetReplies,
//   pinComment,
//   unpinComment,
//   searchComments,
//   toggleCommentLike,
//   toggleCommentDislike,
//   getCommentLikeStatus,
// } from "../controller/comment.controller";

// const commentRoutes = new Elysia({ prefix: "/api/v1/newcomment" }).use(
//   authMiddleware
//     // Remap :id → postId before hitting controller
//     .get("/:id", (ctx) => newGetComments({ ...ctx, params: { postId: ctx.params.id } }), {
//       params: t.Object({ id: t.String() }),
//     })
//     .post("/:id", (ctx) => newAddComment({ ...ctx, params: { postId: ctx.params.id } }), {
//       params: t.Object({ id: t.String() }),
//       body: t.Object({
//         content: t.Optional(t.String()),
//         pinned: t.Optional(t.Union([t.Boolean(), t.String()])),
//         audioComment: t.Optional(t.File()),
//         videoComment: t.Optional(t.File()),
//         sticker: t.Optional(t.File()),
//         fileComment: t.Optional(t.File()),
//         imageComment: t.Optional(t.File()),
//       }),
//     })

//     // Remap :id → commentId before hitting controller
//     .patch("/:id", (ctx) => newUpdateComment({ ...ctx, params: { commentId: ctx.params.id } }), {
//       params: t.Object({ id: t.String() }),
//       body: t.Object({
//         content: t.Optional(t.String()),
//         audioComment: t.Optional(t.File()),
//         videoComment: t.Optional(t.File()),
//         sticker: t.Optional(t.File()),
//       }),
//     })
//     .delete("/:id", (ctx) => newDeleteComment({ ...ctx, params: { commentId: ctx.params.id } }), {
//       params: t.Object({ id: t.String() }),
//       body: t.Object({ postId: t.String() }),
//     })
//     .get("/:id/replies", (ctx) => newGetReplies({ ...ctx, params: { commentId: ctx.params.id } }), {
//       params: t.Object({ id: t.String() }),
//     })
//     .post("/:id/reply", (ctx) => newAddReply({ ...ctx, params: { commentId: ctx.params.id } }), {
//       params: t.Object({ id: t.String() }),
//       body: t.Object({
//         content: t.Optional(t.String()),
//         audioComment: t.Optional(t.File()),
//         videoComment: t.Optional(t.File()),
//         sticker: t.Optional(t.File()),
//         fileComment: t.Optional(t.File()),
//         imageComment: t.Optional(t.File()),
//       }),
//     })

//     // These already have unique prefixes — no changes needed
//     .get("/with-ratings/:postId", newGetCommentsWithRatings, {
//       params: t.Object({ postId: t.String() }),
//     })
//     .post("/comment/:commentId/pin", pinComment, {
//       params: t.Object({ commentId: t.String() }),
//       body: t.Object({ postId: t.String() }),
//     })
//     .post("/comment/:commentId/unpin", unpinComment, {
//       params: t.Object({ commentId: t.String() }),
//       body: t.Object({ postId: t.String() }),
//     })
//     .post("/comment/:commentId/like", toggleCommentLike, {
//       params: t.Object({ commentId: t.String() }),
//     })
//     .post("/comment/:commentId/dislike", toggleCommentDislike, {
//       params: t.Object({ commentId: t.String() }),
//     })
//     .get("/comment/:commentId/like-status", getCommentLikeStatus, {
//       params: t.Object({ commentId: t.String() }),
//     })
//     .get("/search/:postId", searchComments, {
//       params: t.Object({ postId: t.String() }),
//     })
// );



// // const commentRoutes = new Elysia({ prefix: "/api/v1/newcomment" }).use(
// //   authMiddleware
// //     // GET/POST /api/v1/newcomment/:postId
// //     .get("/:postId", newGetComments, {
// //       params: t.Object({ postId: t.String() }),
// //     })
// //     .post("/:postId", newAddComment, {
// //       params: t.Object({ postId: t.String() }),
// //       body: t.Object({
// //         content: t.Optional(t.String()),
// //         pinned: t.Optional(t.Union([t.Boolean(), t.String()])),
// //         audioComment: t.Optional(t.File()),
// //         videoComment: t.Optional(t.File()),
// //         sticker: t.Optional(t.File()),
// //         fileComment: t.Optional(t.File()),
// //         imageComment: t.Optional(t.File()),
// //       }),
// //     })

// //     // POST /api/v1/newcomment/comment/:commentId/pin
// //     .post("/comment/:commentId/pin", pinComment, {
// //       params: t.Object({ commentId: t.String() }),
// //       body: t.Object({ postId: t.String() }),
// //     })

// //     // POST /api/v1/newcomment/comment/:commentId/unpin
// //     .post("/comment/:commentId/unpin", unpinComment, {
// //       params: t.Object({ commentId: t.String() }),
// //       body: t.Object({ postId: t.String() }),
// //     })

// //     // GET /api/v1/newcomment/with-ratings/:postId
// //     .get("/with-ratings/:postId", newGetCommentsWithRatings, {
// //       params: t.Object({ postId: t.String() }),
// //     })

// //     // PATCH/DELETE /api/v1/newcomment/:commentId
// //     .patch("/:commentId", newUpdateComment, {
// //       params: t.Object({ commentId: t.String() }),
// //       body: t.Object({
// //         content: t.Optional(t.String()),
// //         audioComment: t.Optional(t.File()),
// //         videoComment: t.Optional(t.File()),
// //         sticker: t.Optional(t.File()),
// //       }),
// //     })
// //     .delete("/:commentId", newDeleteComment, {
// //       params: t.Object({ commentId: t.String() }),
// //       body: t.Object({ postId: t.String() }),
// //     })

// //     // Reply routes
// //     .get("/:commentId/replies", newGetReplies, {
// //       params: t.Object({ commentId: t.String() }),
// //     })
// //     .post("/:commentId/reply", newAddReply, {
// //       params: t.Object({ commentId: t.String() }),
// //       body: t.Object({
// //         content: t.Optional(t.String()),
// //         audioComment: t.Optional(t.File()),
// //         videoComment: t.Optional(t.File()),
// //         sticker: t.Optional(t.File()),
// //         fileComment: t.Optional(t.File()),
// //         imageComment: t.Optional(t.File()),
// //       }),
// //     })

// //     // Like/dislike routes
// //     .post("/comment/:commentId/like", toggleCommentLike, {
// //       params: t.Object({ commentId: t.String() }),
// //     })
// //     .post("/comment/:commentId/dislike", toggleCommentDislike, {
// //       params: t.Object({ commentId: t.String() }),
// //     })
// //     .get("/comment/:commentId/like-status", getCommentLikeStatus, {
// //       params: t.Object({ commentId: t.String() }),
// //     })

// //     // Search
// //     .get("/search/:postId", searchComments, {
// //       params: t.Object({ postId: t.String() }),
// //     })
// // );

// export default commentRoutes;

