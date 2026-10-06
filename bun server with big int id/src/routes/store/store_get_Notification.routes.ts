import { Elysia, t } from "elysia";
import { authMiddleware } from "../../middleware/auth";
import {
  getStoreSubscribers,
  toggleStoreNotification,
} from "../../controller/store/store_get_Notification.controller";

const storeNotificationRoutes = new Elysia({ prefix: "/api/v1/stores" }).use(
  authMiddleware
    .post("/get-store-notification/:storeId", toggleStoreNotification, {
      params: t.Object({ storeId: t.String() }),
    })
    .get("/get-store-subscribers/:storeId", getStoreSubscribers, {
      params: t.Object({ storeId: t.String() }),
    })
);

export default storeNotificationRoutes;