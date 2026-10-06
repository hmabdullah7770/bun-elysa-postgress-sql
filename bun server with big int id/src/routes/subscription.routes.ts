import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth";
import {
  createSubscriptionCheckout,
  handlePaymentWebhook,
} from "../controller/subscription.controller";

const subscriptionRoutes = new Elysia({ prefix: "/api/v1/subscriptions" })
  .post("/webhook", handlePaymentWebhook, { parse: "none" })
  .use(
    authMiddleware.post("/checkout", createSubscriptionCheckout, {
      body: t.Object({
        plan: t.String(),
        type: t.Union([t.Literal("inapp"), t.Literal("store")]),
        storeId: t.Optional(t.String()),
      }),
    })
  );

export default subscriptionRoutes;