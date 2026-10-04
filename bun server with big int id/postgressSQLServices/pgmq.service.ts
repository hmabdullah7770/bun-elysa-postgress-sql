import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { flags } from "../flags";

const assertPgmqEnabled = () => {
  if (!flags.postgresBackends.usePgmqQueue) {
    throw new Error("PostgreSQL pgmq queue backend is disabled");
  }
};

const validateQueueName = (queueName: string) => {
  if (!queueName.trim()) throw new Error("Queue name is required");
  return queueName.trim();
};

const validatePositiveInteger = (value: number, name: string, allowZero = false) => {
  const minimum = allowZero ? 0 : 1;
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`${name} must be an integer greater than or equal to ${minimum}`);
  }
};

export const createPgmqQueue = async (queueName: string) => {
  assertPgmqEnabled();
  return db.execute(sql`SELECT pgmq.create(${validateQueueName(queueName)})`);
};

export const sendPgmqMessage = async <T>(
  queueName: string,
  message: T,
  delaySeconds = 0,
) => {
  assertPgmqEnabled();
  validatePositiveInteger(delaySeconds, "Delay", true);
  const serializedMessage = JSON.stringify(message);
  if (serializedMessage === undefined) {
    throw new Error("Message must be JSON-serializable");
  }

  return db.execute(sql`
    SELECT pgmq.send(
      ${validateQueueName(queueName)},
      ${serializedMessage}::jsonb,
      ${delaySeconds}
    ) AS message_id
  `);
};

export const readPgmqMessages = async (
  queueName: string,
  options: { visibilityTimeoutSeconds?: number; quantity?: number } = {},
) => {
  assertPgmqEnabled();
  const visibilityTimeoutSeconds = options.visibilityTimeoutSeconds ?? 30;
  const quantity = options.quantity ?? 1;
  validatePositiveInteger(visibilityTimeoutSeconds, "Visibility timeout");
  validatePositiveInteger(quantity, "Quantity");

  return db.execute(sql`
    SELECT *
    FROM pgmq.read(
      ${validateQueueName(queueName)},
      ${visibilityTimeoutSeconds},
      ${quantity}
    )
  `);
};

const validateMessageId = (messageId: string | bigint) => {
  const value = String(messageId);
  if (!/^[0-9]+$/.test(value)) throw new Error("Message ID must be a positive integer");
  return value;
};

export const deletePgmqMessage = async (
  queueName: string,
  messageId: string | bigint,
) => {
  assertPgmqEnabled();
  return db.execute(sql`
    SELECT pgmq.delete(
      ${validateQueueName(queueName)},
      ${validateMessageId(messageId)}::bigint
    ) AS deleted
  `);
};

export const archivePgmqMessage = async (
  queueName: string,
  messageId: string | bigint,
) => {
  assertPgmqEnabled();
  return db.execute(sql`
    SELECT pgmq.archive(
      ${validateQueueName(queueName)},
      ${validateMessageId(messageId)}::bigint
    ) AS archived
  `);
};
