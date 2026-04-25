import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth";
import {
  deletePost,
  getAllPosts,
  getPostById,
  publishPost,
  togglePublishStatus,
  updatePost,
  incrementSocialLinkView,
  removeMediaFiles,
} from "../controller/post.controller";
import { progressStore } from "../utils/progressStore";

const postRoutes = new Elysia({ prefix: "/api/v1/posts" })
  .use(authMiddleware)

  // SSE progress (frontend compatible)
  .get("/progress", async ({ userVerified }) => {
    const userId = String(userVerified._id);

    const encoder = new TextEncoder();
    let interval: ReturnType<typeof setInterval> | null = null;
    let closed = false;

    const cleanup = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const stream = new ReadableStream({
      start(controller) {
        const write = (s: string) => controller.enqueue(encoder.encode(s));

        // Heartbeat
        write(": connected\n\n");

        const sendProgress = () => {
          const progressData = progressStore.get(userId);
          if (progressData) {
            write(`data: ${JSON.stringify(progressData)}\n\n`);
            if ((progressData as any).progress >= 100) {
              setTimeout(() => {
                if (!closed) {
                  closed = true;
                  cleanup();
                  controller.close();
                }
              }, 500);
            }
          }
        };

        sendProgress();
        interval = setInterval(sendProgress, 500);
      },
      cancel() {
        if (!closed) {
          closed = true;
          cleanup();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  })

  // Get all posts
  .get("/getall", getAllPosts, {
    query: t.Object({
      limit: t.Optional(t.String()),
      cursor: t.Optional(t.String()),
      query: t.Optional(t.String()),
      category: t.Optional(t.String()),
      sortBy: t.Optional(t.String()),
      sortType: t.Optional(t.String()),
      userId: t.Optional(t.String()),
      includeCount: t.Optional(t.String()),
      direction: t.Optional(t.String()),
    }),
  })

  // Create post with numbered fields
  .post("/create", publishPost, {
    body: t.Object({
      title: t.Optional(t.String()),
      description: t.Optional(t.String()),
      category: t.String(),
      pattern: t.Optional(t.String()),

      // Store/product meta (same names)
      storeisActive: t.Optional(t.Any()),
      storeIconSize: t.Optional(t.String()),
      storeId: t.Optional(t.String()),
      storeUrl: t.Optional(t.String()),

      productisActive: t.Optional(t.Any()),
      productIconSize: t.Optional(t.String()),
      ProductId: t.Optional(t.String()),
      productUrl: t.Optional(t.String()),

      autoplay1: t.Optional(t.Any()),
      autoplay2: t.Optional(t.Any()),
      autoplay3: t.Optional(t.Any()),
      autoplay4: t.Optional(t.Any()),
      autoplay5: t.Optional(t.Any()),

      facebookurl: t.Optional(t.String()),
      instagramurl: t.Optional(t.String()),
      whatsappnumberurl: t.Optional(t.String()),
      storelinkurl: t.Optional(t.String()),

      // Social direct fields (if frontend sends)
      whatsapp: t.Optional(t.String()),
      storeLink: t.Optional(t.String()),
      facebook: t.Optional(t.Any()),
      instagram: t.Optional(t.Any()),
      productlink: t.Optional(t.String()),

      // Images 1..5
      imageFile1: t.Optional(t.File()),
      imageFile2: t.Optional(t.File()),
      imageFile3: t.Optional(t.File()),
      imageFile4: t.Optional(t.File()),
      imageFile5: t.Optional(t.File()),

      // Videos 1..5
      videoFile1: t.Optional(t.File()),
      videoFile2: t.Optional(t.File()),
      videoFile3: t.Optional(t.File()),
      videoFile4: t.Optional(t.File()),
      videoFile5: t.Optional(t.File()),

      // Thumbnails 1..5
      thumbnail1: t.Optional(t.File()),
      thumbnail2: t.Optional(t.File()),
      thumbnail3: t.Optional(t.File()),
      thumbnail4: t.Optional(t.File()),
      thumbnail5: t.Optional(t.File()),

      // Multi files (we accept either File or File[] at runtime)
      audioFiles: t.Optional(t.Any()),
      song: t.Optional(t.Any()),
    }),
  })

  // Get a specific post
  .get("/:postId", getPostById, {
    params: t.Object({ postId: t.String() }),
  })

  // Delete post
  .delete("/:postId", deletePost, {
    params: t.Object({ postId: t.String() }),
  })

  // Update post (basic fields; uploads can be added later if needed)
  .patch("/:postId", updatePost, {
    params: t.Object({ postId: t.String() }),
    body: t.Object({
      title: t.Optional(t.String()),
      description: t.Optional(t.String()),
      category: t.Optional(t.String()),
      pattern: t.Optional(t.String()),

      // Social link flags (same keys as old backend)
      whatsapp: t.Optional(t.Any()),
      storeLink: t.Optional(t.Any()),
      facebook: t.Optional(t.Any()),
      instagram: t.Optional(t.Any()),
      productlink: t.Optional(t.Any()),
    }),
  })

  // Toggle publish
  .patch("/toggle/publish/:postId", togglePublishStatus, {
    params: t.Object({ postId: t.String() }),
  })

  // Increment social link view count
  .get("/:postId/social/:linkType", incrementSocialLinkView, {
    params: t.Object({ postId: t.String(), linkType: t.String() }),
  })

  // Remove media
  .patch("/:postId/remove-media", removeMediaFiles, {
    params: t.Object({ postId: t.String() }),
    body: t.Object({
      imageUrls: t.Optional(t.Any()),
      videoUrls: t.Optional(t.Any()),
      audioUrls: t.Optional(t.Any()),
    }),
  });

export default postRoutes;

