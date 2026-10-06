import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { createStore } from "../../schemas/store/createStore.schema";
import { storeNotificationSubscriptions } from "../../schemas/store/store_get_Notification.shema";
import { users } from "../../schemas/user.schema";

export class StoreNotificationRepository {
  async toggle(storeId: string, userId: string) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${storeId}), hashtext(${userId}))`);

      const existing = await tx
        .select({ _id: storeNotificationSubscriptions._id })
        .from(storeNotificationSubscriptions)
        .where(and(
          eq(storeNotificationSubscriptions.store, storeId),
          eq(storeNotificationSubscriptions.user, userId)
        ))
        .limit(1);

      let subscribed: boolean;
      if (existing[0]) {
        await tx
          .delete(storeNotificationSubscriptions)
          .where(eq(storeNotificationSubscriptions._id, existing[0]._id));
        subscribed = false;
      } else {
        await tx
          .insert(storeNotificationSubscriptions)
          .values({ store: storeId, user: userId })
          .onConflictDoNothing({
            target: [storeNotificationSubscriptions.store, storeNotificationSubscriptions.user],
          });
        subscribed = true;
      }

      const countRows = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(storeNotificationSubscriptions)
        .where(eq(storeNotificationSubscriptions.store, storeId));

      return { subscribed, totalSubscribers: Number(countRows[0]?.total ?? 0) };
    });
  }

  async findStore(storeId: string) {
    const rows = await db
      .select({ _id: createStore._id, ownerId: createStore.ownerId })
      .from(createStore)
      .where(eq(createStore._id, storeId))
      .limit(1);
    return rows[0] ?? null;
  }

  async listSubscribers(storeId: string) {
    return db
      .select({
        _id: users._id,
        username: users.username,
        email: users.email,
        avatar: users.avatar,
      })
      .from(storeNotificationSubscriptions)
      .innerJoin(users, eq(storeNotificationSubscriptions.user, users._id))
      .where(eq(storeNotificationSubscriptions.store, storeId))
      .orderBy(asc(users.username));
  }
}

export const storeNotificationRepository = new StoreNotificationRepository();