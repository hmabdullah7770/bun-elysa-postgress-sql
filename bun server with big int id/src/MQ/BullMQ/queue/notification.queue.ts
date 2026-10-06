import { Queue } from "bullmq";
import redis from "../../../db/redis";
import { flags } from "../../../config/flags";

export const QUEUE_NAMES = {
  FOLLOW: "notifications-follow",
  ORDER: "notifications-order",
  PAYMENT: "notifications-payment",
  POST: "notifications-post",
  PROFILEVISIT: "notifications-profilevisit",
  STORE: "notifications-store",
} as const;

const queues = new Map<string, Queue>();

const getQueue = (name: string): Queue | null => {
  if (!redis || flags.useQstashQueue) return null;
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, { connection: redis });
    queues.set(name, queue);
  }
  return queue;
};

export const followQueue = () => getQueue(QUEUE_NAMES.FOLLOW);
export const orderQueue = () => getQueue(QUEUE_NAMES.ORDER);
export const paymentQueue = () => getQueue(QUEUE_NAMES.PAYMENT);
export const postQueue = () => getQueue(QUEUE_NAMES.POST);
export const profilevisitQueue = () => getQueue(QUEUE_NAMES.PROFILEVISIT);
export const storeQueue = () => getQueue(QUEUE_NAMES.STORE);

export const addNotificationJob = async (
  queueName: string,
  type: string,
  data: Record<string, unknown>
) => {
  const queue = getQueue(queueName);
  if (!queue) {
    console.warn(`Notification job skipped; queue "${queueName}" is unavailable`);
    return;
  }
  await queue.add(type, data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
};