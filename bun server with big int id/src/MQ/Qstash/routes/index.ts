import { Elysia } from "elysia";
import { flags } from "../../../config/flags";
import { processEmailJob } from "../../email.handlers";
import { sendPushNotification, type PushNotificationInput } from "../../notification.handler";
import { getVerifiedQstashBody } from "../verify";

type QstashJob = { type?: unknown; [key: string]: unknown };

const readJob = async (request: Request, set: { status?: number }): Promise<QstashJob | null> => {
  const rawBody = await getVerifiedQstashBody(request);
  if (rawBody === null) {
    set.status = 401;
    return null;
  }
  try {
    const job: unknown = JSON.parse(rawBody);
    if (!job || typeof job !== "object" || Array.isArray(job)) throw new Error("invalid payload");
    return job as QstashJob;
  } catch {
    set.status = 400;
    return null;
  }
};

const emailHandler = (expectedTypes: string[]) => async ({ request, set }: any) => {
  const job = await readJob(request, set);
  if (!job) return { message: "Invalid QStash request" };
  if (typeof job.type !== "string") {
    set.status = 400;
    return { message: "Job type is required" };
  }
  if (!expectedTypes.includes(job.type)) {
    console.warn(`Unknown QStash email job type: ${job.type}`);
    return { status: "ignored" };
  }
  const { type, ...data } = job;
  await processEmailJob(type, data as any);
  return { status: "ok" };
};

const notificationHandler = async ({ request, set }: any) => {
  const job = await readJob(request, set);
  if (!job) return { message: "Invalid QStash request" };
  const { type: _type, ...data } = job;
  if (
    typeof data.userId !== "string" ||
    typeof data.title !== "string" ||
    typeof data.body !== "string"
  ) {
    set.status = 400;
    return { message: "Notification job requires userId, title, and body" };
  }
  await sendPushNotification(data as PushNotificationInput);
  return { status: "ok" };
};

const qstashRoutes = new Elysia({ prefix: "/api/qstash" })
  .post("/emails/auth", emailHandler(["verify-email", "welcome-email", "resend-otp"]), { parse: "none" })
  .post("/emails/password", emailHandler(["forget-password", "password-reset-success", "password-changed"]), { parse: "none" })
  .post("/emails/order", emailHandler(["order-confirmation"]), { parse: "none" })
  .post("/notifications/follow", notificationHandler, { parse: "none" })
  .post("/notifications/order", notificationHandler, { parse: "none" })
  .post("/notifications/payment", notificationHandler, { parse: "none" })
  .post("/notifications/post", notificationHandler, { parse: "none" })
  .post("/notifications/profilevisit", notificationHandler, { parse: "none" })
  .post("/notifications/store", notificationHandler, { parse: "none" });

export default flags.useQstashQueue ? qstashRoutes : new Elysia();