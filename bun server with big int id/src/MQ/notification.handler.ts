import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../schemas/user.schema";
import { getFirebaseMessaging } from "../config/firebase";

export type PushNotificationInput = {
  userId: string;
  title: string;
  body: string;
};

export const sendPushNotification = async ({ userId, title, body }: PushNotificationInput) => {
  const rows = await db
    .select({ fcmToken: users.fcmToken })
    .from(users)
    .where(eq(users._id, userId))
    .limit(1);
  const token = rows[0]?.fcmToken;
  if (!token) {
    console.warn(`No FCM token for user ${userId}; push notification skipped`);
    return;
  }

  const messaging = getFirebaseMessaging();
  if (!messaging) throw new Error("Firebase credentials are not configured");
  await messaging.send({ token, notification: { title, body } });
};