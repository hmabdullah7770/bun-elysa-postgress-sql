import { subscriptionRepository } from "../repository/subscription.repository";
import { ApiError } from "../utils/ApiError";

export type SubscriptionKind = "inapp" | "store";
export type SubscriptionPlan = "free" | "basic" | "pro" | "premium" | "enterprise";

export type CheckoutSessionInput = {
  subscriptionId: number;
  userId: string;
  type: SubscriptionKind;
  plan: SubscriptionPlan;
  storeId?: string;
};

export type CheckoutSession = {
  checkoutUrl: string;
  gatewaySubscriptionId?: string | null;
  gatewayCustomerId?: string | null;
};

export type SubscriptionPaymentProvider = {
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession>;
};

let paymentProvider: SubscriptionPaymentProvider | null = null;

export const registerSubscriptionPaymentProvider = (provider: SubscriptionPaymentProvider) => {
  paymentProvider = provider;
};

export class SubscriptionService {
  async createCheckout(input: {
    userId: string;
    type: SubscriptionKind;
    plan: SubscriptionPlan;
    storeId?: string;
  }) {
    if (!paymentProvider) {
      throw new ApiError(503, "Subscription payment provider is not configured");
    }

    if (input.type === "store") {
      if (!input.storeId) throw new ApiError(400, "storeId is required for store subscriptions");
      const store = await subscriptionRepository.findOwnedStore(input.storeId, input.userId);
      if (!store) throw new ApiError(404, "Store not found or you do not own it");
    } else if (input.storeId) {
      throw new ApiError(400, "storeId is only valid for store subscriptions");
    }

    if (input.plan === "free") throw new ApiError(400, "Free plans do not require checkout");

    const pending = await subscriptionRepository.create({
      user: input.userId,
      type: input.type,
      store: input.type === "store" ? input.storeId! : null,
      plan: input.plan,
      status: "inactive",
    });
    if (!pending) throw new ApiError(500, "Could not create pending subscription");

    try {
      const session = await paymentProvider.createCheckoutSession({
        subscriptionId: pending._id,
        userId: input.userId,
        type: input.type,
        plan: input.plan,
        ...(input.storeId ? { storeId: input.storeId } : {}),
      });
      if (!/^https?:\/\//i.test(session.checkoutUrl)) {
        throw new Error("Payment provider returned an invalid checkout URL");
      }
      await subscriptionRepository.setGatewayReferences(pending._id, {
        gatewaySubscriptionId: session.gatewaySubscriptionId ?? null,
        gatewayCustomerId: session.gatewayCustomerId ?? null,
      });
      return { checkoutUrl: session.checkoutUrl, subscriptionId: pending._id };
    } catch (error) {
      await subscriptionRepository.deletePending(pending._id);
      throw error;
    }
  }

  async processPaymentEvent(event: {
    type: string;
    data?: { subscriptionId?: unknown; gatewaySubId?: unknown };
  }) {
    const id = Number(event.data?.subscriptionId);
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new ApiError(400, "Invalid subscriptionId in payment event");
    }

    if (event.type === "payment_success") {
      const gatewaySubId = event.data?.gatewaySubId;
      if (typeof gatewaySubId !== "string" || !gatewaySubId.trim()) {
        throw new ApiError(400, "gatewaySubId is required for payment_success");
      }
      await subscriptionRepository.activatePending(id, gatewaySubId.trim());
      return { received: true };
    }

    if (event.type === "payment_failed" || event.type === "subscription_cancelled") {
      await subscriptionRepository.cancel(id);
      return { received: true };
    }

    return { received: true, ignored: true };
  }
}

export const subscriptionService = new SubscriptionService();