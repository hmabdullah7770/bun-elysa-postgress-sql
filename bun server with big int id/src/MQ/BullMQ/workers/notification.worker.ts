import { Worker, type Job } from "bullmq";
import redis from "../../../db/redis";
import { flags } from "../../../config/flags";
import { QUEUE_NAMES } from "../queue/notification.queue";
import { sendPushNotification, type PushNotificationInput } from "../../notification.handler";

const attachListeners = (worker: Worker) => {
  worker.on("completed", (job) => {
    console.log(`[${job.queueName}] Job ${job.id} (${job.name}) completed`);
  });
  worker.on("failed", (job, error) => {
    console.error(`[${job?.queueName}] Job ${job?.id} (${job?.name}) failed:`, error);
  });
  worker.on("error", (error) => console.error("Notification worker error:", error));
};

const processNotificationJob = async (job: Job) => {
  const supportedTypes: Record<string, string[]> = {
    [QUEUE_NAMES.FOLLOW]: ["new-follower", "unfollowed"],
    [QUEUE_NAMES.ORDER]: ["order-placed"],
    [QUEUE_NAMES.PAYMENT]: ["payment-done"],
    [QUEUE_NAMES.POST]: ["post-published"],
    [QUEUE_NAMES.PROFILEVISIT]: ["profilevisit"],
  };
  if (!supportedTypes[job.queueName]?.includes(job.name)) {
    console.warn(`Unknown notification job "${job.name}" on ${job.queueName}`);
    return;
  }
  const data = job.data as PushNotificationInput;
  if (!data?.userId || !data.title || !data.body) {
    throw new Error(`Notification job "${job.name}" is missing userId, title, or body`);
  }
  await sendPushNotification(data);
};

const workers: Worker[] = [];
if (!redis || flags.useQstashQueue) {
  console.warn("BullMQ notification workers are disabled");
} else {
  for (const queueName of Object.values(QUEUE_NAMES)) {
    const worker = new Worker(queueName, processNotificationJob, {
      connection: redis,
      concurrency: queueName === QUEUE_NAMES.FOLLOW ? 10 : 5,
    });
    attachListeners(worker);
    workers.push(worker);
  }
}

export { workers as notificationWorkers };