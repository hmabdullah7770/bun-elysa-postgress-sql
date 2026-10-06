import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "../db";
import { createStore } from "../schemas/store/createStore.schema";
import { subscriptions, type NewSubscription } from "../schemas/subscription.schema";

export class SubscriptionRepository {
  async create(data: NewSubscription) {
    const rows = await db.insert(subscriptions).values(data).returning();
    return rows[0] ?? null;
  }

  async findOwnedStore(storeId: string, userId: string) {
    const rows = await db
      .select({ _id: createStore._id })
      .from(createStore)
      .where(and(eq(createStore._id, storeId), eq(createStore.ownerId, userId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async setGatewayReferences(id: number, values: {
    gatewaySubscriptionId?: string | null;
    gatewayCustomerId?: string | null;
  }) {
    const rows = await db
      .update(subscriptions)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(subscriptions._id, id))
      .returning();
    return rows[0] ?? null;
  }

  async deletePending(id: number) {
    await db
      .delete(subscriptions)
      .where(and(eq(subscriptions._id, id), eq(subscriptions.status, "inactive")));
  }

  async activatePending(id: number, gatewaySubscriptionId: string) {
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    const rows = await db
      .update(subscriptions)
      .set({
        status: "active",
        startedAt,
        expiresAt,
        gatewaySubscriptionId,
        updatedAt: startedAt,
      })
      .where(and(eq(subscriptions._id, id), eq(subscriptions.status, "inactive")))
      .returning();
    return rows[0] ?? null;
  }

  async cancel(id: number) {
    const rows = await db
      .update(subscriptions)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(subscriptions._id, id))
      .returning({ _id: subscriptions._id });
    return rows[0] ?? null;
  }

  async findActiveInApp(userId: string) {
    const now = new Date();
    const rows = await db
      .select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.type, "inapp"),
        eq(subscriptions.user, userId),
        eq(subscriptions.status, "active"),
        or(isNull(subscriptions.expiresAt), gt(subscriptions.expiresAt, now))
      ))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }

  async findActiveForStore(storeId: string) {
    const now = new Date();
    const rows = await db
      .select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.type, "store"),
        eq(subscriptions.store, storeId),
        eq(subscriptions.status, "active"),
        or(isNull(subscriptions.expiresAt), gt(subscriptions.expiresAt, now))
      ))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }
}

export const subscriptionRepository = new SubscriptionRepository();