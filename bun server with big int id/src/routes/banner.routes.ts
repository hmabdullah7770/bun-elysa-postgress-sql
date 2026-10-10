import { Elysia, t } from "elysia";
import { createBanner, deleteBanner, getBanners } from "../controller/banner.controller";
import { createAuthMiddleware } from "../middleware/auth";
import { bannerService } from "../services/banner.service";

const publicBannerRoutes = new Elysia({ prefix: "/api/v1/banner" }).get(
  "/getbanner",
  getBanners,
  { detail: { tags: ["Banners"], summary: "List active standalone banners" } }
);

const authenticatedBannerRoutes = new Elysia({ prefix: "/api/v1/banner" })
  .use(createAuthMiddleware())
  .post("/createbanner", createBanner, {
    body: t.Object({
      bannerImage: t.File({
        type: ["image/jpeg", "image/png", "image/webp"],
        maxSize: 10 * 1024 * 1024,
      }),
      store: t.Optional(t.String()),
    }),
    detail: { tags: ["Banners"], summary: "Create a 24-hour standalone banner" },
  })
  .delete("/deletebanner", deleteBanner, {
    query: t.Object({ bannerId: t.String() }),
    detail: { tags: ["Banners"], summary: "Delete your standalone banner" },
  });

let expiryCleanupTimer: ReturnType<typeof setInterval> | undefined;

const bannerRoutes = new Elysia()
  .onStart(() => {
    void bannerService.cleanupExpired().catch((error) => {
      console.error("Initial expired-banner cleanup failed:", error);
    });
    if (!expiryCleanupTimer) {
      expiryCleanupTimer = setInterval(() => {
        void bannerService.cleanupExpired().catch((error) => {
          console.error("Scheduled expired-banner cleanup failed:", error);
        });
      }, 60_000);
    }
  })
  .onStop(() => {
    if (expiryCleanupTimer) clearInterval(expiryCleanupTimer);
    expiryCleanupTimer = undefined;
  })
  .use(publicBannerRoutes)
  .use(authenticatedBannerRoutes);

export default bannerRoutes;
