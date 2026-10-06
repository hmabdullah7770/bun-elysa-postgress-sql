import { Client } from "@upstash/qstash";
import { flags } from "../../../config/flags";

let qstashClient: Client | null = null;

export const NOTIFICATION_QUEUE_NAMES = {
  FOLLOW: `${process.env.ROOT_URL ?? ""}/api/qstash/notifications/follow`,
  ORDER: `${process.env.ROOT_URL ?? ""}/api/qstash/notifications/order`,
  PAYMENT: `${process.env.ROOT_URL ?? ""}/api/qstash/notifications/payment`,
  POST: `${process.env.ROOT_URL ?? ""}/api/qstash/notifications/post`,
  PROFILEVISIT: `${process.env.ROOT_URL ?? ""}/api/qstash/notifications/profilevisit`,
  STORE: `${process.env.ROOT_URL ?? ""}/api/qstash/notifications/store`,
} as const;

const getQstashClient = () => {
  if (!flags.useQstashQueue) return null;
  if (qstashClient) return qstashClient;
  if (!process.env.QSTASH_TOKEN) throw new Error("QSTASH_TOKEN is required when QStash is enabled");
  qstashClient = new Client({
    token: process.env.QSTASH_TOKEN,
    ...(process.env.QSTASH_URL ? { baseUrl: process.env.QSTASH_URL } : {}),
    devMode: process.env.NODE_ENV === "development",
  });
  return qstashClient;
};

export const addQStashJob = async (
  queueUrl: string,
  type: string,
  data: Record<string, unknown>
) => {
  const client = getQstashClient();
  if (!client) {
    console.warn("QStash is disabled; notification job skipped");
    return;
  }
  if (!queueUrl.startsWith("http://") && !queueUrl.startsWith("https://")) {
    throw new Error("ROOT_URL must be an absolute URL when QStash is enabled");
  }
  await client.publishJSON({ url: queueUrl, body: { type, ...data }, retries: 5 });
};