import { Worker, type Job } from "bullmq";
import redis from "../../../db/redis";
import { EMAIL_QUEUE_NAMES } from "../queue/email.queue";
import { processEmailJob } from "../../email.handlers";

const attachListeners = (worker: Worker) => {
  worker.on("completed", (job) => {
    console.log(`[${job.queueName}] Job ${job.id} (${job.name}) completed`);
  });
  worker.on("failed", (job, error) => {
    console.error(`[${job?.queueName}] Job ${job?.id} (${job?.name}) failed:`, error);
  });
  worker.on("error", (error) => console.error("Email worker error:", error));
};

let authEmailWorker: Worker | null = null;
let passwordEmailWorker: Worker | null = null;
let orderEmailWorker: Worker | null = null;

if (!redis) {
  console.warn("Redis unavailable; email workers are disabled");
} else {
  const createEmailWorker = (queueName: string) => {
    const worker = new Worker(
      queueName,
      async (job: Job) => processEmailJob(job.name, job.data),
      { connection: redis, concurrency: 5, limiter: { max: 100, duration: 60_000 } }
    );
    attachListeners(worker);
    return worker;
  };

  authEmailWorker = createEmailWorker(EMAIL_QUEUE_NAMES.AUTH);
  passwordEmailWorker = createEmailWorker(EMAIL_QUEUE_NAMES.PASSWORD);
  orderEmailWorker = createEmailWorker(EMAIL_QUEUE_NAMES.ORDER);
}

export { authEmailWorker, passwordEmailWorker, orderEmailWorker };