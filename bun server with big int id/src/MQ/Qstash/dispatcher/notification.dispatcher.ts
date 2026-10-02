import { flags } from "../../../config/flags";
import {
  addNotificationJob as addBullMQJob,
  QUEUE_NAMES as BULLMQ_NAMES,
} from "../../BullMQ/queue/notification.queue";
import {
  addQStashJob,
  NOTIFICATION_QUEUE_NAMES as QSTASH_NAMES,
} from "../publisher/notification.publish";

export const QUEUE_NAMES = flags.useQstashQueue ? QSTASH_NAMES : BULLMQ_NAMES;

export const addNotificationJob = async (
  queueRef: string,
  type: string,
  data: Record<string, unknown>
) => flags.useQstashQueue
  ? addQStashJob(queueRef, type, data)
  : addBullMQJob(queueRef, type, data);