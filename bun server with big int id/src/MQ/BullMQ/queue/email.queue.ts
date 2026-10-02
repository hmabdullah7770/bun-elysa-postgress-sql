import { Queue } from "bullmq";
import redis from "../../../db/redis";
import { flags } from "../../../config/flags";

export const EMAIL_QUEUE_NAMES = {
  AUTH: "emails-auth",
  PASSWORD: "emails-password",
  ORDER: "emails-order",
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

export const authEmailQueue = () => getQueue(EMAIL_QUEUE_NAMES.AUTH);
export const passwordEmailQueue = () => getQueue(EMAIL_QUEUE_NAMES.PASSWORD);
export const orderEmailQueue = () => getQueue(EMAIL_QUEUE_NAMES.ORDER);

export const addEmailJob = async (
  queueName: string,
  type: string,
  data: Record<string, unknown>
) => {
  const queue = getQueue(queueName);
  if (!queue) {
    console.warn(`Email job skipped; queue "${queueName}" is unavailable`);
    return;
  }
  await queue.add(type, data, {
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 200,
    removeOnFail: 1000,
  });
};