import { createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { subscriptionService } from "../services/subscription.service";

const plans = new Set(["free", "basic", "pro", "premium", "enterprise"]);

export const createSubscriptionCheckout = async ({ body, userVerified }: any) => {
  if (!body?.plan || !body?.type) throw new ApiError(400, "plan and type are required");
  if (!plans.has(body.plan)) throw new ApiError(400, "Invalid subscription plan");
  if (body.type !== "inapp" && body.type !== "store") {
    throw new ApiError(400, "type must be inapp or store");
  }
  if (body.type === "store" && typeof body.storeId !== "string") {
    throw new ApiError(400, "storeId is required for store subscriptions");
  }

  const result = await subscriptionService.createCheckout({
    userId: userVerified._id,
    type: body.type,
    plan: body.plan,
    ...(body.storeId ? { storeId: body.storeId } : {}),
  });
  return new ApiResponse(200, result, "Checkout session created");
};

const verifyWebhookSignature = (rawBody: string, signature: string | null) => {
  const secret = process.env.SUBSCRIPTION_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const supplied = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  if (!/^[0-9a-f]{64}$/i.test(supplied)) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const actual = Buffer.from(supplied, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export const handlePaymentWebhook = async ({ request, set }: any) => {
  const rawBody = await request.text();
  if (!verifyWebhookSignature(rawBody, request.headers.get("x-subscription-signature"))) {
    set.status = process.env.SUBSCRIPTION_WEBHOOK_SECRET ? 401 : 503;
    return {
      received: false,
      error: process.env.SUBSCRIPTION_WEBHOOK_SECRET
        ? "Invalid webhook signature"
        : "Subscription webhook secret is not configured",
    };
  }

  try {
    const event = JSON.parse(rawBody);
    if (!event || typeof event.type !== "string") {
      set.status = 400;
      return { received: false, error: "Invalid payment event" };
    }
    return await subscriptionService.processPaymentEvent(event);
  } catch (error) {
    set.status = error instanceof ApiError ? error.statusCode : 500;
    return {
      received: false,
      error: error instanceof Error ? error.message : "Webhook processing failed",
    };
  }
};