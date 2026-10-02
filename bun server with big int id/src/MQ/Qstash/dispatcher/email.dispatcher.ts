import { flags } from "../../../config/flags";
import {
  addEmailJob as addBullMQJob,
  EMAIL_QUEUE_NAMES as BULLMQ_QUEUE_NAMES,
} from "../../BullMQ/queue/email.queue";
import {
  addQStashJob,
  EMAIL_QUEUE_NAMES as QSTASH_QUEUE_NAMES,
} from "../publisher/email.publish";

export const EMAIL_QUEUE_NAMES = flags.useQstashQueue
  ? QSTASH_QUEUE_NAMES
  : BULLMQ_QUEUE_NAMES;

export const addEmailJob = async (
  queueRef: string,
  type: string,
  data: Record<string, unknown>
) => flags.useQstashQueue
  ? addQStashJob(queueRef, type, data)
  : addBullMQJob(queueRef, type, data);