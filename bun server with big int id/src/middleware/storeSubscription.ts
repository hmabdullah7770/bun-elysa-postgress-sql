import { Elysia } from "elysia";
import { ApiError } from "../utils/ApiError";
import type { ActiveSubscription } from "./inappSubscription";

export type StoreSubscriptionLookup = (storeId: string) => Promise<ActiveSubscription>;

export const createStoreSubscriptionMiddleware = (findActiveSubscription: StoreSubscriptionLookup) =>
  new Elysia({ name: "store-subscription" }).derive(
    async ({ store }: any) => {
      if (!store) {
        throw new ApiError(400, "Store not found on request - run verifyStoreOwner first");
      }
      const subscription = await findActiveSubscription(store._id);
      return {
        storeSubscription: subscription,
        storePlan: subscription?.plan ?? "free",
      };
    }
  );