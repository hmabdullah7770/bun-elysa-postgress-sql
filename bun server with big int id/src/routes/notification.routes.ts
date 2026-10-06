import { Elysia, t } from "elysia";
import { createAuthMiddleware } from "../middleware/auth";
import {
  addNotificationType,
  clearAllNotifications,
  createNotificationApi,
  deleteNotification,
  getNotificationCounts,
  getNotificationTypes,
  getUnreadCount,
  getUserNotifications,
  markAllAsRead,
  markAllAsSeen,
  markAsRead,
  updateNotificationTypeStatus,
} from "../controller/notification.controller";

const notificationIdsBody = t.Object({
  notificationIds: t.Array(t.Union([t.String(), t.Number()]), { minItems: 1 }),
});

const notificationRoutes = new Elysia({ prefix: "/api/v1/notifications" }).use(
  createAuthMiddleware()
    .post("/add/types", addNotificationType, {
      body: t.Object({
        type: t.String({ minLength: 1, maxLength: 100 }),
        label: t.String({ minLength: 1, maxLength: 255 }),
        description: t.Optional(t.String()),
      }),
    })
    .get("/get/types", getNotificationTypes, {
      query: t.Object({ includeInactive: t.Optional(t.String()) }),
    })
    .patch("/status/types/:id", updateNotificationTypeStatus, {
      params: t.Object({ id: t.String() }),
      body: t.Object({ isActive: t.Boolean() }),
    })
    .post("/create", createNotificationApi, {
      body: t.Object({
        recipient: t.String(),
        sender: t.Optional(t.Union([t.String(), t.Null()])),
        store: t.Optional(t.Union([t.String(), t.Null()])),
        type: t.String({ minLength: 1, maxLength: 100 }),
        title: t.String({ minLength: 1 }),
        body: t.String({ minLength: 1 }),
        metadata: t.Optional(t.Record(t.String(), t.Any())),
      }),
    })
    .get("/getnotification", getUserNotifications, {
      query: t.Object({
        type: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    })
    .get("/unread-count", getUnreadCount)
    .patch("/mark-all-read", markAllAsRead)
    .patch("/read", markAsRead, { body: notificationIdsBody })
    .delete("/clear-all", clearAllNotifications)
    .delete("/delete", deleteNotification, { body: notificationIdsBody })
    .get("/counts", getNotificationCounts)
    .patch("/mark-all-seen", markAllAsSeen)
);

export default notificationRoutes;