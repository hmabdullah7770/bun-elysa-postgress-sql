import { notificationService, createNotification } from "../services/notification.service";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const parseUuid = (value: unknown, label: string) => {
  if (typeof value !== "string" || !uuidPattern.test(value)) {
    throw new ApiError(400, `Invalid ${label} ID`);
  }
  return value;
};

const parsePositiveInt = (value: unknown, fallback: number, label: string) => {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new ApiError(400, `Invalid ${label}`);
  return parsed;
};

const parseNotificationIds = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ApiError(400, "notificationIds must be a non-empty array");
  }
  return value.map((id) => {
    const validString = typeof id === "string" && /^\d+$/.test(id);
    const validNumber = typeof id === "number" && Number.isSafeInteger(id);
    const parsed = Number(id);
    if ((!validString && !validNumber) || !Number.isSafeInteger(parsed) || parsed < 1) {
      throw new ApiError(400, `Invalid notification ID: ${String(id)}`);
    }
    return parsed;
  });
};

export const createNotificationApi = async ({ body }: any) => {
  const recipient = parseUuid(body.recipient, "recipient");
  const sender = body.sender ? parseUuid(body.sender, "sender") : null;
  const store = body.store ? parseUuid(body.store, "store") : null;
  if (body.metadata !== undefined && (!body.metadata || typeof body.metadata !== "object" || Array.isArray(body.metadata))) {
    throw new ApiError(400, "metadata must be an object");
  }
  const notification = await createNotification({
    recipient,
    sender,
    store,
    type: body.type,
    title: body.title,
    body: body.body,
    metadata: body.metadata,
  });
  return new ApiResponse(201, notification, "Notification created successfully");
};

export const getUserNotifications = async ({ query, userVerified }: any) => {
  const page = parsePositiveInt(query.page, 1, "page");
  const limit = Math.min(parsePositiveInt(query.limit, 20, "limit"), 100);
  const type = query.type && query.type !== "all" ? String(query.type).trim() : undefined;
  const data = await notificationService.getUserNotifications({
    recipient: userVerified._id,
    type,
    page,
    limit,
  });
  return new ApiResponse(200, data, "Notifications fetched successfully");
};

export const getUnreadCount = async ({ userVerified }: any) => {
  const data = await notificationService.getUnreadCount(userVerified._id);
  return new ApiResponse(200, data, "Unread count fetched successfully");
};

export const getNotificationCounts = async ({ userVerified }: any) => {
  const data = await notificationService.getCounts(userVerified._id);
  return new ApiResponse(200, data, "Notification counts fetched successfully");
};

export const markAsRead = async ({ body, userVerified }: any) => {
  const data = await notificationService.markAsRead(
    userVerified._id,
    parseNotificationIds(body.notificationIds)
  );
  return new ApiResponse(200, data, "Notifications marked as read");
};

export const markAllAsRead = async ({ userVerified }: any) => {
  await notificationService.markAllAsRead(userVerified._id);
  return new ApiResponse(200, {}, "All notifications marked as read");
};

export const markAllAsSeen = async ({ userVerified }: any) => {
  await notificationService.markAllAsSeen(userVerified._id);
  return new ApiResponse(200, {}, "All notifications marked as seen");
};

export const deleteNotification = async ({ body, userVerified }: any) => {
  const data = await notificationService.deleteNotifications(
    userVerified._id,
    parseNotificationIds(body.notificationIds)
  );
  return new ApiResponse(200, data, "Notifications deleted successfully");
};

export const clearAllNotifications = async ({ userVerified }: any) => {
  await notificationService.clearAllNotifications(userVerified._id);
  return new ApiResponse(200, {}, "All notifications cleared");
};

export const addNotificationType = async ({ body }: any) => {
  const notificationType = await notificationService.addNotificationType(body);
  return new ApiResponse(201, notificationType, "Notification type added successfully");
};

export const getNotificationTypes = async ({ query }: any) => {
  if (query.includeInactive !== undefined && !["true", "false"].includes(query.includeInactive)) {
    throw new ApiError(400, "includeInactive must be true or false");
  }
  const types = await notificationService.getNotificationTypes(query.includeInactive === "true");
  return new ApiResponse(200, types, "Notification types fetched successfully");
};

export const updateNotificationTypeStatus = async ({ params, body }: any) => {
  const id = parsePositiveInt(params.id, 0, "notification type ID");
  if (typeof body.isActive !== "boolean") throw new ApiError(400, "isActive must be a boolean value");
  const notificationType = await notificationService.updateNotificationTypeStatus(id, body.isActive);
  return new ApiResponse(
    200,
    notificationType,
    `Notification type ${body.isActive ? "activated" : "deactivated"} successfully`
  );
};