import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../db";
import { notificationTypes, notifications } from "../schemas/notification.schema";
import { createStore } from "../schemas/store/createStore.schema";
import { users } from "../schemas/user.schema";

const senderUser = alias(users, "notification_sender");

export class NotificationRepository {
  async findUser(userId: string) {
    const rows = await db.select({ _id: users._id }).from(users).where(eq(users._id, userId)).limit(1);
    return rows[0] ?? null;
  }

  async findStore(storeId: string) {
    const rows = await db
      .select({ _id: createStore._id })
      .from(createStore)
      .where(eq(createStore._id, storeId))
      .limit(1);
    return rows[0] ?? null;
  }

  async create(values: typeof notifications.$inferInsert) {
    const rows = await db.insert(notifications).values(values).returning();
    return rows[0] ?? null;
  }

  async listForRecipient(params: {
    recipient: string;
    type?: string;
    page: number;
    limit: number;
  }) {
    const where = and(
      eq(notifications.recipient, params.recipient),
      ...(params.type ? [eq(notifications.type, params.type)] : [])
    );
    const [rows, countRows] = await Promise.all([
      db
        .select({
          notification: notifications,
          sender: {
            _id: senderUser._id,
            username: senderUser.username,
            fullName: senderUser.fullName,
            avatar: senderUser.avatar,
          },
          store: {
            _id: createStore._id,
            storeName: createStore.storeName,
            storeLogo: createStore.storeLogo,
          },
        })
        .from(notifications)
        .leftJoin(senderUser, eq(notifications.sender, senderUser._id))
        .leftJoin(createStore, eq(notifications.store, createStore._id))
        .where(where)
        .orderBy(desc(notifications.createdAt), desc(notifications._id))
        .limit(params.limit)
        .offset((params.page - 1) * params.limit),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(where),
    ]);
    return { rows, totalCount: Number(countRows[0]?.count ?? 0) };
  }

  async countUnread(recipient: string) {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.recipient, recipient), eq(notifications.isRead, false)));
    return Number(rows[0]?.count ?? 0);
  }

  async getCounts(recipient: string) {
    const rows = await db
      .select({
        unreadCount: sql<number>`count(*) filter (where ${notifications.isRead} = false)::int`,
        newCount: sql<number>`count(*) filter (where ${notifications.isSeen} = false)::int`,
      })
      .from(notifications)
      .where(eq(notifications.recipient, recipient));
    return {
      unreadCount: Number(rows[0]?.unreadCount ?? 0),
      newCount: Number(rows[0]?.newCount ?? 0),
    };
  }

  async markIdsRead(recipient: string, ids: number[]) {
    const matchingRows = await db
      .select({ _id: notifications._id })
      .from(notifications)
      .where(and(eq(notifications.recipient, recipient), inArray(notifications._id, ids)));
    if (matchingRows.length === 0) {
      return { matchedCount: 0, modifiedCount: 0 };
    }

    const updatedRows = await db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(
        and(
          eq(notifications.recipient, recipient),
          inArray(notifications._id, ids),
          eq(notifications.isRead, false)
        )
      )
      .returning({ _id: notifications._id });
    return {
      matchedCount: matchingRows.length,
      modifiedCount: updatedRows.length,
    };
  }

  async markAllRead(recipient: string) {
    await db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(and(eq(notifications.recipient, recipient), eq(notifications.isRead, false)));
  }

  async markAllSeen(recipient: string) {
    await db
      .update(notifications)
      .set({ isSeen: true, updatedAt: new Date() })
      .where(and(eq(notifications.recipient, recipient), eq(notifications.isSeen, false)));
  }

  async deleteIds(recipient: string, ids: number[]) {
    return db
      .delete(notifications)
      .where(and(eq(notifications.recipient, recipient), inArray(notifications._id, ids)))
      .returning({ _id: notifications._id });
  }

  async deleteAll(recipient: string) {
    await db.delete(notifications).where(eq(notifications.recipient, recipient));
  }

  async addType(values: typeof notificationTypes.$inferInsert) {
    const rows = await db
      .insert(notificationTypes)
      .values(values)
      .onConflictDoNothing({ target: notificationTypes.type })
      .returning();
    return rows[0] ?? null;
  }

  async listTypes(includeInactive: boolean) {
    return db
      .select()
      .from(notificationTypes)
      .where(includeInactive ? undefined : eq(notificationTypes.isActive, true))
      .orderBy(asc(notificationTypes.createdAt));
  }

  async updateTypeStatus(id: number, isActive: boolean) {
    const rows = await db
      .update(notificationTypes)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(notificationTypes._id, id))
      .returning();
    return rows[0] ?? null;
  }
}

export const notificationRepository = new NotificationRepository();