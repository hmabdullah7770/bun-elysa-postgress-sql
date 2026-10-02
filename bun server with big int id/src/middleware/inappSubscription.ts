import { Elysia } from "elysia";
import { ApiError } from "../utils/ApiError";

export type ActiveSubscription = { plan?: string } | null;
export type InAppSubscriptionLookup = (userId: string) => Promise<ActiveSubscription>;

export const createInAppSubscriptionMiddleware = (findActiveSubscription: InAppSubscriptionLookup) =>
  new Elysia({ name: "in-app-subscription" }).derive(async ({ userVerified }: any) => {
    if (!userVerified?._id) {
      throw new ApiError(401, "Unauthorized: User not authenticated");
    }
    const subscription = await findActiveSubscription(userVerified._id);
    return {
      inappSubscription: subscription,
      inappPlan: subscription?.plan ?? "free",
    };
  });